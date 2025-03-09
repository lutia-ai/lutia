import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { Message, Model, Image, ChatGPTImage, GptTokenUsage } from '$lib/types.d';
import { calculateGptVisionPricing, countTokens } from '$lib/tokenizer';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import { retrieveUsersBalance, updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { ApiModel, PaymentTier, type Message as MessageEntity, type User } from '@prisma/client';
import { createMessage } from '$lib/db/crud/message';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import {
	createConversation,
	updateConversation,
	updateConversationLastMessage
} from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';

export async function POST({ request, locals }) {
	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		throw error(401, 'Forbidden');
	}

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr, conversationId } =
			await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);

		const model: Model = JSON.parse(modelStr);

		let messages: Message[] = JSON.parse(promptStr);

		const images: Image[] = JSON.parse(imagesStr);

		let gptImages: ChatGPTImage[] = [];

		const user: User = await retrieveUserByEmail(session.user!.email);

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

		const openai = new OpenAI({
			apiKey: env.SECRET_DEEPSEEK_API_KEY,
			baseURL: 'https://api.deepseek.com'
		});

		if (user.payment_tier === PaymentTier.PayAsYouGo) {
			const inputGPTCount = await countTokens(messages, model, 'input');
			let imageCost = 0;
			let imageTokens = 0;
			for (const image of images) {
				const result = calculateGptVisionPricing(image.width, image.height);
				imageCost += result.price;
				imageTokens += result.tokens;
			}

			const inputCost = inputGPTCount.price + imageCost;
			let balance = await retrieveUsersBalance(Number(session.user.id));
			if (balance - inputCost <= 0.1) {
				throw new InsufficientBalanceError();
			}
		}

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

		const stream = await openai.chat.completions.create({
			model: model.param,
			// @ts-ignore
			messages: messages,
			stream: true,
			stream_options: {
				include_usage: true
			}
		});

		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		let finalUsage: GptTokenUsage | null = {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0
		};
		let error: any;
		let isFirstChunk = true;
		let messageConversationId = conversationId;

		// TODO: Add price calculation if chunk.usage not found (ie if there was an error before response)
		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content || '';
						// @ts-ignore
						const reasoningContent = chunk.choices[0].delta.reasoning_content || '';

						if (isFirstChunk) {
							// Create conversation for premium users if needed
							if (
								user.payment_tier === PaymentTier.Premium &&
								!messageConversationId
							) {
								const conversation = await createConversation(user.id, 'New chat');
								messageConversationId = conversation.id;
							}

							// Send conversation ID back to client
							controller.enqueue(
								new TextEncoder().encode(
									JSON.stringify({
										type: 'conversation_id',
										id: messageConversationId
									}) + '\n'
								)
							);
						}

						if (chunk.usage) {
							finalUsage.prompt_tokens = chunk.usage.prompt_tokens;
							finalUsage.completion_tokens = chunk.usage.completion_tokens;
							finalUsage.total_tokens = chunk.usage.total_tokens;
							const inputTokens = finalUsage.prompt_tokens;
							const outputTokens = finalUsage.completion_tokens;
							// Calculate prices based on actual token usage
							const inputPrice = (inputTokens * model.input_price) / 1000000;
							const outputPrice = (outputTokens * model.output_price) / 1000000;
							controller.enqueue(
								new TextEncoder().encode(
									JSON.stringify({
										type: 'usage',
										usage: {
											inputPrice,
											outputPrice
										}
									}) + '\n'
								)
							);
						}
						if (reasoningContent) {
							thinkingChunks.push(reasoningContent);
							controller.enqueue(
								new TextEncoder().encode(
									JSON.stringify({
										type: 'reasoning',
										content: reasoningContent
									}) + '\n'
								)
							);
						}
						if (content) {
							chunks.push(content);
							controller.enqueue(
								new TextEncoder().encode(
									JSON.stringify({
										type: 'text',
										content: content
									}) + '\n'
								)
							);
						}
					}
				} catch (err) {
					console.error('Error in stream processing: ', err);
					error = err;
				} finally {
					if (chunks.length > 0) {
						const thinkingResponse = thinkingChunks.join('');
						const response = chunks.join('');

						const inputTokens = finalUsage.prompt_tokens;
						const outputTokens = finalUsage.completion_tokens;
						// Calculate prices based on actual token usage
						const inputPrice = (inputTokens * model.input_price) / 1000000;
						const outputPrice = (outputTokens * model.output_price) / 1000000;

						const totalCost = inputPrice + outputPrice;

						const message: MessageEntity = await createMessage(
							plainText,
							response,
							images,
							thinkingResponse
							// need to add previous message ids
						);

						if (user.payment_tier === PaymentTier.PayAsYouGo) {
							await updateUserBalanceWithDeduction(user.id, totalCost);
						}

						if (user.payment_tier === PaymentTier.Premium && !conversationId) {
							// Generate a title for the new conversation
							try {
								const title = await generateConversationTitle(plainText);
								await updateConversation(messageConversationId, { title });
							} catch (titleError) {
								console.error('Error generating conversation title:', titleError);
								// Continue even if title generation fails
							}
						}

						await createApiRequestEntry(
							Number(session.user!.id!),
							'deepSeek',
							model.name,
							inputTokens,
							inputPrice,
							outputTokens,
							outputPrice,
							totalCost,
							message,
							messageConversationId
						);

						// Update the conversation's last_message timestamp
						if (messageConversationId) {
							await updateConversationLastMessage(messageConversationId);
						}
					}
					if (error) {
						const errorMessage = JSON.stringify({
							error: error.error.error.message || 'An unknown error occurred'
						});
						controller.enqueue(new TextEncoder().encode(errorMessage));
					}
					controller.close();
				}
			}
		});

		return new Response(readableStream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
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
