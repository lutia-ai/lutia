import type {
	Message,
	ChatComponent,
	CodeComponent,
	TextComponent,
	Component,
	LlmChat,
	UserChat,
	ToolUseComponent
} from '$lib/components/chat-history/types';

/**
 * Checks if a component is a code block
 */
export function isCodeComponent(component: Component): component is CodeComponent {
	return component.type === 'code';
}

/**
 * Checks if a component is a text block
 */
export function isTextComponent(component: Component): component is TextComponent {
	return component.type === 'text';
}

/**
 * Checks if a component is a tool use block
 */
export function isToolUseComponent(component: Component): component is ToolUseComponent {
	return component.type === 'tool_use';
}

/**
 * Checks if a chat component is an LLM response
 */
export function isLlmChatComponent(component: ChatComponent): component is LlmChat {
	return (component as LlmChat).input_cost !== undefined;
}

/**
 * Checks if a chat component is a user message
 */
export function isUserChatComponent(component: ChatComponent): component is UserChat {
	return (component as UserChat).by !== undefined && (component as UserChat).text !== undefined;
}

/**
 * Checks if a single object matches the Message shape
 */
export function isValidMessage(obj: any): obj is Message {
	if (!obj || typeof obj !== 'object') return false;

	const validRoles = ['user', 'assistant', 'developer', 'system'];
	if (!validRoles.includes(obj.role)) return false;

	const contentType = typeof obj.content;
	if (contentType !== 'string') {
		if (!Array.isArray(obj.content)) return false;
		for (const item of obj.content) {
			if (typeof item !== 'object') {
				return false;
			}
		}
	}

	return true;
}

/**
 * Checks if an array of objects matches Message[]
 */
export function isValidMessageArray(data: any): data is Message[] {
	if (!Array.isArray(data)) return false;
	for (const item of data) {
		if (!isValidMessage(item)) return false;
	}
	return true;
}
