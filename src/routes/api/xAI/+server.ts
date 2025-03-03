import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { Message, Model, Image, ChatGPTImage } from '$lib/types.d';
import { calculateGptVisionPricing, countTokens } from '$lib/tokenizer';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import { retrieveUsersBalance, updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import type { Message as MessageEntity } from '@prisma/client';
import { createMessage } from '$lib/db/crud/message';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';

export async function POST({ request, locals }) {
	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		throw error(401, 'Forbidden');
	}

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr } = await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);

		const model: Model = JSON.parse(modelStr);

		let messages: Message[] = JSON.parse(promptStr);

		const images: Image[] = JSON.parse(imagesStr);

		let gptImages: ChatGPTImage[] = [];

		const openai = new OpenAI({
			apiKey: env.SECRET_XAI_API_KEY,
			baseURL: 'https://api.x.ai/v1'
		});

		const inputGPTCount = await countTokens(messages, model, 'input');

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

		// const inputCost = inputGPTCount.price + imageCost;
		let balance = await retrieveUsersBalance(Number(session.user.id));
		if (balance <= 0.1) {
			throw new InsufficientBalanceError();
		}

		const stream = await openai.chat.completions.create({
			model: model.param,
			// @ts-ignore
			messages: messages,
			stream: true
		});

		const chunks: string[] = [];
		let tokenUsage: any = null;
		let error: any;

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						if (chunk.usage) {
							tokenUsage = chunk.usage;
						}
						const content = chunk.choices[0]?.delta?.content || '';
						if (content) {
							chunks.push(content);
                            controller.enqueue(new TextEncoder().encode(
                                JSON.stringify({
                                    type: "text",
                                    content: content
                                }) + "\n"
                            ));
						}
					}
					controller.close();
				} catch (err) {
					console.error('Error in stream processing: ', err);
					error = err;
					// controller.enqueue(new TextEncoder().encode(errorMessage)); // see if this works
				} finally {
					if (chunks.length > 0) {
						const response = chunks.join('');

						const message: MessageEntity = await createMessage(
							plainText,
							response,
							images
							// need to add previous message ids
						);

						await updateUserBalanceWithDeduction(
							Number(session.user!.id),
							calculateTotalCost(tokenUsage, model)
						);

						await createApiRequestEntry(
							Number(session.user!.id!),
							'xAI',
							model.name,
							tokenUsage?.prompt_tokens || 0, // inputGPTCount.tokens + imageTokens
							calculateInputCost(tokenUsage?.prompt_tokens || 0, model), // inputCost
							tokenUsage?.completion_tokens || 0, // outputGPTCount.tokens
							calculateOutputCost(tokenUsage?.completion_tokens || 0, model), // outputGPTCount.price
							calculateTotalCost(tokenUsage, model), // Total cost, // inputCost + outputGPTCount.price
							message
						);
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

// Helper functions to calculate costs
function calculateInputCost(tokens: number, model: Model) {
	// Implement your pricing logic here
	return (tokens / 1000000) * model.input_price;
}

function calculateOutputCost(tokens: number, model: Model) {
	// Implement your pricing logic here
	return (tokens / 1000000) * model.output_price;
}

function calculateTotalCost(usage: any, model: Model) {
	if (!usage) return 0;
	const inputCost = calculateInputCost(usage.prompt_tokens, model);
	const outputCost = calculateOutputCost(usage.completion_tokens, model);
	return inputCost + outputCost;
}
