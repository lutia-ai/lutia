import { deserialize } from '$app/forms';
import { parseOrderedContent } from '$lib/components/chat-history/utils/chatHistory';
import { chatHistory } from '$lib/stores';
import type {
	Component,
	ReasoningComponent,
	SerializedApiRequest,
	Message as ChatMessage,
	OrderedContent,
	ContentItem
} from '$lib/types/types';
import { isLlmChatComponent } from '$lib/types/typeGuards';
import type { ActionResult } from '@sveltejs/kit';
import {
	handleStreamingResponse,
	type StreamCallbacks,
	type StreamingState
} from '$lib/utils/streamingUtils';
import { ApiRequestBuilder, ApiErrorHandler, createLLMRequest } from '$lib/utils/apiUtils';

export async function regenerateMessage(messageId: number) {
	let originalComponent: Component[] = [];
	let originalReasoning: ReasoningComponent | undefined;
	let originalOrderedContent: OrderedContent | undefined;
	chatHistory.update((history) => {
		return history.map((msg) => {
			if (msg.message_id === messageId && isLlmChatComponent(msg)) {
				// Store the original content before clearing it
				originalComponent = msg.components;
				originalReasoning = msg.reasoning ?? originalReasoning;
				originalOrderedContent = msg.orderedContent;

				return {
					...msg,
					components: [],
					orderedContent: [],
					reasoning: undefined,
					loading: true
				};
			}
			return msg;
		});
	});

	try {
		const formData = new FormData();
		formData.append('messageId', messageId.toString());

		const response = await fetch('?/fetchMessageAndApiRequest', {
			method: 'POST',
			body: formData
		});
		const fetchResult: ActionResult = deserialize(await response.text());

		let apiRequestWithMessage: SerializedApiRequest | null = null;

		if (fetchResult.type === 'success' && fetchResult.data) {
			apiRequestWithMessage = fetchResult.data as SerializedApiRequest;
		} else if (fetchResult.type === 'failure' && fetchResult.data) {
			console.error('Failed to fetch Api request with message data');
			throw new Error('Failed to fetch Api request with message data');
		}

		if (!apiRequestWithMessage) {
			throw new Error('Failed to fetch Api request with message data');
		}

		const reasoningOn = apiRequestWithMessage.message?.reasoning ? true : false;

		// Create the fullPrompt array with message history
		let fullPrompt: ChatMessage[] = [];

		// If there are referenced messages, add them first (in order by ID)
		if (
			apiRequestWithMessage.message?.referencedMessages &&
			apiRequestWithMessage.message.referencedMessages.length > 0
		) {
			// Sort referenced messages by ID to maintain chronological order
			const sortedReferences = [...apiRequestWithMessage.message.referencedMessages].sort(
				(a, b) => a.id - b.id
			);

			// Add each referenced message to the conversation history
			sortedReferences.forEach((refMsg) => {
				const userMessage: ChatMessage = {
					message_id: refMsg.id,
					role: 'user',
					content: refMsg.prompt
				};
				const AiMessage: ChatMessage = {
					message_id: refMsg.id,
					role: 'assistant',
					content: refMsg.response
				};
				fullPrompt.push(userMessage, AiMessage);
			});
		}

		// Add the current message (with empty response since we're regenerating it)
		if (apiRequestWithMessage.message) {
			const currentMessage: ChatMessage = {
				message_id: apiRequestWithMessage.message.id,
				role: 'user',
				content: apiRequestWithMessage.message.prompt
			};
			fullPrompt.push(currentMessage);
		}

		// Build request using shared utility
		const requestBody = new ApiRequestBuilder()
			.setPromptData(
				apiRequestWithMessage.message?.prompt || '',
				fullPrompt,
				apiRequestWithMessage.apiModel
			)
			.setAttachments(
				apiRequestWithMessage.message?.pictures || [],
				[] // No files in regeneration context
			)
			.setProvider(apiRequestWithMessage.apiProvider)
			.setReasoning(apiRequestWithMessage.apiProvider, reasoningOn)
			.setConversationId(apiRequestWithMessage.conversationId)
			.build();

		// Add regeneration-specific field
		requestBody.regenerateMessageId = JSON.stringify(messageId);

		const streamResponse = await createLLMRequest('/api/llm', requestBody);

		// Use shared error handling
		await ApiErrorHandler.validateResponse(streamResponse);

		// Use shared streaming handler with real-time updates
		const callbacks: StreamCallbacks = {
			onChunkProcessed: (currentState: StreamingState) => {
				updateChatHistoryForRegeneration(messageId, currentState);
			}
		};

		const streamResult = await handleStreamingResponse(streamResponse, callbacks);

		// Final update to ensure everything is set correctly
		updateChatHistoryForRegeneration(messageId, streamResult, true);
	} catch (error: any) {
		console.error('Error regenerating message:', error);

		// Restore original content on error
		chatHistory.update((history) => {
			return history.map((msg) => {
				if (msg.message_id === messageId && isLlmChatComponent(msg)) {
					return {
						...msg,
						components: originalComponent,
						orderedContent: originalOrderedContent,
						reasoning: originalReasoning,
						loading: false
					};
				}
				return msg;
			});
		});

		throw error; // Re-throw to be handled by caller
	}
}

/**
 * Updates chat history with regenerated message content (final update)
 * @param messageId Message ID being regenerated
 * @param result Final streaming result
 * @param isFinal Whether this is the final update
 */
function updateChatHistoryForRegeneration(
	messageId: number,
	result: StreamingState,
	isFinal: boolean = false
): void {
	// Parse ordered content to get components
	const orderedComponents = parseOrderedContent(result.orderedContent);

	// Extract reasoning component if it exists
	const reasoningComponent = orderedComponents.find((comp) => comp.type === 'reasoning') as
		| ReasoningComponent
		| undefined;

	// Filter out reasoning from regular components since it's handled separately
	const regularComponents = orderedComponents.filter((comp) => comp.type !== 'reasoning');

	chatHistory.update((history) => {
		return history.map((msg) => {
			if (msg.message_id === messageId && isLlmChatComponent(msg)) {
				return {
					...msg,
					text: result.responseText,
					components: regularComponents,
					orderedContent: result.orderedContent,
					reasoning: reasoningComponent,
					// Only include webSearchResults if they exist and have content
					...(result.webSearchResults &&
					result.webSearchResults.length > 0 &&
					result.webSearchResults.some(
						(searchResult) => searchResult.results && searchResult.results.length > 0
					)
						? { webSearchResults: result.webSearchResults }
						: {}),
					input_cost: result.inputPrice,
					output_cost: result.outputPrice,
					toolInProgress: result.toolInProgress,
					loading: isFinal ? false : result.toolInProgress // Only set loading to false on final update
				};
			}
			return msg;
		});
	});
}
