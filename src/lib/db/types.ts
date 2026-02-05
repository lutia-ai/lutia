/**
 * Database Types
 * Types related to API requests, database operations, and user data
 */

import type { Prisma, ApiModel, ApiProvider, ApiRequestStatus } from '@prisma/client';
import type { SerializedMessage } from '$lib/components/chat-history/types';
import type { Image, FileAttachment } from '$lib/types/attachment';
import type { OrderedContent } from '$lib/components/chat-history/types';

// User types
export type User = {
	id: number;
	name: string;
	email: string;
	oauth?: 'google' | '';
	image?: string;
	email_verfieid?: string;
};

export type UserSignupData = {
	email: string;
	name?: string;
	password_hash?: string;
};

export type UserUpdateFields = {
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

// API Request types
export type SerializedApiRequest = {
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

// Prisma type extensions
export type ApiRequestWithMessage = Prisma.ApiRequestGetPayload<{
	include: {
		message: true;
	};
}>;

export type ApiRequestWithReferencedMessage = Prisma.ApiRequestGetPayload<{
	include: {
		message: {
			include: {
				referencedMessages: true;
				referencedBy: true;
			};
		};
	};
}>;

export type UserWithSettings = Prisma.UserGetPayload<{
	include: {
		user_settings: true;
	};
}>;

// Create/Update data types
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

// Usage and Analytics
export type UsageObject = {
	date: string;
	model: ApiModel;
	value: number;
	input_tokens: number;
	output_tokens: number;
	request_count: number;
};

export interface GptTokenUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}
