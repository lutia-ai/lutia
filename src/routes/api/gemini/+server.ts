import { error } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message, Model, Image, GeminiImage } from '$lib/types';
import { countTokens } from '$lib/tokenizer';
import fs from 'fs/promises';

const googleSecretKey =
	process.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(googleSecretKey);

export async function POST({ request, locals }) {
	let session = await locals.getSession();
	if (!session) {
		throw error(401, 'Forbidden');
	}

	try {
		const { promptStr, modelStr, imagesStr } = await request.json();

		const messages: Message[] = JSON.parse(promptStr);
		const model: Model = JSON.parse(modelStr);
		const images: Image[] = JSON.parse(imagesStr);

		const prompt = {
			contents: messages.map((message) => ({
				role: message.role,
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
		if (geminiImage) {
			result = await genAIModel.generateContentStream([JSON.stringify(prompt), geminiImage]);
			inputCountResult = await genAIModel.countTokens([JSON.stringify(prompt), geminiImage]);
			// @ts-ignore
			inputCountResult.price = (inputCountResult.totalTokens / 1000000) * model.input_price;
			inputGPTCount = await countTokens(JSON.stringify(prompt), model, 'input');
		} else {
			// @ts-ignore
			result = await genAIModel.generateContentStream(prompt);
			// @ts-ignore
			inputCountResult = await genAIModel.countTokens(prompt);
			// @ts-ignore
			inputCountResult.price = (inputCountResult.totalTokens / 1000000) * model.input_price;
			inputGPTCount = await countTokens(JSON.stringify(prompt), model, 'input');
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

				const completeResult = chunks.join('');
				const outputCountResult = await genAIModel.countTokens(completeResult);
				// @ts-ignore
				outputCountResult.price =
					(outputCountResult.totalTokens / 1000000) * model.output_price;
				const outputGPTCount = await countTokens(completeResult, model, 'output');

				try {
					// Read existing data from file, initializing with an empty array if it doesn't exist
					let existingData = [];
					try {
						const fileContents = await fs.readFile('token_comparison.json', 'utf-8');
						existingData = JSON.parse(fileContents);
					} catch (err: any) {
						if (err.code === 'ENOENT') {
							// File doesn't exist, start with an empty array
							existingData = [];
						} else {
							console.error('Error reading token data:', err);
							// You might want to handle other errors differently
						}
					}

					// Prepare data to append
					const dataToWrite = {
						timestamp: Date.now(),
						input: {
							actual: inputCountResult.totalTokens,
							gpt: inputGPTCount
						},
						output: {
							actual: outputCountResult.totalTokens,
							gpt: outputGPTCount
						}
					};

					// Append the new data to the existing data
					existingData.push(dataToWrite);

					// Write the entire array back to the file
					await fs.writeFile(
						'token_comparison.json',
						JSON.stringify(existingData, null, 2)
					); // Pretty-print for readability
					console.log('Token data appended to file successfully.');
				} catch (err) {
					console.error('Error:', err);
					throw error(500, 'An error occurred while processing your request');
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
		console.error('Error:', err);
		throw error(500, 'An error occurred while processing your request');
	}
}
