/**
 * Chat History Types
 * Types related to chat messages, components, and content structures
 */

import type { Image, FileAttachment, Attachment } from '$lib/types/attachment';

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

export type Message = {
	message_id?: number;
	role: 'user' | 'assistant' | 'developer' | 'system';
	content: string | Object[];
};

export type ChatCompletionMessageParam = {
	role: 'user' | 'assistant';
	content: string;
};

export type SerializedMessage = {
	id: number;
	prompt: string;
	pictures: Image[];
	files: FileAttachment[];
	orderedContent?: OrderedContent;
	referencedMessages: SerializedMessage[];
};
