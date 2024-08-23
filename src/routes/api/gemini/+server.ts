import { error } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message, Model, Image, GeminiImage } from '$lib/types';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import { Message as MessageEntity } from '$lib/db/entities/Message';
import { createMessage } from '$lib/db/crud/message';

const googleSecretKey =
	process.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(googleSecretKey);

export async function POST({ request, locals }) {
	let session = await locals.auth();
	if (!session) {
		throw error(401, 'Forbidden');
	}

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr } = await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);
		const messages: Message[] = JSON.parse(promptStr);
		const model: Model = JSON.parse(modelStr);
		const images: Image[] = JSON.parse(imagesStr);

		const prompt = {
			contents: messages.map((message) => ({
				role: message.role === 'user' ? message.role : 'model',
				parts: [{ text: message.content }]
			}))
		};

		let geminiImage: GeminiImage | undefined = undefined;

		if (images.length > 0) {
			geminiImage = {
				inlineData: {
					data: images[0].data.split(',')[1],
					mimeType: images[0].media_type
				}
			};
		}

		const genAIModel = genAI.getGenerativeModel({ model: model.param });

		let inputCountResult;
		let inputGPTCount;

		const chunks: string[] = [];

		let result;
		let inputCost: number = 0;
		if (geminiImage) {
			result = await genAIModel.generateContentStream([JSON.stringify(prompt), geminiImage]);
			inputCountResult = await genAIModel.countTokens([JSON.stringify(prompt), geminiImage]);
			inputCost = (inputCountResult.totalTokens / 1000000) * model.input_price;
		} else {
			// @ts-ignore
			result = await genAIModel.generateContentStream(prompt);
			// @ts-ignore
			inputCountResult = await genAIModel.countTokens(prompt);
			inputCost = (inputCountResult.totalTokens / 1000000) * model.input_price;
		}

		const readableStream = new ReadableStream({
			async start(controller) {
				for await (const chunk of result.stream) {
					const content = (chunk as any).candidates[0].content.parts[0].text;
					if (content) {
						// Append each chunk to the array
						chunks.push(content);
						controller.enqueue(new TextEncoder().encode(content));
					}
				}
				controller.close();

				const response = chunks.join('');
				const outputCountResult = await genAIModel.countTokens(response);
				const outputCost = (outputCountResult.totalTokens / 1000000) * model.output_price;

				const message: MessageEntity = await createMessage(
					plainText,
					response,
					images
					// need to add previous message ids
				);

				await createApiRequestEntry(
					session.user!.email!,
					'google',
					model.name,
					inputCountResult.totalTokens,
					inputCost,
					outputCountResult.totalTokens,
					outputCost,
					inputCost + outputCost,
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
