import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/models/types';
import type { ToolUseCallback, WebSearchData, WebSearchResult } from '$lib/services/llm/tool-types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for OpenAI
 */
export class OpenAIProvider implements LLMProvider {
	// Track collected annotations for web search results
	private collectedAnnotations: any[] = [];
	// Track if first chunk has been sent
	private firstChunkSent: boolean = false;
	// Track if web search is enabled for this request
	private webSearchEnabled: boolean = false;

	/**
	 * Initialize the OpenAI client
	 */
	initializeClient() {
		return new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });
	}

	/**
	 * Process messages according to OpenAI requirements
	 */
	processMessages(messages: any[], images: any[], files: any[]) {
		let processedMessages = [...messages];

		if (images.length > 0) {
			// Format images for OpenAI
			const textContent = processedMessages[processedMessages.length - 1].content;
			const gptImages = images.map((image) => ({
				type: 'image_url',
				image_url: {
					url: image.data
				}
			}));

			// Replace the string content with an array of content parts
			processedMessages[processedMessages.length - 1].content = [
				{ type: 'text', text: textContent },
				...gptImages
			];
		}

		if (files.length > 0) processedMessages = addFilesToMessage(processedMessages, files);

		// Clean messages by removing message_id fields
		return processedMessages.map(({ message_id, ...rest }) => rest);
	}

	/**
	 * Create a streaming completion request
	 */
	async createCompletionStream({
		model,
		messages,
		reasoningEnabled,
		webSearchEnabled = false
	}: {
		model: Model;
		messages: any;
		reasoningEnabled?: boolean;
		webSearchEnabled?: boolean;
	}) {
		const client = this.initializeClient();

		// Reset collected annotations for this stream
		this.collectedAnnotations = [];
		this.firstChunkSent = false;

		// Store web search enabled state for this request
		this.webSearchEnabled = webSearchEnabled && model.web_search;

		try {
			// Determine if we should use web search models
			const useWebSearch = webSearchEnabled && model.web_search;

			const requestConfig: any = {
				model: model.param,
				input: messages,
				stream: true
			};

			// Add reasoning if supported and enabled
			if (model.reasons && reasoningEnabled) {
				requestConfig.reasoning = { effort: 'medium' };
			}

			// Add web search tools if enabled and supported
			if (useWebSearch) {
				requestConfig.tools = [
					{
						type: 'web_search_preview'
					}
				];
			}

			return await client.responses.create(requestConfig);
		} catch (err) {
			console.error('[OpenAI Provider] Error creating stream:', err);
			throw err;
		}
	}

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
	) {
		// Handle responses API streaming format
		if (chunk.type === 'response.output_text.delta') {
			// Call onFirstChunk for the first content delta
			if (chunk.delta && !this.firstChunkSent) {
				callbacks.onFirstChunk(crypto.randomUUID());
				this.firstChunkSent = true;
			}
			const content = chunk.delta || '';
			if (content) {
				callbacks.onContent(content);
			}
			return;
		}

		if (chunk.type === 'response.reasoning.delta') {
			const reasoningContent = chunk.delta || '';
			if (reasoningContent && callbacks.onReasoning) {
				callbacks.onReasoning(reasoningContent);
			}
			return;
		}

		if (chunk.type === 'response.web_search_call.in_progress') {
			// Only process web search chunks if web search is enabled
			if (this.webSearchEnabled && callbacks.onToolUse) {
				callbacks.onToolUse('web_search', undefined);
			}
		}

		if (chunk.type === 'response.content_part.done') {
			if (chunk.part.type === 'output_text' && this.webSearchEnabled && callbacks.onToolUse) {
				// Handle web search results - this will update the existing tool use entry
				const searchResults = chunk.part.annotations;
				if (searchResults && Array.isArray(searchResults)) {
					const formattedResults = searchResults.map((result: any) => ({
						type: result.type,
						title: result.title,
						url: result.url
					}));

					// Pass the results to update the existing tool use entry
					callbacks.onToolUse('web_search', {
						results: formattedResults,
						totalResults: formattedResults.length
					});
				}
			}
		}

		if (chunk.type === 'response.completed') {
			// Handle completion
			if (chunk.response?.usage) {
				const usage: UsageMetrics = {
					prompt_tokens: chunk.response.usage.input_tokens || 0,
					completion_tokens: chunk.response.usage.output_tokens || 0,
					total_tokens: chunk.response.usage.total_tokens || 0
				};
				callbacks.onUsage(usage);
			}
			return;
		}

		// Fallback for chat completions API format (if mixed usage)
		const isFirstContentChunk = chunk.choices?.[0]?.index === 0;
		const content = chunk.choices?.[0]?.delta?.content || '';
		const reasoningContent = chunk.choices?.[0]?.delta?.reasoning_content || '';

		// Call onFirstChunk for first message chunk
		if (isFirstContentChunk || (!content && !reasoningContent && !chunk.usage)) {
			callbacks.onFirstChunk(crypto.randomUUID());
		}

		if (chunk.usage) {
			const usage: UsageMetrics = {
				prompt_tokens: chunk.usage.prompt_tokens,
				completion_tokens: chunk.usage.completion_tokens,
				total_tokens: chunk.usage.total_tokens
			};
			callbacks.onUsage(usage);
		}

		if (content) {
			callbacks.onContent(content);
		}

		if (reasoningContent && callbacks.onReasoning) {
			callbacks.onReasoning(reasoningContent);
		}
	}
}
