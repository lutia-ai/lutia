import type {
	ChatComponent,
	Component,
	LlmChat,
	SerializedApiRequest,
	UserChat,
	Image,
	ApiRequestWithMessage,
	Message as ChatMessage,
	SerializedMessage,
	ReasoningComponent,
	FileAttachment,
	Attachment
} from '$lib/types.d';
import { deserialize } from '$app/forms';
import { isCodeComponent, isLlmChatComponent } from '$lib/utils/typeGuards';
import { chatHistory, numberPrevMessages } from '$lib/stores';
import type { ActionResult } from '@sveltejs/kit';
import { ApiProvider, type Message, type UserSettings } from '@prisma/client';
import { get } from 'svelte/store';

/**
 * Helper function to serialize a Message without causing circular references
 */
function serializeMessage(message: any): SerializedMessage {
	return {
		id: message.id,
		prompt: message.prompt,
		response: message.response,
		reasoning: message.reasoning || '',
		pictures: Array.isArray(message.pictures) ? (message.pictures as Image[]) : [],
		files: Array.isArray(message.files) ? (message.files as FileAttachment[]) : [],
		// Add these fields for referenced messages
		referencedMessages: Array.isArray(message.referencedMessages)
			? message.referencedMessages.map((msg: Message) => ({
					id: msg.id,
					prompt: msg.prompt,
					response: msg.response,
					reasoning: msg.reasoning || '',
					pictures: Array.isArray(msg.pictures) ? (msg.pictures as Image[]) : [],
					files: Array.isArray(msg.files) ? (msg.files as FileAttachment[]) : []
				}))
			: []
	};
}

/**
 * Serializes an API request with message and referenced messages
 */
export function serializeApiRequest(apiRequest: ApiRequestWithMessage): SerializedApiRequest {
	return {
		id: apiRequest.id,
		apiProvider: apiRequest.api_provider,
		apiModel: apiRequest.api_model,
		requestTimestamp: apiRequest.request_timestamp.toISOString(),
		inputTokens: apiRequest.input_tokens,
		inputCost: apiRequest.input_cost.toString(),
		outputTokens: apiRequest.output_tokens,
		outputCost: apiRequest.output_cost.toString(),
		totalCost: apiRequest.total_cost.toString(),
		conversationId: apiRequest.conversation_id,
		message: apiRequest.message ? serializeMessage(apiRequest.message) : null
	};
}

export function loadChatHistory(apiRequests: SerializedApiRequest[]) {
	let chatComponents = apiRequests.map((apiRequest): ChatComponent => {
		const message = apiRequest.message;
		if (!message) {
			return {
				by: 'user',
				text: 'No message content'
			};
		}

		const components: Component[] = parseMessageContent(message.response);

		const llmChat: LlmChat = {
			message_id: apiRequest.message?.id,
			by: apiRequest.apiModel.toString(),
			text: message.response,
			input_cost: parseFloat(apiRequest.inputCost),
			output_cost: parseFloat(apiRequest.outputCost),
			price_open: false,
			loading: false,
			copied: false,
			reasoning: {
				type: 'reasoning',
				content: apiRequest.message?.reasoning || ''
			},
			components:
				apiRequest.message?.pictures &&
				apiRequest.message?.pictures.length > 0 &&
				apiRequest.message?.pictures[0].ai
					? [apiRequest.message?.pictures[0]]
					: components
		};

		return llmChat;
	});

	const userChats: UserChat[] = apiRequests.map((apiRequest): UserChat => {
		// Combine pictures and files into a single attachments array
		const attachments: Attachment[] = [];

		// Add pictures if they exist and are not AI-generated
		if (
			apiRequest.message?.pictures &&
			apiRequest.message?.pictures.length > 0 &&
			!apiRequest.message?.pictures[0].ai
		) {
			attachments.push(...apiRequest.message.pictures);
		}

		// Add files if they exist
		if (apiRequest.message?.files && apiRequest.message?.files.length > 0) {
			attachments.push(...apiRequest.message.files);
		}

		return {
			message_id: apiRequest.message?.id,
			by: 'user',
			text: apiRequest.message?.prompt || 'No prompt available',
			attachments: attachments
		};
	});

	// Interleave user and LLM messages
	chatComponents = chatComponents.flatMap((chat, index) => [userChats[index], chat]);
	return chatComponents;
}

export function parseMessageContent(content: string): Component[] {
	const components: Component[] = [];
	const lines = content.split('\n');
	let currentTextContent: string[] = [];
	let currentCodeBlock: string[] = [];
	let inCodeBlock = false;
	let currentLanguage = '';
	let leadingWhitespace = '';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const codeBlockMatch = line.match(/^([ \t]*)```(\w+)?$/);

		if (codeBlockMatch) {
			if (!inCodeBlock) {
				// Start of code block
				if (currentTextContent.length > 0) {
					// Push accumulated text content
					components.push({
						type: 'text',
						content: currentTextContent.join('\n')
					});
					currentTextContent = [];
				}

				inCodeBlock = true;
				leadingWhitespace = codeBlockMatch[1] || '';
				currentLanguage = codeBlockMatch[2] || 'plaintext';
			} else {
				// End of code block
				inCodeBlock = false;
				const normalizedCode = currentCodeBlock
					.map((line) =>
						line.startsWith(leadingWhitespace)
							? line.slice(leadingWhitespace.length)
							: line
					)
					.join('\n');

				components.push({
					type: 'code',
					language: currentLanguage,
					code: normalizedCode,
					copied: false,
					tabWidth: calculateTabWidth(normalizedCode),
					tabWidthOpen: false
				});
				currentCodeBlock = [];
			}
		} else {
			// Regular line
			if (inCodeBlock) {
				currentCodeBlock.push(line);
			} else {
				currentTextContent.push(line);
			}
		}
	}

	// Handle any remaining content
	if (currentTextContent.length > 0) {
		components.push({
			type: 'text',
			content: currentTextContent.join('\n')
		});
	}

	// Handle unclosed code block
	if (inCodeBlock && currentCodeBlock.length > 0) {
		const normalizedCode = currentCodeBlock
			.map((line) =>
				line.startsWith(leadingWhitespace) ? line.slice(leadingWhitespace.length) : line
			)
			.join('\n');

		components.push({
			type: 'code',
			language: currentLanguage,
			code: normalizedCode,
			copied: false,
			tabWidth: calculateTabWidth(normalizedCode),
			tabWidthOpen: false
		});
	}

	return components;
}

export function calculateTabWidth(code: string): number {
	const lines = code.split('\n');
	let tabWidth: number = 0;

	for (const line of lines) {
		const match = line.match(/^( *)/);
		if (match) {
			const leadingSpaces = match[0];
			const currentLevel = leadingSpaces.length;
			if (currentLevel !== 0) {
				tabWidth = currentLevel;
				break;
			}
		}
	}
	return tabWidth;
}

export function changeTabWidth(code: string, tabWidth: number = 4): string {
	const lines = code.split('\n');
	let originalIndentationLevel: number | null = null;

	const adjustedLines = lines.map((line) => {
		const match = line.match(/^( *)/);
		if (match) {
			const leadingSpaces = match[0];
			const currentLevel = leadingSpaces.length;

			// Initialize originalIndentationLevel if it's null and currentLevel is greater than 0
			if (currentLevel > 0 && originalIndentationLevel === null) {
				originalIndentationLevel = currentLevel;
			}

			// Ensure originalIndentationLevel is not null before performing division
			if (originalIndentationLevel !== null) {
				if (currentLevel === 0) {
					return line;
				} else {
					const indentationUnits = (currentLevel / originalIndentationLevel) * tabWidth;
					const newIndentation = ' '.repeat(indentationUnits);
					return newIndentation + line.trim();
				}
			}
		}

		// Return line as is if no match was found
		return line;
	});

	return adjustedLines.join('\n');
}

export function closeAllTabWidths(): void {
	chatHistory.update((history) => {
		return history.map((item) => {
			if (isLlmChatComponent(item)) {
				item.price_open = false;
				if (Array.isArray(item.components)) {
					item.components.forEach((component: Component) => {
						if (isCodeComponent(component)) {
							component.tabWidthOpen = false;
						}
					});
				}
			}
			return item;
		});
	});
}

export async function clearChatHistory() {
	try {
		const response = await fetch('?/clearChatHistory', {
			method: 'POST',
			body: new FormData()
		});
		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
			chatHistory.set([]);
		} else if (result.type === 'failure' && result.data) {
			console.error('Failed to clear chat history');
		}
	} catch (error) {
		console.error('Error clearing chat history:', error);
	}
}

export async function regenerateMessage(messageId: number) {
	let originalComponent: Component[] = [];
	let originalReasoning: ReasoningComponent | undefined;
	chatHistory.update((history) => {
		return history.map((msg) => {
			if (msg.message_id === messageId && isLlmChatComponent(msg)) {
				// Store the original text before clearing it
				originalComponent = msg.components;
				originalReasoning = msg.reasoning ?? originalReasoning;

				return {
					...msg,
					components: [],
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
		const result: ActionResult = deserialize(await response.text());

		let apiRequestWithMessage: SerializedApiRequest | null = null;

		if (result.type === 'success' && result.data) {
			apiRequestWithMessage = result.data as SerializedApiRequest;
		} else if (result.type === 'failure' && result.data) {
			console.error('Failed to fetch Api request with message data');
			throw new Error('Failed to fetch Api request with message data');
		}

		if (!apiRequestWithMessage) {
			throw new Error('Failed to fetch Api request with message data');
		}

		let uri: string;
		switch (apiRequestWithMessage.apiProvider) {
			case ApiProvider.anthropic:
				uri = '/api/claude';
				break;
			case ApiProvider.openAI:
				uri = '/api/chatGPT';
				break;
			case ApiProvider.meta:
				uri = '/api/llama';
				break;
			case ApiProvider.xAI:
				uri = '/api/xAI';
				break;
			case ApiProvider.deepSeek:
				uri = '/api/deepSeek';
				break;
			default:
				uri = '/api/gemini';
		}

		const reasoningOn = apiRequestWithMessage.message?.reasoning ? true : false;
		// UUID validation function
		const isValidUUID = (uuid: string) => {
			const uuidRegex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			return uuidRegex.test(uuid);
		};

		// Only include conversationId if it's a valid UUID and user is premium
		const validConversationId =
			apiRequestWithMessage.conversationId &&
			isValidUUID(apiRequestWithMessage.conversationId)
				? apiRequestWithMessage.conversationId
				: undefined;

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

		console.log('fullPrompt: ', fullPrompt);

		const streamResponse = await fetch(uri, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				plainTextPrompt: JSON.stringify(apiRequestWithMessage.message?.prompt),
				promptStr: JSON.stringify(fullPrompt),
				modelStr: JSON.stringify(apiRequestWithMessage.apiModel),
				imagesStr: JSON.stringify(apiRequestWithMessage.message?.pictures),
				...(apiRequestWithMessage.apiProvider === ApiProvider.anthropic
					? { reasoningOn }
					: {}),
				...(validConversationId ? { conversationId: validConversationId } : {}),
				regenerateMessageId: JSON.stringify(messageId)
			})
		});

		if (!streamResponse.ok) {
			const errorData = await response.clone().json();
			// Clone the response so that we can safely read it as JSON
			if (errorData.message === 'Insufficient balance') {
				// errorPopup.showError(
				//     errorData.message,
				//     "Spending can't go below $0.10",
				//     5000,
				//     'error'
				// );
			}
			throw new Error(errorData.message || 'An error occurred');
		}

		if (!streamResponse.body) {
			throw new Error('Response body is null');
		}

		const reader = streamResponse.body.getReader();
		const decoder = new TextDecoder();
		let responseText = '';
		let reasoningText = '';
		let responseComponents: Component[] = [];
		let reasoningComponent: ReasoningComponent;
		let inputPrice: number = 0;
		let outputPrice: number = 0;

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
					} else if (data.type === 'error') {
						console.error(data.message);
						// errorPopup.showError(data.message, null, 5000, 'error');
					}

					// Update the chat history by matching message_id AND ensuring it's an LLM message
					chatHistory.update((history) =>
						history.map((msg) =>
							msg.message_id === messageId && isLlmChatComponent(msg)
								? {
										...msg,
										text: responseText,
										components: responseComponents,
										reasoning: reasoningComponent,
										input_cost: msg.input_cost + inputPrice,
										output_cost: msg.output_cost + outputPrice,
										loading: false
									}
								: msg
						)
					);
				} catch (e) {
					console.error('Error parsing stream chunk:', e);
					// Continue with the next line if one fails to parse
				}
			}
		}
	} catch (error) {
		console.error('Error regenerating message:', error);
		if (originalComponent) {
			chatHistory.update((history) => {
				return history.map((msg) => {
					if (msg.message_id === messageId && isLlmChatComponent(msg)) {
						return {
							...msg,
							components: originalComponent,
							reasoning: originalReasoning,
							loading: false
						};
					}
					return msg;
				});
			});
		}
	}
}

export function sanitizeLLmContent(content: string) {
	if (!content) return '';

	// Trim the content
	content = content.trim();

	// Replace <style>, <script>, and <html> tags with backtick-wrapped versions
	content = content.replace(/<(style|script|html)>/g, (match, p1) => `\`<${p1}>\``);
	content = content.replace(/<\/(style|script|html)>/g, (match, p1) => `\`</${p1}>\``);

	// Track all code blocks (single, double, or triple backticked content)
	const codeBlocks: any[] = [];

	// First, protect triple backticks (``` code blocks ```)
	content = content.replace(/```([\s\S]*?)```/g, (match, inner) => {
		codeBlocks.push({ type: 'triple', content: inner });
		return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
	});

	// Then, protect double backticks (`` code with ` inside ``)
	content = content.replace(/``([\s\S]*?)``/g, (match, inner) => {
		codeBlocks.push({ type: 'double', content: inner });
		return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
	});

	// Finally, protect single backticks (` simple code `)
	content = content.replace(/`([^`]+)`/g, (match, inner) => {
		codeBlocks.push({ type: 'single', content: inner });
		return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
	});

	// Now protect legitimate LaTeX expressions
	// Store block math expressions
	const blockMathExpressions: any[] = [];
	content = content.replace(/\\\[\s*([\s\S]*?)\s*\\\]/gm, (match, inner) => {
		blockMathExpressions.push(inner);
		return `__BLOCK_MATH_${blockMathExpressions.length - 1}__`;
	});

	// Store inline math expressions
	const inlineMathExpressions: any[] = [];
	content = content.replace(/\\\(\s*([\s\S]*?)\s*\\\)/gm, (match, inner) => {
		inlineMathExpressions.push(inner);
		return `__INLINE_MATH_${inlineMathExpressions.length - 1}__`;
	});

	// Escape dollar signs used for currency (when a dollar sign is followed by a number)
	content = content.replace(/\$(\d)/g, '\\$$$1');

	// Restore LaTeX expressions
	// Restore block math with proper delimiters
	content = content.replace(/__BLOCK_MATH_(\d+)__/g, (match, index) => {
		return `\n$$\n${blockMathExpressions[parseInt(index)]}\n$$\n`;
	});

	// Restore inline math with proper delimiters
	content = content.replace(/__INLINE_MATH_(\d+)__/g, (match, index) => {
		return `$${inlineMathExpressions[parseInt(index)]}$`;
	});

	// Finally restore code blocks
	content = content.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
		const block = codeBlocks[parseInt(index)];
		if (block.type === 'single') {
			return `\`${block.content}\``;
		} else if (block.type === 'double') {
			return `\`\`${block.content}\`\``;
		} else if (block.type === 'triple') {
			return `\`\`\`${block.content}\`\`\``;
		}
		return match; // Fallback
	});

	return content;
}

export function formatModelEnumToReadable(enumValue: string): string {
	// Replace underscores with spaces
	let readable = enumValue.replace(/_/g, ' ');

	// Add periods where appropriate (e.g., replace "3 5" with "3.5")
	readable = readable.replace(/(\d) (\d)/g, '$1.$2');

	return readable;
}

/**
 * Handles keyboard shortcuts for context window adjustment
 * Responds to Ctrl+[0-9] to set the number of previous messages in the context window
 * @param event - The keyboard event to process
 */
export function handleKeyboardShortcut(event: KeyboardEvent) {
	// Check if Ctrl key is pressed
	if (event.ctrlKey) {
		// Get the pressed number key (0-9)
		const num = parseInt(event.key);

		// Check if the pressed key is a number between 0 and 9
		if (!isNaN(num) && num >= 0 && num <= 9 && get(numberPrevMessages) !== num) {
			// Update numberPrevMessages
			numberPrevMessages.set(num);

			// Prevent default behavior (e.g., browser shortcuts)
			event.preventDefault();
		}
	}
}

/**
 * Saves user settings to the server via form submission
 * Serializes the settings object and sends as a POST request
 * @param userSettings - Partial user settings object to save
 * @returns Promise that resolves when the save operation completes
 */
export async function saveUserSettings(userSettings: Partial<UserSettings>) {
	try {
		const body = new FormData();
		body.append('user_settings', JSON.stringify(userSettings));

		const response = await fetch('?/saveUserSettings', {
			method: 'POST',
			body
		});
		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
		} else if (result.type === 'failure' && result.data) {
			console.error('Failed to save user settings');
		}
	} catch (error) {
		console.error('Failed to save user settings');
	}
}

export function updateChatHistoryToCopiedState(chatIndex: number, componentIndex: number): void {
	chatHistory.update((history) => {
		const newHistory: ChatComponent[] = [...history];
		if (isLlmChatComponent(newHistory[chatIndex])) {
			if (isCodeComponent(newHistory[chatIndex].components[componentIndex])) {
				newHistory[chatIndex].components[componentIndex].copied = true;
			} else {
				newHistory[chatIndex].copied = true;
			}
		}
		return newHistory;
	});

	setTimeout(() => {
		chatHistory.update((history) => {
			const newHistory: ChatComponent[] = [...history];
			if (isLlmChatComponent(newHistory[chatIndex])) {
				if (isCodeComponent(newHistory[chatIndex].components[componentIndex])) {
					newHistory[chatIndex].components[componentIndex].copied = false;
				} else {
					newHistory[chatIndex].copied = false;
				}
			}
			return newHistory;
		});
	}, 3000);
}

export function copyToClipboard(text: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (navigator.clipboard) {
			navigator.clipboard
				.writeText(text)
				.then(resolve)
				.catch((err) => {
					console.error('Failed to copy text:', err);
					reject(err);
				});
		} else {
			const textArea = document.createElement('textarea');
			textArea.value = text;
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand('copy');
				resolve();
			} catch (err) {
				console.error('Failed to copy text:', err);
				reject(err);
			} finally {
				document.body.removeChild(textArea);
			}
		}
	});
}
