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
import { parseMessageContent } from '$lib/components/chat-history/utils/chatHistory';
import { isLlmChatComponent } from '$lib/types/typeGuards';
import { calculateImageCostByProvider } from '$lib/models/cost-calculators/imageCalculator';

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
			await handleStreamingResponse(response, currentChatIndex, errorPopupHandler);
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

	// UUID validation function
	const isValidUUID = (uuid: string) => {
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(uuid);
	};

	// Only include conversationId if it's a valid UUID
	const validConversationId =
		get(conversationId) && isValidUUID(get(conversationId)!) ? get(conversationId) : undefined;

	// Determine API endpoint
	let uri = '/api/llm';

	const requestBody: any = {
		plainTextPrompt: JSON.stringify(plainText),
		promptStr: JSON.stringify(fullPrompt),
		modelStr: JSON.stringify(get(chosenModel).name),
		imagesStr: JSON.stringify(imageArray),
		filesStr: JSON.stringify(fileArray),
		provider: get(chosenCompany)
	};

	// Only add reasoning for providers that support it
	if (get(chosenCompany) === 'anthropic') {
		requestBody.reasoningOn = reasoning;
	}

	// Only add conversationId if valid
	if (validConversationId) {
		requestBody.conversationId = validConversationId;
	}

	const response = await fetch(uri, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(requestBody)
	});

	if (!response.ok) {
		const errorData = await response.clone().json();
		chatHistory.update((history) => history.slice(0, -2));

		console.error(`[Submit Prompt] Error response:`, errorData);
		if (errorData.message === 'Insufficient balance') {
			throw new Error("Spending can't go below $0.10");
		}
		throw new Error(errorData.message || 'An error occurred');
	}

	if (!response.body) {
		throw new Error('Response body is null');
	}

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
 * Handles streaming response from the API
 * @param response The fetch response
 * @param currentChatIndex The index of the current chat message
 * @param errorPopupHandler Function to display error popups
 */
async function handleStreamingResponse(
	response: Response,
	currentChatIndex: number,
	errorPopupHandler: (
		message: string,
		subText: string | null,
		duration: number,
		type: string
	) => void
): Promise<void> {
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let responseText = '';
	let reasoningText = '';
	let responseComponents: Component[] = [];
	let reasoningComponent: ReasoningComponent | undefined;
	let message_id: number | undefined;
	let inputPrice = 0;
	let outputPrice = 0;

	while (true) {
		const { value, done } = await reader.read();
		if (done) break;

		// Decode the chunk
		const chunk = decoder.decode(value, { stream: true });

		// Process lines (each JSON object is on its own line)
		const lines = chunk.split('\n').filter((line) => line.trim());

		for (const line of lines) {
			try {
				const data = JSON.parse(line);

				// Handle different message types
				if (data.type === 'text') {
					responseText += data.content;
					responseComponents = parseMessageContent(responseText);
				} else if (data.type === 'reasoning') {
					reasoningText += data.content;
					reasoningComponent = {
						type: 'reasoning',
						content: reasoningText
					};
				} else if (data.type === 'usage') {
					inputPrice = data.usage.inputPrice;
					outputPrice = data.usage.outputPrice;
				} else if (data.type === 'request_info') {
					// Update the URL without reloading the page
					const url = new URL(window.location.href);

					// Ensure conversation_id is a string
					const conversation_id = data.conversation_id || 'new';
					url.pathname = `/chat/${conversation_id}`;

					// This updates the URL without causing a page reload
					pushState(url.toString(), {});
					conversationId.set(conversation_id);
				} else if (data.type === 'message_id') {
					message_id = data.message_id;
				} else if (data.type === 'error') {
					console.error(data.message);
					errorPopupHandler(data.message, null, 5000, 'error');
				}

				// Update chat history with the current state
				updateChatHistory(
					currentChatIndex,
					responseText,
					responseComponents,
					reasoningComponent,
					message_id,
					inputPrice,
					outputPrice
				);
			} catch (e) {
				console.error('Error parsing stream chunk:', e);
				// Continue with the next line if one fails to parse
			}
		}
	}
}

/**
 * Updates the chat history with current response state
 * @param currentChatIndex The index of the current chat message
 * @param responseText The current response text
 * @param responseComponents Parsed components from the response
 * @param reasoningComponent Reasoning component if available
 * @param message_id Message ID from the API
 * @param inputPrice Input cost price
 * @param outputPrice Output cost price
 */
function updateChatHistory(
	currentChatIndex: number,
	responseText: string,
	responseComponents: Component[],
	reasoningComponent: ReasoningComponent | undefined,
	message_id: number | undefined,
	inputPrice: number,
	outputPrice: number
): void {
	// Update user message with message_id
	if (message_id) {
		chatHistory.update((history) =>
			history.map((msg, index) =>
				index === currentChatIndex - 1
					? {
							...msg,
							message_id: message_id
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
						text: responseText,
						components: responseComponents,
						reasoning: reasoningComponent,
						message_id: message_id,
						input_cost: inputPrice,
						output_cost: outputPrice
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

	chatHistory.update((history) => {
		const newHistory = [...history];
		if (newHistory[currentChatIndex] && isLlmChatComponent(newHistory[currentChatIndex])) {
			newHistory[currentChatIndex].text =
				'An error occurred while generating a response. Please try again.';
			(newHistory[currentChatIndex] as LlmChat).loading = false;
		}
		return newHistory;
	});

	const errorMessage = error.message || 'An unknown error occurred';
	notificationHandler('Error', errorMessage, 5000, 'info');
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
