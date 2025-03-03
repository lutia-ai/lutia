import { error } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message, Model, Image, GeminiImage } from '$lib/types.d';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import type { Message as MessageEntity } from '@prisma/client';
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

		const genAI = new GoogleGenerativeAI(env.VITE_GOOGLE_GEMINI_API_KEY);
		const genAIModel = genAI.getGenerativeModel({ model: model.param });

		let inputCountResult;
		const chunks: string[] = [];
		let inputCost: number = 0;

		if (geminiImage) {
			inputCountResult = await genAIModel.countTokens([JSON.stringify(prompt), geminiImage]);
			inputCost = (inputCountResult.totalTokens / 1000000) * model.input_price;
		} else {
			// @ts-ignore
			inputCountResult = await genAIModel.countTokens(prompt);
			inputCost = (inputCountResult.totalTokens / 1000000) * model.input_price;
		}

		let balance = await retrieveUsersBalance(Number(session.user.id));
		if (balance - inputCost <= 0.1) {
			throw new InsufficientBalanceError();
		}

		let result;
		if (geminiImage) {
			result = await genAIModel.generateContentStream([JSON.stringify(prompt), geminiImage]);
		} else {
			// @ts-ignore
			result = await genAIModel.generateContentStream(prompt);
		}

		let error: any;

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of result.stream) {
						const content = (chunk as any).candidates[0].content.parts[0].text;
						if (content) {
							// Append each chunk to the array
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
						const outputCountResult = await genAIModel.countTokens(response);
						const outputCost =
							(outputCountResult.totalTokens / 1000000) * model.output_price;

						const message: MessageEntity = await createMessage(
							plainText,
							response,
							images
							// need to add previous message ids
						);

						await updateUserBalanceWithDeduction(
							Number(session.user!.id),
							outputCost + inputCost
						);

						await createApiRequestEntry(
							Number(session.user!.id!),
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
