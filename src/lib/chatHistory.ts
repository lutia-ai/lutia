import type {
	ChatComponent,
	Component,
	LlmChat,
	SerializedApiRequest,
	UserChat,
	Image,
	ApiRequestWithMessage
} from '$lib/types';
import { deserialize } from '$app/forms';
import { isCodeComponent, isLlmChatComponent } from '$lib/typeGuards';
import { chatHistory, numberPrevMessages } from '$lib/stores';
import type { ActionResult } from '@sveltejs/kit';

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
		message: apiRequest.message
			? {
					id: apiRequest.message.id,
					prompt: apiRequest.message.prompt,
					response: apiRequest.message.response,
					pictures: Array.isArray(apiRequest.message.pictures)
						? (apiRequest.message.pictures as Image[])
						: []
					// Add other necessary fields from the Message entity
				}
			: null
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
			by: apiRequest.apiModel.toString(),
			text: message.response,
			input_cost: parseFloat(apiRequest.inputCost),
			output_cost: parseFloat(apiRequest.outputCost),
			price_open: false,
			loading: false,
			copied: false,
			components:
				apiRequest.message?.pictures &&
				apiRequest.message?.pictures.length > 0 &&
				apiRequest.message?.pictures[0].ai
					? [apiRequest.message?.pictures[0]]
					: components
		};

		return llmChat;
	});

	const userChats: UserChat[] = apiRequests.map(
		(apiRequest): UserChat => ({
			by: 'user',
			text: apiRequest.message?.prompt || 'No prompt available',
			image:
				apiRequest.message?.pictures &&
				apiRequest.message?.pictures.length > 0 &&
				!apiRequest.message?.pictures[0].ai
					? apiRequest.message.pictures
					: []
		})
	);

	// Interleave user and LLM messages
	chatComponents = chatComponents.flatMap((chat, index) => [userChats[index], chat]);
	return chatComponents;
}

function parseMessageContent(content: string): Component[] {
	const components: Component[] = [];
	const codeBlockRegex = /([ \t]*)```(\w+)?\n([\s\S]*?)```/g; // Match leading whitespaces before ```
	let lastIndex = 0;
	let match;

	while ((match = codeBlockRegex.exec(content)) !== null) {
		const leadingWhitespace = match[1] || ''; // Capture leading whitespaces before the code block
		const whitespaceLength = leadingWhitespace.length;

		// If there's text before the code block, capture it as a 'text' component
		if (match.index > lastIndex) {
			components.push({
				type: 'text',
				content: content.slice(lastIndex, match.index)
			});
		}

		// Normalize the code inside the block by removing leading whitespaces from each line
		const normalizedCode = match[3]
			.split('\n')
			.map((line) =>
				line.startsWith(leadingWhitespace) ? line.slice(whitespaceLength) : line
			) // Remove leading whitespaces
			.join('\n');

		// Push the code block as a 'code' component
		components.push({
			type: 'code',
			language: match[2] || 'plaintext',
			code: normalizedCode,
			copied: false,
			tabWidth: calculateTabWidth(normalizedCode),
			tabWidthOpen: false
		});

		lastIndex = match.index + match[0].length;
	}

	// If there's remaining content after the last code block, capture it as 'text'
	if (lastIndex < content.length) {
		components.push({
			type: 'text',
			content: content.slice(lastIndex)
		});
	}

	return components;
}

export function extractCodeBlock(inputString: string): string {
	const match = inputString.match(/```[a-zA-Z]+\n([\s\S]*)/);
	if (!match) {
		return '';
	}
	return match[1];
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

export function sanitizeLLmContent(content: string) {
	if (!content) return '';

	// Trim the content
	content = content.trim();

	// Replace <style>, <script>, and <html> tags with backtick-wrapped versions in one pass
	content = content.replace(/<(style|script|html)>/g, (match, p1) => `\`<${p1}>\``);

	// Replace </style>, </script>, and </html> tags with backtick-wrapped versions in one pass
	content = content.replace(/<(style|script|html)>/g, (match, p1) => `\`<${p1}>\``);

	return content;
}

export function formatModelEnumToReadable(enumValue: string): string {
	// Replace underscores with spaces
	let readable = enumValue.replace(/_/g, ' ');

	// Add periods where appropriate (e.g., replace "3 5" with "3.5")
	readable = readable.replace(/(\d) (\d)/g, '$1.$2');

	return readable;
}

export function findLastNewlineIndex(text: string): number {
	let index = text.length - 1;

	// Skip trailing spaces
	while (index >= 0 && text[index] === ' ') {
		index--;
	}

	// Find the last non-newline character
	while (index >= 0 && text[index] === 'n') {
		index--;
	}

	// Return the index right after the last newline
	return index + 1;
}

export function countLeadingWhitespaces(text: string): number {
	// Split the text into an array of lines
	const lines = text.split('\n');

	// Get the last non-empty line (remove any empty or whitespace-only lines)
	const lastNonEmptyLine = lines.reverse().find((line) => line.trim() !== '') || '';

	// Count leading whitespaces in the last non-empty line
	const leadingWhitespaces = lastNonEmptyLine.match(/^\s*/)?.[0].length || 0;

	return leadingWhitespaces;
}

export function handleKeyboardShortcut(event: KeyboardEvent) {
	// Check if Ctrl key is pressed
	if (event.ctrlKey) {
		// Get the pressed number key (0-9)
		const num = parseInt(event.key);

		// Check if the pressed key is a number between 0 and 9
		if (!isNaN(num) && num >= 0 && num <= 9) {
			// Update numberPrevMessages
			numberPrevMessages.set(num);

			// Prevent default behavior (e.g., browser shortcuts)
			event.preventDefault();
		}
	}
}
