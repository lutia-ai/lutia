import type { PaymentTier, ApiModel, Prisma } from '@prisma/client';
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

export type ReasoningComponent = {
	type: 'reasoning';
	content: string;
};

export type Component = CodeComponent | TextComponent | Image | ReasoningComponent;

export type LlmChat = {
	message_id?: number;
	by: string;
	text: string;
	input_cost: number;
	output_cost: number;
	price_open: boolean;
	loading: boolean;
	copied: boolean;
	components: Component[];
	reasoning?: ReasoningComponent;
};

export type UserChat = {
	message_id?: number;
	by: string;
	text: string;
	attachments?: Attachment[];
};

export type ChatComponent = LlmChat | UserChat;

export type Model = {
	name: ApiModel;
	param: string;
	legacy: boolean;
	input_price: number;
	output_price: number;
	context_window: number;
	max_tokens?: number;
	hub: string;
	handlesImages: boolean;
	maxImages: number;
	generatesImages: boolean;
	reasons: boolean;
	extendedThinking: boolean;
	description: string;
	max_input_per_request: number;
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
	message_id?: number;
	role: 'user' | 'assistant' | 'developer' | 'system';
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

export type FileAttachment = {
	type: 'file';
	data: string;
	media_type: string;
	filename: string;
	file_extension: string;
	size: number;
};

export type Attachment = Image | FileAttachment;

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
	reasoning: string;
	pictures: Image[];
	files: FileAttachment[];
	referencedMessages: SerializedMessage[];
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
	conversationId: string | null;
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
	input_tokens: number;
	output_tokens: number;
	request_count: number;
};

type Company = 'openAI' | 'anthropic' | 'google' | 'xAI' | 'deepSeek';

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

type ApiRequestWithReferencedMessage = Prisma.ApiRequestGetPayload<{
	include: {
		message: {
			include: {
				referencedMessages: true;
				referencedBy: true; // Optional: include if you want messages that reference this one
			};
		};
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

export type TransactionRecord = {
	id: string;
	amount: number;
	date: Date;
	description: string;
	status: string;
};

export interface GptTokenUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

export interface CreateMessageData {
	prompt: string;
	response: string;
	pictures: Image[];
	files: FileAttachment[];
	reasoning?: string;
	referencedMessageIds?: number[];
}

export interface CreateApiRequestData {
	userId: number;
	apiProvider: ApiProvider;
	apiModel: ApiModel;
	inputTokens: number;
	inputCost: number;
	outputTokens: number;
	outputCost: number;
	totalCost: number;
	requestId: string;
	status: ApiRequestStatus;
	conversationId?: string;
	error?: string;
}
