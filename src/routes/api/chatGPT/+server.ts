import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { Message, Model, Image, ChatGPTImage, GptTokenUsage } from '$lib/types.d';
import { calculateGptVisionPricing, countTokens } from '$lib/tokenizer';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import { retrieveUsersBalance, updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { ApiModel, type Message as MessageEntity } from '@prisma/client';
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

		const openai = new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });

        // Filter out assistant messages with empty content (ie that are still streaming)
        messages = messages.map(msg => {
            if (msg.role === 'assistant' && (msg.content === undefined || msg.content === null || msg.content === '')) {
                return { ...msg, content: 'Streaming in progress...' };
            }
            return msg;
        });

		if (model.generatesImages) {
			const response = await openai.images.generate({
				model: model.param,
				prompt: plainText,
				n: 1,
				size: '1024x1024',
				response_format: 'b64_json'
			});

			const base64Data = response.data[0].b64_json;

			const message: MessageEntity = await createMessage(plainText, '[AI generated image]', [
				{
					type: 'image',
					data: 'data:image/png;base64,' + base64Data,
					media_type: 'image/png',
					width: 1024,
					height: 1024,
					ai: true
				}
			]);

			await updateUserBalanceWithDeduction(Number(session.user!.id), 0.04);

			await createApiRequestEntry(
				Number(session.user!.id!),
				'openAI',
				model.name,
				0,
				0,
				0,
				0.04,
				0.04,
				message
			);

			// Include the base64 data in the response to the frontend
			return new Response(JSON.stringify({ image: base64Data }), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			});
		}

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

		// Add developer message at the start of messages array if the model is o1 or o3 mini
		if (
			model.name === ApiModel.GPT_o1 ||
			model.name === ApiModel.GPT_o3_mini
		) {
			messages.unshift({
				role: 'developer',
				content: 'Formatting re-enabled'
			});
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
		let finalUsage: GptTokenUsage | null = null;
		let error: any;

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						const content = chunk.choices[0]?.delta?.content || '';
						if (chunk.usage) {
							finalUsage = chunk.usage;
                            const inputTokens = finalUsage.prompt_tokens;
							const outputTokens = finalUsage.completion_tokens;
							// Calculate prices based on actual token usage
							const inputPrice = (inputTokens * model.input_price) / 1000000;
							const outputPrice = (outputTokens * model.output_price) / 1000000;
                            controller.enqueue(new TextEncoder().encode(
                                JSON.stringify({
                                    type: "usage",
                                    usage: {
                                        inputPrice,
                                        outputPrice
                                    }
                                }) + "\n"
                            ));
						}
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
				} finally {
					if (chunks.length > 0) {
						const response = chunks.join('');
						const outputGPTCount = await countTokens(response, model, 'output');

						let inputTokens = inputGPTCount.tokens + imageTokens;
						let outputTokens = outputGPTCount.tokens;
						let inputPrice = inputCost;
						let outputPrice = outputGPTCount.price;

						if (finalUsage) {
							inputTokens = finalUsage.prompt_tokens;
							outputTokens = finalUsage.completion_tokens;
							// Calculate prices based on actual token usage
							inputPrice = (inputTokens * model.input_price) / 1000000;
							outputPrice = (outputTokens * model.output_price) / 1000000;
						}

						const totalCost = inputPrice + outputPrice;

						const message: MessageEntity = await createMessage(
							plainText,
							response,
							images
							// need to add previous message ids
						);

						await updateUserBalanceWithDeduction(Number(session.user!.id), totalCost);

						await createApiRequestEntry(
							Number(session.user!.id!),
							'openAI',
							model.name,
							inputTokens,
							inputPrice,
							outputTokens,
							outputPrice,
							totalCost,
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
