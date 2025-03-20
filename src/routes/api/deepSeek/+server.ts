import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { Message, Model, Image, ChatGPTImage, GptTokenUsage } from '$lib/types.d';
import { calculateGptVisionPricing, countTokens } from '$lib/tokenizer';
import { retrieveUsersBalance } from '$lib/db/crud/balance';
import {
	ApiModel,
	ApiProvider,
	PaymentTier,
	type Message as MessageEntity,
	type User
} from '@prisma/client';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { createConversation } from '$lib/db/crud/conversation';
import { isValidMessageArray } from '$lib/utils/typeGuards';
import { getModelFromName } from '$lib/utils/modelConverter';
import { finalizeResponse } from '$lib/utils/responseFinalizer';
import { estimateTokenCount } from '$lib/utils/tokenCounter';

export async function POST({ request, locals }) {
	const requestId = crypto.randomUUID();

	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		throw error(401, 'Forbidden');
	}

	// Create a requestData object conditionally based on what might be defined
	const requestData: Record<string, any> = {};

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr, conversationId } =
			await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);
		const modelName: ApiModel = JSON.parse(modelStr);
		const rawMessages: Message[] = JSON.parse(promptStr);
		const images: Image[] = JSON.parse(imagesStr);
		let gptImages: ChatGPTImage[] = [];
		const openai = new OpenAI({
			apiKey: env.SECRET_DEEPSEEK_API_KEY,
			baseURL: 'https://api.deepseek.com'
		});
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

		// Filter out assistant messages with empty content (ie that are still streaming)
		messages = messages.map((msg) => {
			if (
				msg.role === 'assistant' &&
				(msg.content === undefined || msg.content === null || msg.content === '')
			) {
				return { ...msg, content: 'Streaming in progress...' };
			}
			return msg;
		});

		if (images.length > 0) {
			const textObject = {
				type: 'text',
				text: messages[messages.length - 1].content
			};
			gptImages = images.map((image) => ({
				type: 'image_url',
				image_url: {
					url: image.data
				}
			}));
			messages[messages.length - 1].content = [textObject, ...gptImages];
		}

		let imageCost = 0;
		let imageTokens = 0;

		for (const image of images) {
			const result = calculateGptVisionPricing(image.width, image.height);
			imageCost += result.price;
			imageTokens += result.tokens;
		}

		// const inputGPTCount = await countTokens(messages, model, 'input');
		// const estimatedInputTokens = inputGPTCount.tokens + imageTokens;
		// const estimatedInputCost = inputGPTCount.price + imageCost;

		const estimatedInputTokens = estimateTokenCount(messages.toString()) + imageTokens;
		const estimatedInputCost = (estimatedInputTokens * model.input_price) / 1000000 + imageCost;

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
				if (balance - estimatedInputCost <= 0.1) {
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
			prompt_tokens: estimatedInputTokens,
			completion_tokens: 0,
			total_tokens: 0
		};
		let isFirstChunk = true;
		let stream;

		try {
			stream = await openai.chat.completions.create({
				model: model.param,
				// @ts-ignore
				messages: messages,
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
			console.log('Client disconnected prematurely');
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
								console.log('Client already disconnected (first chunk)');
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
								console.log('Client already disconnected (chunk.usage)');
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
								console.log('Client already disconnected (reasoning content)');
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
							apiProvider: ApiProvider.deepSeek
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
