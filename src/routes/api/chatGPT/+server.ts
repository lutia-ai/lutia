import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { Model, ChatGPTImage } from '$lib/types/types';
import { createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import { updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { ApiModel, ApiProvider, ApiRequestStatus, PaymentTier, type User } from '@prisma/client';
import { InsufficientBalanceError } from '$lib/types/customErrors';
import { env } from '$env/dynamic/private';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { createConversation, updateConversationLastMessage } from '$lib/db/crud/conversation.js';
import { generateConversationTitle } from '$lib/utils/titleGenerator';
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

		// For regular text models, use the shared validator
		const validatedData = await validateApiRequest(
			requestBody as ApiRequestData,
			user,
			ApiProvider.openAI
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

		// Special handling for image generation models (DALL-E)
		if (model.generatesImages) {
			return handleImageGeneration(requestBody, user, model, requestId);
		}

		// Process images and files together with messages
		let processedMessages = [...messages];

		console.log('messageConversationId', messageConversationId);

		if (images.length > 0) {
			// Convert the last message content to GPT-4 Vision format
			if (typeof processedMessages[processedMessages.length - 1].content === 'string') {
				const textContent = processedMessages[processedMessages.length - 1]
					.content as string;
				const gptImages: ChatGPTImage[] = images.map((image) => ({
					type: 'image_url',
					image_url: {
						url: image.data,
						detail: model.name === ApiModel.GPT_4o ? 'high' : 'auto'
					}
				}));

				// Replace the string content with an array of content parts
				processedMessages[processedMessages.length - 1].content = [
					{ type: 'text', text: textContent },
					...gptImages
				];
			}
		}

		if (files.length > 0) processedMessages = addFilesToMessage(processedMessages, files);

		// Initialize the OpenAI client
		const openai = new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });

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
								apiProvider: ApiProvider.openAI,
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

/**
 * Handles image generation models like DALL-E
 */
async function handleImageGeneration(
	requestBody: any,
	user: User,
	model: Model,
	requestId: string
) {
	let messageConversationId = requestBody.conversationId;
	let errorMessage: any;

	// Parse plainText from the request
	const plainText: string = JSON.parse(requestBody.plainTextPrompt);
	const openai = new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });

	const response = await openai.images.generate({
		model: model.param,
		prompt: plainText,
		n: 1,
		size: '1024x1024',
		response_format: 'b64_json'
	});

	const base64Data = response.data[0].b64_json;

	if (user.payment_tier === PaymentTier.Premium && !messageConversationId) {
		try {
			// Generate a title for the new conversation
			const title = await generateConversationTitle(plainText);
			const conversation = await createConversation(user.id, title);
			messageConversationId = conversation.id;
		} catch (titleError) {
			console.error('Error generating conversation title:', titleError);
			// Continue even if title generation fails
		}
	}

	if (user.payment_tier === PaymentTier.PayAsYouGo) {
		await updateUserBalanceWithDeduction(user.id, 0.04);
	}

	const { message, apiRequest } = await createMessageAndApiRequestEntry(
		{
			prompt: plainText,
			response: '[AI generated image]',
			pictures: [
				{
					type: 'image',
					data: 'data:image/png;base64,' + base64Data,
					media_type: 'image/png',
					width: 1024,
					height: 1024,
					ai: true
				}
			],
			reasoning: '',
			referencedMessageIds: [],
			files: []
		},
		{
			userId: user.id,
			apiProvider: ApiProvider.openAI,
			apiModel: model.name,
			inputTokens: 0,
			inputCost: 0,
			outputTokens: 0,
			outputCost: 0.04,
			totalCost: 0.04,
			requestId: requestId,
			status: ApiRequestStatus.COMPLETED,
			conversationId: messageConversationId,
			error: errorMessage
		}
	);
	console.error('API Request created:', apiRequest);

	// Update the conversation's last_message timestamp
	if (messageConversationId) {
		await updateConversationLastMessage(messageConversationId);
	}

	// Include the base64 data in the response to the frontend
	return new Response(JSON.stringify({ image: base64Data, outputPrice: 0.04 }), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Request-Id': requestId
		}
	});
}
