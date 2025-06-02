import { get } from 'svelte/store';
import { page } from '$app/stores';
import { pushState } from '$app/navigation';
import type { UserChat, Component, ReasoningComponent, LlmChat } from '$lib/types/types';
import {
	chatHistory,
	chosenModel,
	chosenCompany,
	isContextWindowAuto,
	numberPrevMessages,
	conversationId
} from '$lib/stores';
import { generateFullPrompt } from '$lib/components/prompt-bar/utils/promptFunctions';
import { parseOrderedContent } from '$lib/components/chat-history/utils/chatHistory';
import { isLlmChatComponent } from '$lib/types/typeGuards';
import { calculateImageCostByProvider } from '$lib/models/cost-calculators/imageCalculator';
import {
	handleStreamingResponse,
	type StreamCallbacks,
	type StreamingState
} from '$lib/utils/streamingUtils';
import { ApiRequestBuilder, ApiErrorHandler, createLLMRequest } from '$lib/utils/apiUtils';
import {
	ChatHistoryErrorManager,
	ErrorNotificationManager,
	LLM_ERROR_MESSAGES
} from '$lib/utils/errorHandling';

/**
 * Handles the submission of a prompt to an AI model
 * @param plainText The text prompt from the user
 * @param imageArray Array of images attached to the prompt
 * @param fileArray Array of files attached to the prompt
 * @param reasoning Whether reasoning mode is enabled (for models that support it)
 * @param errorPopupHandler Function to display error popups
 * @param notificationHandler Function to display notifications
 * @returns Promise<void>
 */
export async function submitPrompt(
	plainText: string,
	imageArray: any[],
	fileArray: any[],
	reasoning: boolean,
	errorPopupHandler: (
		message: string,
		subText: string | null,
		duration: number,
		type: string
	) => void,
	notificationHandler: (title: string, message: string, duration: number, type: string) => void
): Promise<void> {
	if (!plainText.trim()) return;

	// Create user message object
	const userPrompt: UserChat = {
		by: 'user',
		text: plainText.trim(),
		attachments: [...imageArray, ...fileArray]
	};

	// Add user message to chat history
	chatHistory.update((history) => [...history, userPrompt]);

	// Initialize AI response in chat history
	chatHistory.update((history) => [
		...history,
		{
			by: get(chosenModel).name,
			text: '',
			input_cost: 0,
			output_cost: 0,
			price_open: false,
			loading: true,
			copied: false
		}
	]);

	const currentChatIndex = get(chatHistory).length - 1;

	try {
		// Prepare the conversation
		prepareConversation();

		// Make API request to the appropriate endpoint
		const response = await makeApiRequest(plainText, imageArray, fileArray, reasoning);

		// Handle response based on model type
		if (get(chosenModel).generatesImages) {
			await handleImageGenerationResponse(response, currentChatIndex);
		} else {
			await handleTextStreamingResponse(response, currentChatIndex, errorPopupHandler);
		}

		// Calculate and update image costs
		updateImageCosts(imageArray, currentChatIndex);
	} catch (error: any) {
		handleError(error, currentChatIndex, notificationHandler);
	}
}

/**
 * Prepares the conversation by setting the conversation ID from URL if needed
 */
function prepareConversation(): void {
	// If we're on the /chat/new route, always clear the conversationId
	if (get(page).params.id === 'new') {
		conversationId.set('new');
	}
	// Otherwise, set conversationId from slug parameter if not already set
	else if (!get(conversationId) || get(conversationId) === 'new') {
		conversationId.set(get(page).params.id);
	}
}

/**
 * Makes the API request to the appropriate endpoint
 * @param plainText The text prompt from the user
 * @param imageArray Array of images attached to the prompt
 * @param fileArray Array of files attached to the prompt
 * @param reasoning Whether reasoning mode is enabled
 * @returns Promise with the fetch response
 */
async function makeApiRequest(
	plainText: string,
	imageArray: any[],
	fileArray: any[],
	reasoning: boolean
): Promise<Response> {
	const fullPrompt = generateFullPrompt(
		plainText,
		get(chatHistory),
		get(numberPrevMessages),
		get(chosenModel),
		true,
		get(isContextWindowAuto)
	);

	// Build request using shared utility
	const requestBody = new ApiRequestBuilder()
		.setPromptData(plainText, fullPrompt, get(chosenModel).name)
		.setAttachments(imageArray, fileArray)
		.setProvider(get(chosenCompany))
		.setReasoning(get(chosenCompany), reasoning)
		.setConversationId(get(conversationId))
		.build();

	const response = await createLLMRequest('/api/llm', requestBody);

	// Use shared error handling
	await ApiErrorHandler.validateResponse(response, () => {
		// Handle insufficient balance - remove the added messages
		ChatHistoryErrorManager.removeRecentMessages(chatHistory.update);
	});

	return response;
}

/**
 * Handles image generation response from the API
 * @param response The fetch response
 * @param currentChatIndex The index of the current chat message
 */
async function handleImageGenerationResponse(
	response: Response,
	currentChatIndex: number
): Promise<void> {
	const data = await response.json();
	const base64ImageData = data.image;
	const outputPrice = data.outputPrice;

	// Update AI response in chat history
	chatHistory.update((history) =>
		history.map((msg, index) =>
			index === currentChatIndex
				? {
						...msg,
						text: '[AI Generated image]',
						components: [
							{
								type: 'image',
								data: 'data:image/png;base64,' + base64ImageData,
								media_type: 'image/png',
								width: 1024,
								height: 1024,
								ai: true
							}
						],
						input_cost: 0,
						output_cost: outputPrice,
						loading: false
					}
				: msg
		)
	);
}

/**
 * Handles text streaming response from the API using shared utilities with real-time updates
 * @param response The fetch response
 * @param currentChatIndex The index of the current chat message
 * @param errorPopupHandler Function to display error popups
 */
async function handleTextStreamingResponse(
	response: Response,
	currentChatIndex: number,
	errorPopupHandler: (
		message: string,
		subText: string | null,
		duration: number,
		type: string
	) => void
): Promise<void> {
	const callbacks: StreamCallbacks = {
		onRequestInfo: (convId) => {
			// Update the URL without reloading the page
			const url = new URL(window.location.href);
			url.pathname = `/chat/${convId}`;
			pushState(url.toString(), {});
			conversationId.set(convId);
		},
		onError: (message) => {
			errorPopupHandler(message, null, 5000, 'error');
		},
		onChunkProcessed: (currentState: StreamingState) => {
			// Update chat history in real-time as chunks are processed
			updateChatHistory(currentChatIndex, currentState, true);
		}
	};

	// Use real-time streaming handler
	const finalResult = await handleStreamingResponse(response, callbacks);

	// Final update to ensure everything is set correctly
	updateChatHistory(currentChatIndex, finalResult, false);
}

/**
 * Updates chat history with final streaming results
 * @param currentChatIndex The index of the current chat message
 * @param result Results from streaming handler
 * @param isFinal Whether this is the final update
 */
function updateChatHistory(
	currentChatIndex: number,
	result: StreamingState,
	isLoading: boolean = false
): void {
	// Parse ordered content to get components that maintain order
	const orderedComponents = parseOrderedContent(result.orderedContent);

	// Update user message with message_id
	if (result.messageId) {
		chatHistory.update((history) =>
			history.map((msg, index) =>
				index === currentChatIndex - 1
					? {
							...msg,
							message_id: result.messageId
						}
					: msg
			)
		);
	}

	// Update AI response
	chatHistory.update((history) =>
		history.map((msg, index) =>
			index === currentChatIndex
				? {
						...msg,
						text: result.responseText,
						components: orderedComponents,
						orderedContent: result.orderedContent,
						// Only include webSearchResults if they exist and have content
						...(result.webSearchResults &&
						result.webSearchResults.length > 0 &&
						result.webSearchResults.some(
							(result) => result.results && result.results.length > 0
						)
							? { webSearchResults: result.webSearchResults }
							: {}),
						message_id: result.messageId,
						input_cost: result.inputPrice,
						output_cost: result.outputPrice,
						toolInProgress: result.toolInProgress,
						loading: isLoading
					}
				: msg
		)
	);
}

/**
 * Calculates and updates image costs in the chat history
 * @param imageArray Array of images to calculate costs for
 * @param currentChatIndex The index of the current chat message
 */
function updateImageCosts(imageArray: any[], currentChatIndex: number): void {
	let imageCost = 0;

	if (imageArray && imageArray.length > 0) {
		// Calculate costs once for the entire array instead of per image
		const imageCalc = calculateImageCostByProvider(
			imageArray,
			get(chosenModel),
			get(chosenCompany)
		);
		imageCost = imageCalc.cost;
	}

	chatHistory.update((history) => {
		return history.map((item, index) => {
			if (index === currentChatIndex && isLlmChatComponent(item)) {
				return {
					...item,
					input_cost: (item.input_cost || 0) + imageCost,
					loading: false
				};
			}
			return item;
		});
	});
}

/**
 * Handles errors that occur during prompt submission
 * @param error The error that occurred
 * @param currentChatIndex The index of the current chat message
 * @param notificationHandler Function to display notifications
 */
function handleError(
	error: any,
	currentChatIndex: number,
	notificationHandler: (title: string, message: string, duration: number, type: string) => void
): void {
	console.error('Error:', error);

	// Use shared error handling for chat history update
	ChatHistoryErrorManager.setMessageError(
		chatHistory.update,
		currentChatIndex,
		LLM_ERROR_MESSAGES.GENERATION_ERROR
	);

	// Use shared error notification
	ErrorNotificationManager.showError(notificationHandler, error);
}

/**
 * Scrolls the last message into view
 */
export function scrollLastMessageIntoView(): void {
	setTimeout(() => {
		const chatMessages = document.querySelectorAll('.user-chat-wrapper, .llm-container');
		if (chatMessages.length > 0) {
			const lastMessage = chatMessages[chatMessages.length - 1];
			const offset = lastMessage.getBoundingClientRect().top + window.scrollY - 150;
			window.scrollTo({
				top: offset,
				behavior: 'smooth'
			});
		}
	}, 100);
}
