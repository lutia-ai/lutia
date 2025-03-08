import { error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import type { Message, Model, Image, ClaudeImage, GptTokenUsage } from '$lib/types.d';
import { calculateClaudeImageCost, countTokens } from '$lib/tokenizer';
import { createApiRequestEntry } from '$lib/db/crud/apiRequest';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { createMessage } from '$lib/db/crud/message';
import { retrieveUsersBalance, updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { InsufficientBalanceError } from '$lib/customErrors';
import { env } from '$env/dynamic/private';
import { PaymentTier, type User } from '@prisma/client';
import { createConversation, updateConversation, updateConversationLastMessage } from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';

export async function POST({ request, locals }) {
    
	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		throw error(401, 'Forbidden');
	}

	try {
		const { plainTextPrompt, promptStr, modelStr, imagesStr, reasoningOn, conversationId } = await request.json();

		const plainText: string = JSON.parse(plainTextPrompt);

		const model: Model = JSON.parse(modelStr);

		let messages: Message[] = JSON.parse(promptStr);

		const images: Image[] = JSON.parse(imagesStr);

		let claudeImages: ClaudeImage[] = [];

        const user: User = await retrieveUserByEmail(session.user!.email);

        // Filter out assistant messages with empty content (ie that are still streaming)
        messages = messages.map(msg => {
            if (msg.role === 'assistant' && (msg.content === undefined || msg.content === null || msg.content === '')) {
                return { ...msg, content: 'Streaming in progress...' };
            }
            return msg;
        });

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

        if (user.payment_tier === PaymentTier.PayAsYouGo) {
            let imageCost = 0;
            let imageTokens = 0;
            for (const image of images) {
                const result = calculateClaudeImageCost(image.width, image.height, model);
                imageCost += result.price;
                imageTokens += result.tokens;
            }
            
            const inputGPTCount = await countTokens(messages, model, 'input');
            const inputCost = inputGPTCount.price + imageCost;
            let balance = await retrieveUsersBalance(user.id);
            
            if (balance - inputCost <= 0.1) {
                throw new InsufficientBalanceError();
            }
        }

		// Model constraints
        const MODEL_MAX_OUTPUT_TOKENS = 64000; // Maximum allowed for claude-3-7-sonnet
        const max_tokens = model.max_tokens ? model.max_tokens : 4096

        // Define thinking budget - adjust based on your needs
        // Leave some room for the actual response
        const thinkingBudget = reasoningOn ? 60000 : 0; 

        // Calculate max_tokens respecting the model's limits
        // When thinking is enabled, max_tokens must be > thinking budget
        // But max_tokens can't exceed MODEL_MAX_OUTPUT_TOKENS
        const totalMaxTokens = reasoningOn && model.reasons 
            ? Math.min(thinkingBudget + 4000, MODEL_MAX_OUTPUT_TOKENS) 
            : max_tokens;
        
		const client = new Anthropic({ apiKey: env.VITE_ANTHROPIC_API_KEY });
        const stream = await client.messages.stream({
            // @ts-ignore
            messages: messages,
            model: model.param,
            max_tokens: totalMaxTokens,
            ...(reasoningOn && model.reasons ? {
                thinking: {
                  type: "enabled",
                  budget_tokens: thinkingBudget
                }
            } : {})
        });

		const chunks: string[] = [];
        const thinkingChunks: string[] = [];
		let finalUsage: GptTokenUsage | null = {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0
		};
		let error: any;
        let messageConversationId = conversationId;

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						if (chunk.type === 'message_start') {
							finalUsage.prompt_tokens = chunk.message.usage.input_tokens;
                            // Create a new conversation only if:
                            // 1. User is premium AND
                            // 2. No existing conversationId was provided
                            if (user.payment_tier === PaymentTier.Premium && !messageConversationId) {
                                const conversation = await createConversation(
                                    user.id,
                                    'New chat'
                                );
                                messageConversationId = conversation.id;
                            }
                            // Send the conversation ID back to the client
							controller.enqueue(new TextEncoder().encode(
								JSON.stringify({
									type: "conversation_id",
									id: messageConversationId
								}) + "\n"
							));
						}
						if (chunk.type === 'message_delta') {
                            finalUsage.completion_tokens = chunk.usage.output_tokens;
							finalUsage.total_tokens =
                            finalUsage.prompt_tokens + finalUsage.completion_tokens;
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
						else if (chunk.type === 'content_block_delta') {
                            // @ts-ignore
                            if (chunk.delta.type === 'thinking_delta') {
                                const thinkingContent = (chunk as any).delta?.thinking || '';
                                thinkingChunks.push(thinkingContent);
                                controller.enqueue(new TextEncoder().encode(
                                    JSON.stringify({
                                        type: "reasoning",
                                        content: thinkingContent
                                    }) + "\n"
                                ));
                            } else if (chunk.delta.type === 'text_delta') {
                                const content = (chunk as any).delta?.text || '';
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
						} else if (chunk.type === 'message_stop') {
							break;
						}
					}
				} catch (err) {
					error = err;
                    console.error(error);
                    controller.enqueue(new TextEncoder().encode(
                        JSON.stringify({
                            type: "error",
                            message: error.error.error.message
                        }) + "\n"
                    ));
				} finally {
					if (chunks.length > 0) {
                        const thinkingResponse = thinkingChunks.join('');
						const response = chunks.join('');

                        const inputTokens = finalUsage.prompt_tokens;
                        const outputTokens = finalUsage.completion_tokens;
                        const inputPrice = (inputTokens * model.input_price) / 1000000;
                        const outputPrice = (outputTokens * model.output_price) / 1000000;
						const totalCost = inputPrice + outputPrice;

                        if (user.payment_tier === PaymentTier.PayAsYouGo) {
                            await updateUserBalanceWithDeduction(user.id, totalCost);
                        }

						const message = await createMessage(plainText, response, images, thinkingResponse);

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
						
						// Create API request with the conversation ID
						await createApiRequestEntry(
							user.id,
							'anthropic',
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
