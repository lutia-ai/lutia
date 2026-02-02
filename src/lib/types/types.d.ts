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

export type ToolUseComponent = {
	type: 'tool_use';
	tool_name: string;
	tool_data?: any;
	content: string;
	timestamp?: number;
};

export type ContentItem = {
	type: 'text' | 'tool_use' | 'reasoning';
	content: string;
	metadata?: {
		tool_name?: string;
		tool_data?: any;
		timestamp?: number;
	};
	order: number;
};

export type OrderedContent = ContentItem[];

export type Component =
	| CodeComponent
	| TextComponent
	| Image
	| ReasoningComponent
	| ToolUseComponent;

export type LlmChat = {
	message_id?: number;
	by: string;
	text: string;
	input_cost: number;
	output_cost: number;
	web_search_cost?: number;
	price_open: boolean;
	loading: boolean;
	copied: boolean;
	components: Component[];
	orderedContent?: OrderedContent;
	reasoning?: ReasoningComponent;
	toolInProgress?: boolean;
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
	param: string; // The model name used in the API call
	legacy: boolean; // Whether the model is legacy (not the latest version)
	input_price: number; // The price per input 1m tokens
	output_price: number; // The price per output 1m tokens
	context_window: number; // The maximum number of tokens that can be inputted in a single request
	max_tokens?: number; // The maximum number of tokens that can be outputted in a single request
	handlesImages: boolean; // Whether the model can handle images
	maxImages: number; // The maximum number of images that can be inputted in a single request
	generatesImages: boolean; // Whether the model can generate images
	reasons: boolean; // Whether the model can generate reasoning
	extendedThinking: boolean; // Whether the model can generate extended thinking
	description: string; // A description of the model
	max_input_per_request: number; // The maximum number of tokens that can be inputted in a single request
	web_search: boolean; // Whether the model can use web search
	web_search_price?: number; // The price per web search
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
	pictures: Image[];
	files: FileAttachment[];
	orderedContent?: OrderedContent;
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
	webSearchCost: string;
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
	pictures: Image[];
	files: FileAttachment[];
	orderedContent?: OrderedContent;
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
	webSearchCost?: number;
	totalCost: number;
	requestId: string;
	status: ApiRequestStatus;
	conversationId?: string;
	error?: string;
}

// Tool usage types
export type WebSearchResult = {
	type: string;
	title: string;
	url: string;
	page_age: string | null;
	hasContent: boolean;
};

export type WebSearchData = {
	results: WebSearchResult[];
	totalResults: number;
};

export type ToolData = WebSearchData | any; // Allow for future tool types

export type ToolUseCallback = (toolName: string, toolData: ToolData) => void;
