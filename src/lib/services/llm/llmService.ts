import { error } from '@sveltejs/kit';
import type { LLMRequestConfig, UsageMetrics } from './types';
import { llmProviderFactory } from './providerFactory';
import { finalizeResponse, updateExistingMessageAndRequest } from '$lib/utils/responseFinalizer';
import { InsufficientBalanceError } from '$lib/types/customErrors';

/**
 * Process an LLM request with streaming response
 */
export async function processLLMRequest(config: LLMRequestConfig, requestSignal: AbortSignal) {
	const {
		user,
		model,
		messages,
		plainText,
		images,
		files,
		apiProvider,
		regenerateMessageId,
		messageConversationId,
		originalConversationId,
		referencedMessageIds,
		requestId,
		reasoningEnabled
	} = config;

	console.log(`[LLM Service] Processing request with provider: ${apiProvider}`);
	console.log(
		`[LLM Service] Messages count: ${messages.length}, Images: ${images.length}, Files: ${files.length}`
	);
	console.log(
		`[LLM Service] Conversation ID: ${messageConversationId || 'new'}, Original: ${originalConversationId || 'none'}`
	);

	// Get the provider for the requested API
	try {
		const provider = llmProviderFactory.getProvider(apiProvider);
		console.log(`[LLM Service] Provider retrieved successfully`);

		// Process the messages with the specific provider
		const processedMessages = provider.processMessages(messages, images, files);
		console.log(
			`[LLM Service] Messages processed, count: ${Array.isArray(processedMessages) ? processedMessages.length : 'N/A (custom format)'}`
		);

		// Track response data
		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		let isFirstChunk = true;
		const finalUsage: UsageMetrics = {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0
		};
		let errorMessage: any;

		// Create the stream
		let stream;
		try {
			console.log(`[LLM Service] Creating completion stream with model: ${model.name}`);
			stream = await provider.createCompletionStream({
				model,
				messages: processedMessages,
				reasoningEnabled
			});
			console.log(`[LLM Service] Stream created successfully`);
		} catch (err) {
			console.error('[LLM Service] Error creating stream:', err);
			throw error(500, 'Error creating stream');
		}

		// Create abort controller for tracking state
		const abortController = new AbortController();
		const { signal: abortSignal } = abortController;

		// Track client connection
		let clientDisconnected = false;

		requestSignal.addEventListener('abort', () => {
			console.error('Client disconnected prematurely');
			clientDisconnected = true;
			abortController.abort();

			// Close the stream if possible
			if (stream && typeof stream.controller?.abort === 'function') {
				stream.controller.abort();
			}
		});

		const textEncoder = new TextEncoder();

		// Create and return the readable stream
		return new ReadableStream({
			async start(controller) {
				try {
					// Process each chunk from the provider's normalized stream
					for await (const chunk of stream) {
						if (clientDisconnected || abortSignal.aborted) {
							break;
						}

						// Process the chunk with the provider-specific handler
						provider.handleStreamChunk(chunk, {
							onFirstChunk: (requestId, conversationId) => {
								if (isFirstChunk) {
									isFirstChunk = false;
									try {
										// Only send a conversation ID update for new conversations
										// If originalConversationId is 'new' or empty, we want to send the new messageConversationId
										// Otherwise, keep using the existing conversation ID
										const actualConversationId =
											!originalConversationId ||
											originalConversationId === 'new'
												? messageConversationId
												: originalConversationId;

										console.log(
											`[LLM Service] Sending first chunk info with conversation ID: ${actualConversationId}`
										);
										controller.enqueue(
											textEncoder.encode(
												JSON.stringify({
													type: 'request_info',
													request_id: requestId,
													conversation_id: actualConversationId
												}) + '\n'
											)
										);
									} catch (err) {
										console.error('Client already disconnected (first chunk)');
										clientDisconnected = true;
									}
								}
							},
							onUsage: (usage, modelPrices) => {
								finalUsage.prompt_tokens = usage.prompt_tokens;
								finalUsage.completion_tokens = usage.completion_tokens;
								finalUsage.total_tokens = usage.total_tokens;

								try {
									// Create a model with prices object with defaults for missing properties
									const modelWithPrices = {
										// Default fallback prices if none provided
										...{ input_price: 0.00001, output_price: 0.00005 },
										// Merge in any prices from the provider
										...(modelPrices || {})
									};

									console.log(
										'[LLM Service] Sending usage info',
										JSON.stringify({
											inputPrice:
												(finalUsage.prompt_tokens *
													modelWithPrices.input_price) /
												1000000,
											outputPrice:
												(finalUsage.completion_tokens *
													modelWithPrices.output_price) /
												1000000
										})
									);

									// Ensure we have valid numbers
									const inputPrice = isNaN(
										finalUsage.prompt_tokens * modelWithPrices.input_price
									)
										? 0
										: (finalUsage.prompt_tokens * modelWithPrices.input_price) /
											1000000;
									const outputPrice = isNaN(
										finalUsage.completion_tokens * modelWithPrices.output_price
									)
										? 0
										: (finalUsage.completion_tokens *
												modelWithPrices.output_price) /
											1000000;

									controller.enqueue(
										textEncoder.encode(
											JSON.stringify({
												type: 'usage',
												usage: {
													inputPrice,
													outputPrice
												}
											}) + '\n'
										)
									);
								} catch (err) {
									console.error(
										'[LLM Service] Client already disconnected (usage)',
										err
									);
									clientDisconnected = true;
								}
							},
							onContent: (content) => {
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
									console.error('Client already disconnected (content)');
									clientDisconnected = true;
								}
							},
							onReasoning: (content) => {
								try {
									thinkingChunks.push(content);
									controller.enqueue(
										textEncoder.encode(
											JSON.stringify({
												type: 'reasoning',
												content: content
											}) + '\n'
										)
									);
								} catch (err) {
									console.error('Client already disconnected (reasoning)');
									clientDisconnected = true;
								}
							}
						});
					}
				} catch (err) {
					errorMessage = err;
					console.error(err);
					try {
						controller.enqueue(
							textEncoder.encode(
								JSON.stringify({
									type: 'error',
									message:
										errorMessage?.error?.error?.message ||
										errorMessage?.message ||
										'Unknown error occurred'
								}) + '\n'
							)
						);
					} catch (controllerError) {
						console.error('Failed to send error: client disconnected');
						clientDisconnected = true;
					}
				} finally {
					try {
						if (!regenerateMessageId) {
							const { message, apiRequest } = await finalizeResponse({
								user,
								model,
								plainText,
								images,
								files,
								chunks,
								thinkingChunks,
								finalUsage,
								wasAborted: clientDisconnected,
								error: errorMessage,
								requestId,
								messageConversationId,
								originalConversationId: originalConversationId || null,
								apiProvider,
								referencedMessageIds: referencedMessageIds.map((id) => Number(id))
							});

							controller.enqueue(
								textEncoder.encode(
									JSON.stringify({
										type: 'message_id',
										message_id: message.id
									}) + '\n'
								)
							);
						} else {
							// Path for regenerating a response to an existing message
							const { message, apiRequest } = await updateExistingMessageAndRequest({
								messageId: regenerateMessageId.toString(),
								user,
								model,
								chunks,
								thinkingChunks,
								finalUsage,
								wasAborted: clientDisconnected,
								error: errorMessage,
								files
							});

							controller.enqueue(
								textEncoder.encode(
									JSON.stringify({
										type: 'message_id',
										message_id: message.id
									}) + '\n'
								)
							);
						}
					} catch (err) {
						console.error('Error in finalizeResponse:', err);
					}

					try {
						controller.close();
					} catch (closeError) {
						console.error('Controller already closed');
					}
				}
			}
		});
	} catch (err) {
		console.error('Error retrieving provider:', err);
		throw error(500, 'Error retrieving provider');
	}
}
