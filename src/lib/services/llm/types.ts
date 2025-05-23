import type { Model } from '$lib/types/types';
import type { ApiProvider, User } from '@prisma/client';

/**
 * Represents the usage metrics for a LLM request
 */
export interface UsageMetrics {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	thinking_tokens?: number;
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
	}): Promise<any>;

	/**
	 * Handle a chunk of data from the stream
	 */
	handleStreamChunk(
		chunk: any,
		callbacks: {
			onFirstChunk: (requestId: string, conversationId: string) => void;
			onUsage: (usage: UsageMetrics) => void;
			onContent: (content: string) => void;
			onReasoning?: (content: string) => void;
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
	regenerateMessageId?: number;
	messageConversationId: string;
	originalConversationId?: string;
	referencedMessageIds: string[];
	requestId: string;
	reasoningEnabled?: boolean;
}
