import type { ApiModel, Prisma } from '@prisma/client';
import type { DataSource } from 'typeorm';

export type TextComponent = {
	type: 'text';
	content: string;
};

export type CodeComponent = {
	type: 'code';
	language: string;
	code: string;
	copied: boolean;
	tabWidth?: number;
	tabWidthOpen?: boolean;
};

export type Component = CodeComponent | TextComponent | Image;

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
	name: ApiModel;
	param: string;
	legacy: boolean;
	input_price: number;
	output_price: number;
	context_window: number;
	hub: string;
	handlesImages: boolean;
	maxImages: number;
	generatesImages: boolean;
};

export type ModelLogos = Record<string, { logo: any }>;

interface ModelDetails {
	models: Record<Model>;
}

export type ModelDictionary = Record<ApiProvider, ModelDetails>;

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
	type: 'image';
	data: string;
	media_type: string;
	width: number;
	height: number;
	ai?: boolean;
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

type SerializedMessage = {
	id: number;
	prompt: string;
	response: string;
	pictures: Image[];
};

type SerializedApiRequest = {
	id: number;
	apiProvider: string;
	apiModel: string;
	requestTimestamp: string;
	inputTokens: number;
	inputCost: string;
	outputTokens: number;
	outputCost: string;
	totalCost: string;
	message: SerializedMessage | null;
};

type User = {
	id: number;
	name: string;
	email: string;
	oauth?: 'google' | '';
	image?: string;
	email_verfieid?: string;
};

type UserUpdateFields = {
	name?: string;
	email?: string;
	password_hash?: string;
	oauth?: '' | 'google';
	oauth_link_token?: string;
	reset_password_token?: string;
	reset_expiration?: Date;
	email_verified?: boolean;
	email_code?: number;
};

type UsageObject = {
	date: string;
	model: ApiModel;
	value: number;
};

type Company = 'openAI' | 'anthropic' | 'google' | 'xAI';

declare global {
	namespace App {
		interface Locals {
			colorScheme: string;
		}
	}
}

// Define the type for ApiRequest including the message relation
type ApiRequestWithMessage = Prisma.ApiRequestGetPayload<{
	include: {
		message: true;
	};
}>;

// Define the type for User including the user_settings relation
type UserWithSettings = Prisma.UserGetPayload<{
	include: {
		user_settings: true;
	};
}>;

export type ElementsContext = {
	elements: StripeElements;
	stripe: Stripe;
};

export type CardDetails = {
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
};

export type ChargeResult = {
	success: boolean;
	chargeId?: string;
	error?: string;
};

export type PromptHelper = {
	prompt: string;
	icon: IconType;
};

export type PromptHelpers = {
	createImage: PromptHelper[];
	compose: PromptHelper[];
	question: PromptHelper[];
};
