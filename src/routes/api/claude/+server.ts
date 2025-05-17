import { error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import type { ClaudeImage } from '$lib/types/types';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { InsufficientBalanceError } from '$lib/types/customErrors';
import { env } from '$env/dynamic/private';
import { ApiProvider } from '@prisma/client';
import { finalizeResponse, updateExistingMessageAndRequest } from '$lib/utils/responseFinalizer';
import { validateApiRequest, type ApiRequestData } from '$lib/utils/apiRequestValidator';
import { addFilesToMessage } from '$lib/utils/fileHandling';

export async function POST({ request, locals }) {
	const requestId = crypto.randomUUID();

	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		throw error(401, 'Forbidden');
	}

	try {
		// Parse the request body
		const requestBody = await request.json();
		const user = await retrieveUserByEmail(session.user!.email);
		const regenerateMessageId = requestBody.regenerateMessageId;
		let errorMessage: any;

		// Validate the request using our shared validator
		const validatedData = await validateApiRequest(
			requestBody as ApiRequestData,
			user,
			ApiProvider.anthropic
		);

		const {
			plainText,
			messages,
			model,
			images,
			files,
			messageConversationId,
			referencedMessageIds,
			finalUsage
		} = validatedData;

		// Process files and images
		let processedMessages = [...messages];
		let claudeImages: ClaudeImage[] = [];

		if (images.length > 0) {
			const textObject = {
				type: 'text',
				text: processedMessages[processedMessages.length - 1].content
			};
			claudeImages = images.map((image) => ({
				type: 'image',
				source: {
					type: 'base64',
					media_type: image.media_type,
					data: image.data.split(',')[1]
				}
			}));
			processedMessages[processedMessages.length - 1].content = [textObject, ...claudeImages];
		}

		if (files.length > 0) processedMessages = addFilesToMessage(processedMessages, files);

		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		let stream;

		const reasoningOn = requestBody.reasoningOn;
		const budget_tokens = 16000;
		const max_tokens =
			reasoningOn && model.reasons ? model.max_tokens! + budget_tokens : model.max_tokens!;

		try {
			// Clean messages by removing message_id fields
			const cleanedMessages = processedMessages.map(({ message_id, ...rest }) => rest);
			const client = new Anthropic({ apiKey: env.VITE_ANTHROPIC_API_KEY });
			stream = await client.messages.stream({
				// Include system parameter only if we have a system message
				...(processedMessages[0].role === 'system'
					? { system: processedMessages[0].content }
					: {}),
				// @ts-ignore
				messages: cleanedMessages,
				model: model.param,
				max_tokens: max_tokens,
				...(reasoningOn && model.reasons
					? {
							thinking: {
								type: 'enabled',
								budget_tokens
							}
						}
					: {})
			});
		} catch (err) {
			console.error('Error creating stream:', err);
			throw error(500, 'Error creating stream');
		}

		// Create a special controller we can use to track abort state
		const abortController = new AbortController();
		const { signal: abortSignal } = abortController;

		// Track if the client has disconnected
		let clientDisconnected = false;

		request.signal.addEventListener('abort', () => {
			console.error('Client disconnected prematurely');
			clientDisconnected = true;
			abortController.abort();

			// Close the Anthropic stream if possible
			if (stream && typeof stream.controller?.abort === 'function') {
				stream.controller.abort();
			}
		});

		const textEncoder = new TextEncoder();

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						if (clientDisconnected || abortSignal.aborted) {
							break;
						}
						if (chunk.type === 'message_start') {
							finalUsage.prompt_tokens = chunk.message.usage.input_tokens;

							try {
								controller.enqueue(
									textEncoder.encode(
										JSON.stringify({
											type: 'request_info',
											request_id: requestId,
											conversation_id: messageConversationId
										}) + '\n'
									)
								);
							} catch (err) {
								console.error('Client already disconnected (message_start)');
								clientDisconnected = true;
								break;
							}
						}
						if (chunk.type === 'message_delta') {
							finalUsage.completion_tokens = chunk.usage.output_tokens;
							finalUsage.total_tokens =
								finalUsage.prompt_tokens + finalUsage.completion_tokens;
							const outputTokens = finalUsage.completion_tokens;

							try {
								controller.enqueue(
									textEncoder.encode(
										JSON.stringify({
											type: 'usage',
											usage: {
												inputPrice:
													(finalUsage.prompt_tokens * model.input_price) /
													1000000,
												outputPrice:
													(outputTokens * model.output_price) / 1000000
											}
										}) + '\n'
									)
								);
							} catch (err) {
								console.error('Client already disconnected (message_delta)');
								clientDisconnected = true;
								break;
							}
						} else if (chunk.type === 'content_block_delta') {
							// @ts-ignore
							if (chunk.delta.type === 'thinking_delta') {
								try {
									const thinkingContent = (chunk as any).delta?.thinking || '';
									thinkingChunks.push(thinkingContent);
									controller.enqueue(
										textEncoder.encode(
											JSON.stringify({
												type: 'reasoning',
												content: thinkingContent
											}) + '\n'
										)
									);
								} catch (err) {
									console.error('Client already disconnected (thinking_delta)');
									clientDisconnected = true;
									break;
								}
							} else if (chunk.delta.type === 'text_delta') {
								const content = (chunk as any).delta?.text || '';
								if (content) {
									try {
										chunks.push(content);
										controller.enqueue(
											textEncoder.encode(
												JSON.stringify({
													type: 'text',
													content: content
												}) + '\n'
											)
										);
									} catch (err) {
										console.error('Client already disconnected (text_delta)');
										clientDisconnected = true;
										break;
									}
								}
							}
						} else if (chunk.type === 'message_stop') {
							break;
						}
					}
				} catch (err) {
					errorMessage = err;
					console.error(error);
					try {
						controller.enqueue(
							textEncoder.encode(
								JSON.stringify({
									type: 'error',
									message:
										errorMessage?.error?.error?.message ||
										errorMessage?.message ||
										'Unknown error occurred'
								}) + '\n'
							)
						);
					} catch (controllerError) {
						console.error('Failed to send error: client disconnected');
						clientDisconnected = true;
					}
				} finally {
					try {
						if (!regenerateMessageId) {
							const { message, apiRequest } = await finalizeResponse({
								user,
								model,
								plainText,
								images,
								files,
								chunks,
								thinkingChunks,
								finalUsage,
								wasAborted: clientDisconnected,
								error: errorMessage,
								requestId,
								messageConversationId,
								originalConversationId: requestBody.conversationId,
								apiProvider: ApiProvider.anthropic,
								referencedMessageIds
							});
							controller.enqueue(
								textEncoder.encode(
									JSON.stringify({
										type: 'message_id',
										message_id: message.id
									}) + '\n'
								)
							);
						} else {
							// New path for regenerating a response to an existing message
							const { message, apiRequest } = await updateExistingMessageAndRequest({
								messageId: regenerateMessageId,
								user,
								model,
								chunks,
								thinkingChunks,
								finalUsage,
								wasAborted: clientDisconnected,
								error: errorMessage,
								files
							});

							controller.enqueue(
								textEncoder.encode(
									JSON.stringify({
										type: 'message_id',
										message_id: message.id
									}) + '\n'
								)
							);
						}
					} catch (err) {
						console.error('Error in finalizeResponse:', err);
					}
					try {
						controller.close();
					} catch (closeError) {
						console.error('Controller already closed');
					}
				}
			}
		});

		return new Response(readableStream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Request-Id': requestId
			}
		});
	} catch (err) {
		console.error('Error:', err);
		if (err instanceof InsufficientBalanceError) {
			throw error(500, err.message);
		}
		throw error(500, 'An error occurred while processing your request');
	}
}
