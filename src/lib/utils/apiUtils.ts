import type { Model } from '$lib/models/types';
import type { Message } from '$lib/components/chat-history/types';
import { ApiProvider } from '@prisma/client';

/**
 * UUID validation function
 * @param uuid String to validate as UUID
 * @returns boolean indicating if string is valid UUID
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

/**
 * Prepare conversation ID for API requests
 * @param conversationId Raw conversation ID
 * @returns Valid conversation ID or undefined
 */
export function prepareConversationId(
	conversationId: string | null | undefined
): string | undefined {
	return conversationId && isValidUUID(conversationId) ? conversationId : undefined;
}

/**
 * Cost calculation utilities
 */
export class CostCalculator {
	/**
	 * Calculate input cost for a model
	 * @param tokens Number of input tokens
	 * @param model Model object with pricing
	 * @returns Cost in dollars
	 */
	static calculateInputCost(tokens: number, model: Model): number {
		if (isNaN(tokens * model.input_price)) return 0;
		return (tokens * model.input_price) / 1000000;
	}

	/**
	 * Calculate output cost for a model
	 * @param tokens Number of output tokens
	 * @param model Model object with pricing
	 * @returns Cost in dollars
	 */
	static calculateOutputCost(tokens: number, model: Model): number {
		if (isNaN(tokens * model.output_price)) return 0;
		return (tokens * model.output_price) / 1000000;
	}

	/**
	 * Calculate total cost for input and output tokens
	 * @param inputTokens Number of input tokens
	 * @param outputTokens Number of output tokens
	 * @param model Model object with pricing
	 * @returns Object with input, output, and total costs
	 */
	static calculateTotalCost(
		inputTokens: number,
		outputTokens: number,
		model: Model
	): {
		inputCost: number;
		outputCost: number;
		totalCost: number;
	} {
		const inputCost = this.calculateInputCost(inputTokens, model);
		const outputCost = this.calculateOutputCost(outputTokens, model);
		return {
			inputCost,
			outputCost,
			totalCost: inputCost + outputCost
		};
	}
}

/**
 * Standard API request builder for LLM requests
 */
export class ApiRequestBuilder {
	private requestBody: Record<string, any> = {};

	/**
	 * Set the basic prompt and model information
	 */
	setPromptData(plainTextPrompt: string, promptStr: string | Message[], modelStr: string): this {
		this.requestBody.plainTextPrompt = JSON.stringify(plainTextPrompt);
		this.requestBody.promptStr = JSON.stringify(promptStr);
		this.requestBody.modelStr = JSON.stringify(modelStr);
		return this;
	}

	/**
	 * Set attachments (images and files)
	 */
	setAttachments(images: any[], files: any[]): this {
		this.requestBody.imagesStr = JSON.stringify(images);
		this.requestBody.filesStr = JSON.stringify(files);
		return this;
	}

	/**
	 * Set the API provider
	 */
	setProvider(provider: string): this {
		this.requestBody.provider = provider;
		return this;
	}

	/**
	 * Set reasoning flag (only for supported providers)
	 */
	setReasoning(provider: string, reasoning: boolean): this {
		if (provider === 'anthropic') {
			this.requestBody.reasoningOn = reasoning;
		}
		return this;
	}

	/**
	 * Set web search flag (only for supported providers)
	 */
	setWebSearch(provider: string, webSearch: boolean): this {
		if (provider === ApiProvider.anthropic || provider === ApiProvider.openAI) {
			this.requestBody.webSearchOn = webSearch;
		}
		return this;
	}

	/**
	 * Set conversation ID if valid
	 */
	setConversationId(conversationId: string | null | undefined): this {
		const validId = prepareConversationId(conversationId);
		if (validId) {
			this.requestBody.conversationId = validId;
		}
		return this;
	}

	/**
	 * Build the final request body
	 */
	build(): Record<string, any> {
		return { ...this.requestBody };
	}
}

/**
 * Standard error handling for API responses
 */
export class ApiErrorHandler {
	/**
	 * Handle API response errors
	 * @param response Fetch response
	 * @param onInsufficientBalance Callback for insufficient balance errors
	 * @returns Promise that throws appropriate error
	 */
	static async handleApiError(
		response: Response,
		onInsufficientBalance?: () => void
	): Promise<never> {
		const errorData = await response.clone().json();

		console.error(`[API Error] Error response:`, errorData);

		if (errorData.message === 'Insufficient balance') {
			onInsufficientBalance?.();
			throw new Error("Spending can't go below $0.10");
		}

		throw new Error(errorData.message || 'An error occurred');
	}

	/**
	 * Validate response and throw if not ok
	 * @param response Fetch response
	 * @param onInsufficientBalance Callback for insufficient balance errors
	 */
	static async validateResponse(
		response: Response,
		onInsufficientBalance?: () => void
	): Promise<void> {
		if (!response.ok) {
			await this.handleApiError(response, onInsufficientBalance);
		}

		if (!response.body) {
			throw new Error('Response body is null');
		}
	}
}

/**
 * Utility for consistent fetch requests to LLM endpoints
 */
export async function createLLMRequest(
	endpoint: string,
	requestBody: Record<string, any>
): Promise<Response> {
	return fetch(endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(requestBody)
	});
}
