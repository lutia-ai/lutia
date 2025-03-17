import { error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import type { Message, Model, Image, ClaudeImage, GptTokenUsage } from '$lib/types.d';
import { calculateClaudeImageCost, countTokens } from '$lib/tokenizer';
import { createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { retrieveUsersBalance, updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';
import { ApiProvider, ApiRequestStatus, PaymentTier, type User } from '@prisma/client';
import {
	createConversation,
	updateConversation,
	updateConversationLastMessage
} from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';

export async function POST({ request, locals }) {
	const requestId = crypto.randomUUID();

	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		throw error(401, 'Forbidden');
	}

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr, reasoningOn, conversationId } =
			await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);
		const model: Model = JSON.parse(modelStr);
		let messages: Message[] = JSON.parse(promptStr);
		const images: Image[] = JSON.parse(imagesStr);
		let claudeImages: ClaudeImage[] = [];
		const user: User = await retrieveUserByEmail(session.user!.email);
		let messageConversationId = conversationId;
		let error: any;

		// Extract system message and ensure non-empty content in messages
		let systemMessage = null;

		// Iterate through the messages array and remove empty assistant messages
		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (msg.role === 'system') {
				// Extract system message
				systemMessage = msg.content || '';
			} else if (
				msg.role === 'assistant' &&
				(msg.content === undefined || msg.content === null || msg.content === '')
			) {
				// Remove empty assistant messages
				messages.splice(i, 1);
			}
		}

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

		const inputGPTCount = await countTokens(messages, model, 'input');
		const estimatedInputTokens = inputGPTCount.tokens + imageTokens;
		const estimatedInputCost = inputGPTCount.price + imageCost;

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

		const budget_tokens = 16000;
		const max_tokens =
			reasoningOn && model.reasons ? model.max_tokens! + budget_tokens : model.max_tokens!;

		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		let finalUsage: GptTokenUsage | null = {
			prompt_tokens: estimatedInputTokens,
			completion_tokens: 0,
			total_tokens: 0
		};
		let stream;

		try {
			const client = new Anthropic({ apiKey: env.VITE_ANTHROPIC_API_KEY });
			stream = await client.messages.stream({
				// Include system parameter only if we have a system message
				...(systemMessage !== null ? { system: systemMessage } : {}),
				// @ts-ignore
				messages: messages,
				model: model.param,
				max_tokens: max_tokens,
				...(reasoningOn && model.reasons
					? {
							thinking: {
								type: 'enabled',
								budget_tokens
							}
						}
					: {})
			});
		} catch (err) {
			console.error('Error creating stream:', err);
			throw error(500, 'Error creating stream');
		}

		// Function to handle processing the complete response
		const finalizeResponse = async (wasAborted = false) => {
			try {
                console.log('wasAborted: ', wasAborted);
				const thinkingResponse = thinkingChunks.join('');
				const response = chunks.join('');

                console.log('plainText: ', plainText);
                console.log('response: ', response);

				// Calculate tokens and costs
				const inputTokens = finalUsage.prompt_tokens;
				let outputTokens = finalUsage.completion_tokens;

				if (wasAborted && response.length > 0) {
					const outputGPTCount = await countTokens(
						response + thinkingResponse,
						model,
						'output'
					);
					outputTokens = outputGPTCount.tokens;
				}

				const inputCost = (inputTokens * model.input_price) / 1000000;
				const outputCost = (outputTokens * model.output_price) / 1000000;
				const totalCost = inputCost + outputCost;

				// Apply charges
				if (user.payment_tier === PaymentTier.PayAsYouGo) {
					await updateUserBalanceWithDeduction(user.id, totalCost);
				}

				// Determine status
				const status = wasAborted
					? ApiRequestStatus.ABORTED
					: error
						? ApiRequestStatus.FAILED
						: ApiRequestStatus.COMPLETED;

				// Create database records
				const { message, apiRequest } = await createMessageAndApiRequestEntry(
					{
						prompt: plainText,
						response: response,
						pictures: images,
						reasoning: thinkingResponse,
						referencedMessageIds: []
					},
					{
						userId: user.id,
						apiProvider: ApiProvider.anthropic,
						apiModel: model.name,
						inputTokens: inputTokens,
						inputCost: inputCost,
						outputTokens: outputTokens,
						outputCost: outputCost,
						totalCost: totalCost,
						requestId: requestId,
						status: status,
						conversationId: messageConversationId,
						error: error
					}
				);

				// Only update conversation if we got a response
				if (response.length > 0 && messageConversationId) {
					await updateConversationLastMessage(messageConversationId);

					// Generate title for new conversations
					if (user.payment_tier === PaymentTier.Premium && !conversationId) {
						try {
							const title = await generateConversationTitle(plainText);
							await updateConversation(messageConversationId, { title });
						} catch (titleError) {
							console.error('Error generating conversation title:', titleError);
						}
					}
				}

				console.log('API Request created:', apiRequest);
			} catch (err) {
				console.error('Error in finalizeResponse:', err);
			}
		};

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
						if (chunk.type === 'message_start') {
							finalUsage.prompt_tokens = chunk.message.usage.input_tokens;

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
								console.log('Client already disconnected (message_start)');
								clientDisconnected = true;
								break;
							}
						}
						if (chunk.type === 'message_delta') {
							finalUsage.completion_tokens = chunk.usage.output_tokens;
							finalUsage.total_tokens =
								finalUsage.prompt_tokens + finalUsage.completion_tokens;
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
								console.log('Client already disconnected (message_delta)');
								clientDisconnected = true;
								break;
							}
						} else if (chunk.type === 'content_block_delta') {
							// @ts-ignore
							if (chunk.delta.type === 'thinking_delta') {
								try {
									const thinkingContent = (chunk as any).delta?.thinking || '';
									thinkingChunks.push(thinkingContent);
									controller.enqueue(
										textEncoder.encode(
											JSON.stringify({
												type: 'reasoning',
												content: thinkingContent
											}) + '\n'
										)
									);
								} catch (err) {
									console.log('Client already disconnected (thinking_delta)');
									clientDisconnected = true;
									break;
								}
							} else if (chunk.delta.type === 'text_delta') {
								const content = (chunk as any).delta?.text || '';
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
										console.log('Client already disconnected (text_delta)');
										clientDisconnected = true;
										break;
									}
								}
							}
						} else if (chunk.type === 'message_stop') {
							break;
						}
					}
				} catch (err) {
					error = err;
					console.error(error);
					try {
						controller.enqueue(
							textEncoder.encode(
								JSON.stringify({
									type: 'error',
									message:
										error?.error?.error?.message ||
										error?.message ||
										'Unknown error occurred'
								}) + '\n'
							)
						);
					} catch (controllerError) {
						console.log('Failed to send error: client disconnected');
						clientDisconnected = true;
					}
				} finally {
					await finalizeResponse(clientDisconnected);
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
