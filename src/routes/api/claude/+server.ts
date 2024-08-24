import { error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import type { Message, Model, Image, ClaudeImage } from '$lib/types';
import { calculateClaudeImageCost, countTokens } from '$lib/tokenizer';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import { Message as MessageEntity } from '$lib/db/entities/Message';
import { createMessage } from '$lib/db/crud/message';

const anthropicSecretKey =
	process.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;

const client = new Anthropic({ apiKey: anthropicSecretKey });

export async function POST({ request, locals }) {
	let session = await locals.auth();
	if (!session) {
		throw error(401, 'Forbidden');
	}

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr } = await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);
		const model: Model = JSON.parse(modelStr);
		const messages: Message[] = JSON.parse(promptStr);
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

		let outputTokens: number = 0;
		const chunks: string[] = [];

		const stream = await client.messages.stream({
			// @ts-ignore
			messages: messages,
			model: model.param,
			max_tokens: 1024
		});

		const readableStream = new ReadableStream({
			async start(controller) {
				for await (const chunk of stream) {
					if (
						chunk.type === 'content_block_start' ||
						chunk.type === 'content_block_delta'
					) {
						const content = (chunk as any).delta?.text || '';
						if (content) {
							outputTokens++;
							chunks.push(content);
							controller.enqueue(new TextEncoder().encode(content));
						}
					} else if (chunk.type === 'message_stop') {
						break;
					}
				}
				controller.close();

				const response = chunks.join('');
				const outputCost = (outputTokens / 1000000) * model.input_price;

				let imageCost = 0;
				let imageTokens = 0;
				for (const image of images) {
					const result = calculateClaudeImageCost(image.width, image.height, model);
					imageCost += result.price;
					imageTokens += result.tokens;
				}

				const message: MessageEntity = await createMessage(
					plainText,
					response,
					images
					// need to add previous message ids
				);

				await createApiRequestEntry(
					session.user!.email!,
					'anthropic',
					model.name,
					inputGPTCount.tokens + imageTokens,
					inputGPTCount.price + imageCost,
					outputTokens,
					outputCost,
					inputGPTCount.price + imageCost + outputCost,
					message
				);
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
		console.error('Error:', err);
		throw error(500, 'An error occurred while processing your request');
	}
}
