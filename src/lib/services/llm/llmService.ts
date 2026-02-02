import { error } from '@sveltejs/kit';
import type { LLMRequestConfig, UsageMetrics } from './types';
import { llmProviderFactory } from './providerFactory';
import { finalizeResponse, updateExistingMessageAndRequest } from '$lib/utils/responseFinalizer';
import {
	OrderedContentManager,
	WebSearchManager,
	ServerStreamEncoder
} from '$lib/utils/streamingUtils';
import { CostCalculator } from '$lib/utils/apiUtils';
import { retrieveApiRequestByMessageId } from '$lib/db/crud/apiRequest';

/**
 * Process an LLM request with streaming response
 * @param config Configuration for the LLM request including user, model, messages, etc.
 * @param requestSignal AbortSignal to handle client disconnection
 * @returns ReadableStream for streaming the response to the client
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
		reasoningEnabled,
		webSearchEnabled
	} = config;

	// Get existing costs if regenerating
	let existingInputCost = 0;
	let existingOutputCost = 0;
	let existingWebSearchCost = 0;

	if (regenerateMessageId) {
		try {
			// Parse the JSON string to get the actual messageId number
			const messageIdNumber = JSON.parse(regenerateMessageId);
			const existingApiRequest = await retrieveApiRequestByMessageId(
				messageIdNumber,
				user.id,
				false // Get non-serialized version
			);

			if (existingApiRequest && 'input_cost' in existingApiRequest) {
				// existingApiRequest is the non-serialized version with Decimal fields
				existingInputCost = parseFloat(existingApiRequest.input_cost.toString());
				existingOutputCost = parseFloat(existingApiRequest.output_cost.toString());
				existingWebSearchCost = parseFloat(
					existingApiRequest.web_search_cost?.toString() || '0'
				);
			}
		} catch (err) {
			console.error('[LLM Service] Error fetching existing costs:', err);
			// Continue with 0 costs if fetch fails
		}
	}

	// Get the provider for the requested API
	try {
		const provider = llmProviderFactory.getProvider(apiProvider);

		// Process the messages with the specific provider
		const processedMessages = provider.processMessages(messages, images, files);

		// Track response data
		const chunks: string[] = [];
		const thinkingChunks: string[] = [];
		const contentManager = new OrderedContentManager();
		const searchManager = new WebSearchManager();
		const encoder = new ServerStreamEncoder();
		let isFirstChunk = true;
		const finalUsage: UsageMetrics = {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0
		};
		let errorMessage: any;
		let webSearchWasUsed = false;

		// Create the stream
		let stream;
		try {
			stream = await provider.createCompletionStream({
				model,
				messages: processedMessages,
				reasoningEnabled,
				webSearchEnabled
			});
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
		let count = 0;

		// Create and return the readable stream
		return new ReadableStream({
			async start(controller) {
				// Helper function to send usage updates with correct web search cost
				const sendUsageUpdate = () => {
					try {
						// Calculate current generation costs using shared utility
						const currentCosts = CostCalculator.calculateTotalCost(
							finalUsage.prompt_tokens,
							finalUsage.completion_tokens,
							model
						);

						// Add web search cost if search was used and model supports it
						let webSearchCost = 0;
						if (
							webSearchEnabled &&
							model.web_search &&
							model.web_search_price &&
							webSearchWasUsed
						) {
							webSearchCost = model.web_search_price;
						}

						// For regeneration, send accumulated totals; for new messages, send current costs
						const totalInputPrice = regenerateMessageId
							? existingInputCost + currentCosts.inputCost
							: currentCosts.inputCost;
						const totalOutputPrice = regenerateMessageId
							? existingOutputCost + currentCosts.outputCost
							: currentCosts.outputCost;
						const totalWebSearchPrice = regenerateMessageId
							? existingWebSearchCost + webSearchCost
							: webSearchCost;

						controller.enqueue(
							encoder.encodeUsage(
								totalInputPrice,
								totalOutputPrice,
								totalWebSearchPrice
							)
						);
					} catch (err) {
						console.error('[LLM Service] Client already disconnected (usage)', err);
						clientDisconnected = true;
					}
				};

				try {
					// Process each chunk from the provider's normalized stream
					for await (const chunk of stream) {
						if (clientDisconnected || abortSignal.aborted) {
							break;
						}

						// console.log('chunk', chunk);
						if (count < 10) {
							count++;
						}

						// Process the chunk with the provider-specific handler
						provider.handleStreamChunk(chunk, {
							onFirstChunk: (requestId) => {
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

										controller.enqueue(
											encoder.encodeRequestInfo(
												requestId,
												actualConversationId
											)
										);
									} catch (err) {
										console.error('Client already disconnected (first chunk)');
										clientDisconnected = true;
									}
								}
							},
							onUsage: (usage) => {
								finalUsage.prompt_tokens = usage.prompt_tokens;
								finalUsage.completion_tokens = usage.completion_tokens;
								finalUsage.total_tokens = usage.total_tokens;

								// Send usage update using helper function
								sendUsageUpdate();
							},
							onContent: (content) => {
								try {
									chunks.push(content);
									contentManager.addText(content);

									controller.enqueue(encoder.encodeText(content));
								} catch (err) {
									console.error('Client already disconnected (content)');
									clientDisconnected = true;
								}
							},
							onReasoning: (content) => {
								try {
									thinkingChunks.push(content);
									contentManager.addReasoning(content);

									controller.enqueue(encoder.encodeReasoning(content));
								} catch (err) {
									console.error('Client already disconnected (reasoning)');
									clientDisconnected = true;
								}
							},
							onToolUse: (toolName, toolData) => {
								try {
									// Store web search results for saving to database
									if (toolName === 'web_search') {
										// Mark web search as used when tool is first called (even with undefined data)
										if (!webSearchWasUsed) {
											webSearchWasUsed = true;
											// Send updated usage with web search cost
											sendUsageUpdate();
										}

										if (toolData) {
											searchManager.addWebSearchResults(toolData);
										}
									}

									// Use shared content manager for tool tracking
									contentManager.addToolUse(toolName, toolData);

									controller.enqueue(encoder.encodeToolUse(toolName, toolData));
								} catch (err) {
									console.error('Client already disconnected (tool_use)');
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
							encoder.encodeError(
								errorMessage?.error?.error?.message ||
									errorMessage?.message ||
									'Unknown error occurred'
							)
						);
					} catch (controllerError) {
						console.error('Failed to send error: client disconnected');
						clientDisconnected = true;
					}
				} finally {
					try {
						if (!regenerateMessageId) {
							const { message } = await finalizeResponse({
								user,
								model,
								plainText,
								images,
								files,
								chunks,
								thinkingChunks,
								webSearchResults: searchManager.getWebSearchResults(),
								orderedContent: contentManager.getOrderedContent(),
								finalUsage,
								wasAborted: clientDisconnected,
								error: errorMessage,
								requestId,
								messageConversationId,
								originalConversationId: originalConversationId || null,
								apiProvider,
								referencedMessageIds: referencedMessageIds.map((id) => Number(id))
							});
							controller.enqueue(encoder.encodeMessageId(message.id));
						} else {
							// Path for regenerating a response to an existing message
							const { message } = await updateExistingMessageAndRequest({
								messageId: regenerateMessageId.toString(),
								user,
								model,
								chunks,
								thinkingChunks,
								webSearchResults: searchManager.getWebSearchResults(),
								orderedContent: contentManager.getOrderedContent(),
								finalUsage,
								wasAborted: clientDisconnected,
								error: errorMessage,
								files
							});

							controller.enqueue(encoder.encodeMessageId(message.id));
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
