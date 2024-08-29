import type {
	ChatComponent,
	Component,
	LlmChat,
	SerializedApiRequest,
	UserChat,
	Image
} from '$lib/types';
import { deserialize } from '$app/forms';
import type { ApiRequest } from '$lib/db/entities/ApiRequest';
import { isCodeComponent, isLlmChatComponent } from '$lib/typeGuards';
import { chatHistory } from '$lib/stores';
import type { ActionResult } from '@sveltejs/kit';

export function serializeApiRequest(apiRequest: ApiRequest): SerializedApiRequest {
	return {
		id: apiRequest.id,
		apiProvider: apiRequest.apiProvider,
		apiModel: apiRequest.apiModel,
		requestTimestamp: apiRequest.requestTimestamp.toISOString(),
		inputTokens: apiRequest.inputTokens,
		inputCost: apiRequest.inputCost.toString(),
		outputTokens: apiRequest.outputTokens,
		outputCost: apiRequest.outputCost.toString(),
		totalCost: apiRequest.totalCost.toString(),
		message: apiRequest.message
			? {
					id: apiRequest.message.id,
					prompt: apiRequest.message.prompt,
					response: apiRequest.message.response,
					pictures: apiRequest.message.pictures ? apiRequest.message.pictures : []
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
			components: components
		};

		return llmChat;
	});

	const userChats: UserChat[] = apiRequests.map(
		(apiRequest): UserChat => ({
			by: 'user',
			text: apiRequest.message?.prompt || 'No prompt available',
			image: apiRequest.message?.pictures ? apiRequest.message.pictures : []
		})
	);

	// Interleave user and LLM messages
	chatComponents = chatComponents.flatMap((chat, index) => [userChats[index], chat]);
	return chatComponents;
}

function parseMessageContent(content: string): Component[] {
	const components: Component[] = [];
	const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
	let lastIndex = 0;
	let match;

	while ((match = codeBlockRegex.exec(content)) !== null) {
		if (match.index > lastIndex) {
			components.push({
				type: 'text',
				content: content.slice(lastIndex, match.index)
			});
		}

		components.push({
			type: 'code',
			language: match[1] || 'plaintext',
			code: match[2],
			copied: false,
			tabWidth: calculateTabWidth(match[2]),
			tabWidthOpen: false
		});

		lastIndex = match.index + match[0].length;
	}

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
