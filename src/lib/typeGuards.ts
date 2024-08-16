import type {
	ChatComponent,
	CodeComponent,
	TextComponent,
	Component,
	LlmChat,
	UserChat
} from '$lib/types';

export function isCodeComponent(component: Component): component is CodeComponent {
	return component.type === 'code';
}

export function isTextComponent(component: Component): component is TextComponent {
	return component.type === 'text';
}

export function isLlmChatComponent(component: ChatComponent): component is LlmChat {
	// This guard checks if the component is an LlmChat type
	return (component as LlmChat).input_cost !== undefined;
}

export function isUserChatComponent(component: ChatComponent): component is UserChat {
	// This guard checks if the component is a UserChat type
	return (component as UserChat).by !== undefined && (component as UserChat).text !== undefined;
}
