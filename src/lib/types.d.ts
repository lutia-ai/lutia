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
	image?: Image[];
};

export type ChatComponent = LlmChat | UserChat;

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

export type UserSignupData = {
	email: string;
	name?: string;
	password_hash?: string;
};

export type ChatCompletionMessageParam = {
	role: 'user' | 'assistant';
	content: string;
};

export type Message = {
	role: 'user' | 'assistant';
	content: string | Object[];
};

export type Image = {
	data: string;
	media_type: string;
};

export type ChatGPTImage = {
	type: 'image_url';
	image_url: {
		url: string;
	};
};

export type ClaudeImage = {
	type: 'image';
	source: {
		type: 'base64';
		media_type: string;
		data: string;
	};
};

export type GeminiImage = {
	inlineData: {
		data: string;
		mimeType: string;
	};
};
