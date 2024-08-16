export type TextComponent = {
	type: 'text';
	content: string;
};

export type CodeComponent = {
	type: 'code';
	language: string;
	code: string;
	copied: boolean;
	tabWidth: number;
	tabWidthOpen: boolean;
};

export function isCodeComponent(component: Component): component is CodeComponent {
	return component.type === 'code';
}

export type Component = CodeComponent | TextComponent;

export type LlmChat = {
	by: string;
	text: string;
	input_cost: number;
	output_cost: number;
	price_open: boolean;
	loading: boolean;
	copied: boolean;
	components: Component[];
};

export type UserChat = {
	by: string;
	text: string;
};

export type ChatComponent = LlmChat | UserChat;

export type FullPrompt = {
	prevMessages?: { by: string; text: string }[];
	prompt: string;
};

export type Model = {
	name: string;
	param: string;
    legacy: boolean;
	input_price: number;
	output_price: number;
	context_window: number;
	hub: string;
};

interface ModelDetails {
	logo: any;
	models: Record<Model>;
}

export type ModelDictionary = Record<string, ModelDetails>;
