import type {
	ChatComponent,
	Component,
	LlmChat,
	SerializedApiRequest,
	UserChat,
	Image,
	ApiRequestWithMessage,
	PromptHelpers,
	PromptHelper
} from '$lib/types';
import { deserialize } from '$app/forms';
import { isCodeComponent, isLlmChatComponent } from '$lib/typeGuards';
import { chatHistory, numberPrevMessages } from '$lib/stores';
import type { ActionResult } from '@sveltejs/kit';
import type { UserSettings } from '@prisma/client';
import { get } from 'svelte/store';

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

		const components: Component[] = initParseMessageContent(message.response);

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

function initParseMessageContent(content: string): Component[] {
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

export function handleKeyboardShortcut(
	event: KeyboardEvent,
	userSettings: Partial<UserSettings> | null
) {
	// Check if Ctrl key is pressed
	if (event.ctrlKey) {
		// Get the pressed number key (0-9)
		const num = parseInt(event.key);

		// Check if the pressed key is a number between 0 and 9
		if (!isNaN(num) && num >= 0 && num <= 9 && get(numberPrevMessages) !== num) {
			// Update numberPrevMessages
			numberPrevMessages.set(num);
			saveUserSettings(userSettings ?? {});

			// Prevent default behavior (e.g., browser shortcuts)
			event.preventDefault();
		}
	}
}

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

export function getRandomPrompts(promptHelpers: PromptHelpers): {
	createImage: PromptHelper;
	compose: PromptHelper;
	question: PromptHelper;
} {
	const getRandomItem = <T>(array: T[]): T => {
		return array[Math.floor(Math.random() * array.length)];
	};

	return {
		createImage: getRandomItem(promptHelpers.createImage),
		compose: getRandomItem(promptHelpers.compose),
		question: getRandomItem(promptHelpers.question)
	};
}
