import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import { ApiProvider } from '@prisma/client';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';
import { retrieveUserByEmail } from '$lib/db/crud/user';
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
			ApiProvider.deepSeek
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

		// Process images and files
		let processedMessages = [...messages];

		if (images.length > 0) {
			const textObject = {
				type: 'text',
				text: processedMessages[processedMessages.length - 1].content
			};
			const gptImages = images.map((image) => ({
				type: 'image_url',
				image_url: {
					url: image.data
				}
			}));
			processedMessages[processedMessages.length - 1].content = [textObject, ...gptImages];
		}

		if (files.length > 0) processedMessages = addFilesToMessage(processedMessages, files);

		// Initialize the DeepSeek client
		const openai = new OpenAI({
			apiKey: env.SECRET_DEEPSEEK_API_KEY,
			baseURL: 'https://api.deepseek.com'
		});

		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		let isFirstChunk = true;
		let stream;

		try {
			// Clean messages by removing message_id fields
			const cleanedMessages = processedMessages.map(({ message_id, ...rest }) => rest);
			stream = await openai.chat.completions.create({
				model: model.param,
				// @ts-ignore
				messages: cleanedMessages,
				stream: true,
				stream_options: {
					include_usage: true
				}
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

			// Close the stream if possible
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

						const content = chunk.choices[0]?.delta?.content || '';
						// @ts-ignore
						const reasoningContent = chunk.choices[0].delta.reasoning_content || '';

						if (isFirstChunk) {
							isFirstChunk = false;
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
								console.error('Client already disconnected (first chunk)');
								clientDisconnected = true;
								break;
							}
						}

						if (chunk.usage) {
							finalUsage.prompt_tokens = chunk.usage.prompt_tokens;
							finalUsage.completion_tokens = chunk.usage.completion_tokens;
							finalUsage.total_tokens = chunk.usage.total_tokens;
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
								console.error('Client already disconnected (chunk.usage)');
								clientDisconnected = true;
								break;
							}
						}
						if (reasoningContent) {
							try {
								thinkingChunks.push(reasoningContent);
								controller.enqueue(
									textEncoder.encode(
										JSON.stringify({
											type: 'reasoning',
											content: reasoningContent
										}) + '\n'
									)
								);
							} catch (err) {
								console.error('Client already disconnected (reasoning content)');
								clientDisconnected = true;
								break;
							}
						}
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
								console.error('Client already disconnected (content)');
								clientDisconnected = true;
								break;
							}
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
								apiProvider: ApiProvider.deepSeek,
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
		if (err instanceof InsufficientBalanceError) {
			throw error(500, err.message);
		}
		console.error('Error:', err);
		throw error(500, 'An error occurred while processing your request');
	}
}
