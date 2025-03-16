import { error } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message, Model, Image, GeminiImage, GptTokenUsage } from '$lib/types.d';
import { createApiRequestEntry, createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import {
	ApiProvider,
	ApiRequestStatus,
	PaymentTier,
	type Message as MessageEntity,
	type User
} from '@prisma/client';
import { createMessage } from '$lib/db/crud/message';
import { retrieveUsersBalance, updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import {
	createConversation,
	updateConversation,
	updateConversationLastMessage
} from '$lib/db/crud/conversation.js';
import { generateConversationTitle } from '$lib/utils/titleGenerator.js';

export async function POST({ request, locals }) {
	const requestId = crypto.randomUUID();

	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		throw error(401, 'Forbidden');
	}

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr, conversationId } =
			await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);
		let messages: Message[] = JSON.parse(promptStr);
		const model: Model = JSON.parse(modelStr);
		const images: Image[] = JSON.parse(imagesStr);
		let geminiImage: GeminiImage | undefined = undefined;
		const user: User = await retrieveUserByEmail(session.user!.email);
		let messageConversationId = conversationId;
		let error: any;

		// Iterate through the messages array and remove empty assistant messages
		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (
				msg.role === 'assistant' &&
				(msg.content === undefined || msg.content === null || msg.content === '')
			) {
				// Remove empty assistant messages
				messages.splice(i, 1);
			}
		}

		const prompt = {
			contents: messages.map((message) => ({
				role: message.role === 'user' ? message.role : 'model',
				parts: [{ text: message.content }]
			}))
		};

		if (images.length > 0) {
			geminiImage = {
				inlineData: {
					data: images[0].data.split(',')[1],
					mimeType: images[0].media_type
				}
			};
		}

		const genAI = new GoogleGenerativeAI(env.VITE_GOOGLE_GEMINI_API_KEY);
		const genAIModel = genAI.getGenerativeModel({ model: model.param });

		let inputCountResult: { totalTokens: number };
		let inputCost: number = 0;

		if (geminiImage) {
			inputCountResult = await genAIModel.countTokens([JSON.stringify(prompt), geminiImage]);
			inputCost = (inputCountResult.totalTokens / 1000000) * model.input_price;
		} else {
			// @ts-ignore
			inputCountResult = await genAIModel.countTokens(prompt);
			inputCost = (inputCountResult.totalTokens / 1000000) * model.input_price;
		}

		// Create a new conversation only if:
		// 1. User is premium AND
		// 2. No existing conversationId was provided
		if (user.payment_tier === PaymentTier.Premium && !messageConversationId) {
			const conversation = await createConversation(user.id, 'New chat');
			messageConversationId = conversation.id;
		}

		if (user.payment_tier === PaymentTier.PayAsYouGo) {
			try {
				let balance = await retrieveUsersBalance(Number(session.user.id));
				if (balance - inputCost <= 0.1) {
					throw new InsufficientBalanceError();
				}
			} catch (err) {
				console.error('Error retrieving users balance');
				throw err;
			}
		}

		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		let finalUsage: GptTokenUsage | null = {
			prompt_tokens: inputCountResult.totalTokens,
			completion_tokens: 0,
			total_tokens: 0
		};
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

		// Function to handle processing the complete response
		const finalizeResponse = async (wasAborted = false) => {
			try {
				const thinkingResponse = thinkingChunks.join('');
				const response = chunks.join('');

				// Calculate tokens and costs
				const inputTokens = finalUsage.prompt_tokens;
				let outputTokens = finalUsage.completion_tokens;

				if (wasAborted && response.length > 0) {
					inputCountResult = await genAIModel.countTokens(response);
					outputTokens = inputCountResult.totalTokens;
				}

				const inputCost = (inputTokens * model.input_price) / 1000000;
				const outputCost = (outputTokens * model.output_price) / 1000000;
				const totalCost = inputCost + outputCost;

				// Apply charges
				if (user.payment_tier === PaymentTier.PayAsYouGo) {
					await updateUserBalanceWithDeduction(user.id, totalCost);
				}

				// Determine status
				const status = wasAborted
					? ApiRequestStatus.ABORTED
					: error
						? ApiRequestStatus.FAILED
						: ApiRequestStatus.COMPLETED;

				// Create database records
				const { message, apiRequest } = await createMessageAndApiRequestEntry(
					{
						prompt: plainText,
						response: response,
						pictures: images,
						reasoning: thinkingResponse,
						referencedMessageIds: []
					},
					{
						userId: user.id,
						apiProvider: ApiProvider.google,
						apiModel: model.name,
						inputTokens: inputTokens,
						inputCost: inputCost,
						outputTokens: outputTokens,
						outputCost: outputCost,
						totalCost: totalCost,
						requestId: requestId,
						status: status,
						conversationId: messageConversationId,
						error: error
					}
				);

				// Only update conversation if we got a response
				if (response.length > 0 && messageConversationId) {
					await updateConversationLastMessage(messageConversationId);

					// Generate title for new conversations
					if (user.payment_tier === PaymentTier.Premium && !conversationId) {
						try {
							const title = await generateConversationTitle(plainText);
							await updateConversation(messageConversationId, { title });
						} catch (titleError) {
							console.error('Error generating conversation title:', titleError);
						}
					}
				}

				console.log('API Request created:', apiRequest);
			} catch (err) {
				console.error('Error in finalizeResponse:', err);
			}
		};

		// Create a special controller we can use to track abort state
		const abortController = new AbortController();
		const { signal: abortSignal } = abortController;

		// Track if the client has disconnected
		let clientDisconnected = false;

		request.signal.addEventListener('abort', () => {
			console.log('Client disconnected prematurely');
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

						const content = (chunk as any).candidates[0].content.parts[0].text;

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
								console.log('Client already disconnected (first chunk)');
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
								console.log('Client already disconnected (content)');
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
						console.log('Client already disconnected (chunk.usage)');
						clientDisconnected = true;
					}
				} catch (err) {
					error = err;
					console.error(error);
					try {
						controller.enqueue(
							textEncoder.encode(
								JSON.stringify({
									type: 'error',
									message:
										error?.error?.error?.message ||
										error?.message ||
										'Unknown error occurred'
								}) + '\n'
							)
						);
					} catch (controllerError) {
						console.log('Failed to send error: client disconnected');
						clientDisconnected = true;
					}
				} finally {
					await finalizeResponse(clientDisconnected);
					try {
						controller.close();
					} catch (closeError) {
						console.log('Controller already closed');
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
