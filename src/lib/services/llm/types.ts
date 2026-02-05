import type { ToolUseCallback } from '$lib/services/llm/tool-types';

// Provider-specific image formats
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

/**
 * Represents the usage metrics for a LLM request
 */
export interface UsageMetrics {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	thinking_tokens?: number;
	web_search?: boolean;
}

/**
 * Image pricing result interface
 */
export interface ImagePricingResult {
	tokens: number;
	cost: number;
}

/**
 * Interface for LLM providers
 */
export interface LLMProvider {
	/**
	 * Initialize the provider's client
	 */
	initializeClient(): any;

	/**
	 * Process messages for the provider's specific format
	 * Different providers may return different formats
	 */
	processMessages(messages: any[], images: any[], files: any[]): any;

	/**
	 * Create a streaming completion request
	 */
	createCompletionStream(config: {
		model: any;
		messages: any;
		reasoningEnabled?: boolean;
		webSearchEnabled?: boolean;
	}): Promise<any>;

	/**
	 * Handle a chunk of data from the stream
	 */
	handleStreamChunk(
		chunk: any,
		callbacks: {
			onFirstChunk: (requestId: string) => void;
			onUsage: (usage: UsageMetrics) => void;
			onContent: (content: string) => void;
			onReasoning?: (content: string) => void;
			onToolUse?: ToolUseCallback;
		}
	): void;
}

/**
 * Factory interface for creating LLM providers
 */
export interface LLMProviderFactory {
	getProvider(apiProvider: any): LLMProvider;
}

/**
 * Configuration for LLM request
 */
export interface LLMRequestConfig {
	user: any;
	model: any;
	messages: any[];
	plainText: string;
	images: any[];
	files: any[];
	apiProvider: any;
	regenerateMessageId?: string;
	messageConversationId: string;
	originalConversationId?: string;
	referencedMessageIds: string[];
	requestId: string;
	reasoningEnabled?: boolean;
	webSearchEnabled?: boolean;
}
