import { modelDictionary } from '$lib/modelDictionary';
import type {
	Message,
	ChatComponent,
	CodeComponent,
	TextComponent,
	Component,
	LlmChat,
	UserChat,
	ModelDictionary,
	Model
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

/** Checks if a single object matches the Message shape */
export function isValidMessage(obj: any): obj is Message {
	if (!obj || typeof obj !== 'object') return false;

	// Check the `role`
	const validRoles = ['user', 'assistant', 'developer', 'system'];
	if (!validRoles.includes(obj.role)) return false;

	// Check the `content`
	// content can be either a string or an array of objects
	const contentType = typeof obj.content;
	if (contentType !== 'string') {
		// If not a string, it should be an array
		if (!Array.isArray(obj.content)) return false;
		// Optionally, check if each element is an object
		// (depends on how strict you want to be)
		for (const item of obj.content) {
			if (typeof item !== 'object') {
				return false;
			}
		}
	}

	return true;
}

/** Checks if an array of objects matches Message[] */
export function isValidMessageArray(data: any): data is Message[] {
	if (!Array.isArray(data)) return false;
	for (const item of data) {
		if (!isValidMessage(item)) return false;
	}
	return true;
}

// Helper function to check if a model belongs to a specific company
export function isModelByCompany(company: keyof ModelDictionary, modelName: string): boolean {
	return Object.values(modelDictionary[company].models).some(
		(model) => (model as Model).name === modelName
	);
}

export function isModelAnthropic(modelName: string): boolean {
	return isModelByCompany('anthropic', modelName);
}

export function isModelOpenAI(modelName: string): boolean {
	return isModelByCompany('openAI', modelName);
}

export function isModelGoogle(modelName: string): boolean {
	return isModelByCompany('google', modelName);
}

export function isModelMeta(modelName: string): boolean {
	return isModelByCompany('meta', modelName);
}

export function isModelXAI(modelName: string): boolean {
	return isModelByCompany('xAI', modelName);
}

export function isModelDeepSeek(modelName: string): boolean {
	return isModelByCompany('deepSeek', modelName);
}
