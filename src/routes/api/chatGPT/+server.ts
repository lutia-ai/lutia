import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { Message, Model, Image, ChatGPTImage } from '$lib/types';
import { calculateGptVisionPricing, countTokens } from '$lib/tokenizer';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import {
	retrieveUsersBalance,
	updateUserBalanceWithDeduction
} from '$lib/db/crud/balance';
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

		const inputCost = inputGPTCount.price + imageCost;
		let balance = await retrieveUsersBalance(Number(session.user.id));
		if (balance - inputCost <= 0.1) {
			throw new InsufficientBalanceError();
		}

        const openai = new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });
		const stream = await openai.chat.completions.create({
			model: model.param,
			// @ts-ignore
			messages: messages,
			stream: true
		});

		const chunks: string[] = [];
		await updateUserBalanceWithDeduction(Number(session.user.id), inputCost);

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content || '';
						if (content) {
							chunks.push(content);
							controller.enqueue(new TextEncoder().encode(`${content}`));
						}
					}
					controller.close();

					const response = chunks.join('');
					const outputGPTCount = await countTokens(response, model, 'output');

					const message: MessageEntity = await createMessage(
						plainText,
						response,
						images
						// need to add previous message ids
					);

					await updateUserBalanceWithDeduction(
						Number(session.user!.id),
						outputGPTCount.price
					);

					await createApiRequestEntry(
						Number(session.user!.id!),
						'openAI',
						model.name,
						inputGPTCount.tokens + imageTokens,
						inputCost,
						outputGPTCount.tokens,
						outputGPTCount.price,
						inputCost + outputGPTCount.price,
						message
					);
				} catch (err) {
					console.error('Error in stream processing: ', err);
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
