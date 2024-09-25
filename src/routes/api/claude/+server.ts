import { error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import type { Message, Model, Image, ClaudeImage } from '$lib/types';
import { calculateClaudeImageCost, countTokens } from '$lib/tokenizer';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import { createMessage } from '$lib/db/crud/message';
import { retrieveUsersBalance, updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
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

		let claudeImages: ClaudeImage[] = [];

		const inputGPTCount = await countTokens(messages, model, 'input');

		if (images.length > 0) {
			const textObject = {
				type: 'text',
				text: messages[messages.length - 1].content
			};
			claudeImages = images.map((image) => ({
				type: 'image',
				source: {
					type: 'base64',
					media_type: image.media_type,
					data: image.data.split(',')[1]
				}
			}));
			messages[messages.length - 1].content = [textObject, ...claudeImages];
		}

		let imageCost = 0;
		let imageTokens = 0;
		for (const image of images) {
			const result = calculateClaudeImageCost(image.width, image.height, model);
			imageCost += result.price;
			imageTokens += result.tokens;
		}

		const inputCost = inputGPTCount.price + imageCost;
		let balance = await retrieveUsersBalance(Number(session.user.id));

		if (balance - inputCost <= 0.1) {
			throw new InsufficientBalanceError();
		}

		const client = new Anthropic({ apiKey: env.VITE_ANTHROPIC_API_KEY });
		const stream = await client.messages.stream({
			// @ts-ignore
			messages: messages,
			model: model.param,
			max_tokens: 4096
		});

		const chunks: string[] = [];
		await updateUserBalanceWithDeduction(Number(session.user.id), inputCost);
		let error: any;

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						if (
							chunk.type === 'content_block_start' ||
							chunk.type === 'content_block_delta'
						) {
							const content = (chunk as any).delta?.text || '';
							if (content) {
								chunks.push(content);
								controller.enqueue(new TextEncoder().encode(content));
							}
						} else if (chunk.type === 'message_stop') {
							break;
						}
					}
					controller.close();
				} catch (err) {
					error = err;
				} finally {
					if (chunks.length > 0) {
						const partialResponse = chunks.join('');
						const outputGPTCount = await countTokens(partialResponse, model, 'output');

						await updateUserBalanceWithDeduction(
							Number(session.user!.id),
							outputGPTCount.price
						);

						const message = await createMessage(plainText, partialResponse, images);

						await createApiRequestEntry(
							Number(session.user!.id),
							'anthropic',
							model.name,
							inputGPTCount.tokens + imageTokens,
							inputCost,
							outputGPTCount.tokens,
							outputGPTCount.price,
							inputCost + outputGPTCount.price,
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
