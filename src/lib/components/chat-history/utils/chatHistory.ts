import type {
	ChatComponent,
	Component,
	LlmChat,
	SerializedApiRequest,
	UserChat,
	Image,
	ApiRequestWithMessage,
	SerializedMessage,
	FileAttachment,
	Attachment
} from '$lib/types/types';
import { deserialize } from '$app/forms';
import { chatHistory, numberPrevMessages } from '$lib/stores';
import type { ActionResult } from '@sveltejs/kit';
import { type Message, type UserSettings } from '@prisma/client';
import { get } from 'svelte/store';
import { calculateTabWidth } from '$lib/components/chat-history/utils/codeContainerUtils';

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

/**
 * Processes HTML content to make all links open in a new tab
 * @param html The HTML content to process
 * @returns The processed HTML with all links set to open in new tabs
 */
export function processLinks(html: string | Promise<string>): string | Promise<string> {
	if (!html) return '';

	if (html instanceof Promise) {
		return html.then((content) => {
			if (!content) return '';
			// Add target="_blank" and rel="noopener noreferrer" to all links
			return content.replace(/<a(.*?)>/g, '<a$1 target="_blank" rel="noopener noreferrer">');
		});
	}

	// Add target="_blank" and rel="noopener noreferrer" to all links
	return html.replace(/<a(.*?)>/g, '<a$1 target="_blank" rel="noopener noreferrer">');
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
