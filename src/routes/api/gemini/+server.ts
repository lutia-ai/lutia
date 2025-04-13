import { error } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
			ApiProvider.google
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
		let geminiImage: any;

		if (images.length > 0) {
			// For Gemini, we need to handle it differently since we'll pass the image separately
			if (images.length > 0) {
				const image = images[0]; // Only first image is supported in Gemini
				// Extract the base64 data from the data URL
				const base64Data = image.data.split(',')[1];
				geminiImage = {
					inlineData: {
						data: base64Data,
						mimeType: image.media_type
					}
				};
			}
		}

		if (files.length > 0) processedMessages = addFilesToMessage(processedMessages, files);

		// Convert messages to Gemini format
		const prompt = {
			contents: processedMessages.map((message) => ({
				role: message.role === 'user' ? message.role : 'model',
				parts: [{ text: message.content }]
			}))
		};

		const genAI = new GoogleGenerativeAI(env.VITE_GOOGLE_GEMINI_API_KEY);
		const genAIModel = genAI.getGenerativeModel({ model: model.param });

		let inputCountResult: { totalTokens: number };

		if (geminiImage) {
			inputCountResult = await genAIModel.countTokens([JSON.stringify(prompt), geminiImage]);
		} else {
			// @ts-ignore
			inputCountResult = await genAIModel.countTokens(prompt);
		}

		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		finalUsage.prompt_tokens = inputCountResult.totalTokens;
		let stream;
		let isFirstChunk = true;

		try {
			if (geminiImage) {
				stream = await genAIModel.generateContentStream([
					JSON.stringify(prompt),
					geminiImage
				]);
			} else {
				// @ts-ignore
				stream = await genAIModel.generateContentStream(prompt);
			}
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
			if (stream && typeof (stream as any).controller?.abort === 'function') {
				(stream as any).controller.abort();
			}
		});

		const textEncoder = new TextEncoder();

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream.stream) {
						if (clientDisconnected || abortSignal.aborted) {
							break;
						}

						// Check if the response has the expected structure
						const candidate = (chunk as any).candidates?.[0];
						const content = candidate?.content?.parts?.[0]?.text || '';

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

					const response = chunks.join('');
					const outputCountResult = await genAIModel.countTokens(response);
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
											(outputCountResult.totalTokens * model.output_price) /
											1000000
									}
								}) + '\n'
							)
						);
					} catch (err) {
						console.error('Client already disconnected (chunk.usage)');
						clientDisconnected = true;
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
								apiProvider: ApiProvider.google,
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
