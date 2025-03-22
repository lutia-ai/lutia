import { error } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message, Model, Image, GeminiImage, GptTokenUsage } from '$lib/types.d';
import {
	ApiModel,
	ApiProvider,
	PaymentTier,
	type Message as MessageEntity,
	type User
} from '@prisma/client';
import { retrieveUsersBalance } from '$lib/db/crud/balance';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { createConversation } from '$lib/db/crud/conversation.js';
import { isValidMessageArray } from '$lib/utils/typeGuards';
import { getModelFromName } from '$lib/utils/modelConverter';
import { finalizeResponse } from '$lib/utils/responseFinalizer';

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
		let rawMessages: Message[] = JSON.parse(promptStr);
		const modelName: ApiModel = JSON.parse(modelStr);
		const images: Image[] = JSON.parse(imagesStr);
		let geminiImage: GeminiImage | undefined = undefined;
		const user: User = await retrieveUserByEmail(session.user!.email);
		let messageConversationId = conversationId;
		let errorMessage: any;

		if (!isValidMessageArray(rawMessages)) {
			throw error(400, 'Invalid messages array');
		}

		let messages: Message[] = rawMessages;

		// Convert the model name to full Model object
		const model: Model | null = getModelFromName(modelName);

		if (!model) {
			// make sure model is not null
			throw error(400, `Model ${modelName} not found`);
		}

		if (!plainText || !messages) {
			throw error(400, `No prompt found`);
		}

		if (typeof plainText !== 'string') {
			throw error(400, 'plainText must be a string');
		}

		if (typeof modelName !== 'string') {
			throw error(400, 'modelStr must be a string');
		}

		if (!Array.isArray(rawMessages)) {
			throw error(400, 'promptStr must be an array of messages');
		}

		if (!Array.isArray(images)) {
			throw error(400, 'imagesStr must be an array of images');
		}

		if (conversationId !== undefined && typeof conversationId !== 'string') {
			throw error(400, 'conversationId must be a string if provided');
		}

        if (!user.email_verified) {
            throw error(400, 'Email not verified');
        }

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

		// Ensure first message has 'user' role by removing leading non-user messages
		while (messages.length > 0 && messages[0].role !== 'user') {
			messages.shift();
		}

		// If no user messages remain, throw error
		if (messages.length === 0) {
			throw error(400, 'No user messages found. The first message must use the user role.');
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
						console.log('Failed to send error: client disconnected');
						clientDisconnected = true;
					}
				} finally {
					try {
						await finalizeResponse({
							user,
							model,
							plainText,
							images,
							chunks,
							thinkingChunks,
							finalUsage,
							wasAborted: clientDisconnected,
							error: errorMessage,
							requestId,
							messageConversationId,
							originalConversationId: conversationId,
							apiProvider: ApiProvider.google
						});
					} catch (err) {
						console.error('Error in finalizeResponse:', err);
					}
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
