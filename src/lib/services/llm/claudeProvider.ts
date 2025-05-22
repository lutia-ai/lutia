import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import type { ClaudeImage } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for Anthropic/Claude
 */
export class ClaudeProvider implements LLMProvider {
	// Track tokens for proper cost calculation
	private inputTokens: number = 0;
	private outputTokens: number = 0;

	/**
	 * Initialize the Anthropic client
	 */
	initializeClient() {
		return new Anthropic({ apiKey: env.VITE_ANTHROPIC_API_KEY });
	}

	/**
	 * Process messages according to Claude requirements
	 */
	processMessages(messages: any[], images: any[], files: any[]) {
		let processedMessages = [...messages];

		if (images.length > 0) {
			const textObject = {
				type: 'text',
				text: processedMessages[processedMessages.length - 1].content
			};
			const claudeImages: ClaudeImage[] = images.map((image) => ({
				type: 'image',
				source: {
					type: 'base64',
					media_type: image.media_type,
					data: image.data.split(',')[1]
				}
			}));
			processedMessages[processedMessages.length - 1].content = [textObject, ...claudeImages];
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
		reasoningEnabled
	}: {
		model: Model;
		messages: any[];
		reasoningEnabled?: boolean;
	}) {
		const client = this.initializeClient();

		const budget_tokens = 16000;
		const max_tokens =
			reasoningEnabled && model.reasons
				? model.max_tokens! + budget_tokens
				: model.max_tokens!;

		// Anthropic requires special handling for system messages
		const hasSystemMessage = messages.length > 0 && messages[0].role === 'system';
		const systemMessage = hasSystemMessage ? messages[0].content : undefined;
		const messageContent = hasSystemMessage ? messages.slice(1) : messages;

		// Reset token counters for this stream
		this.inputTokens = 0;
		this.outputTokens = 0;

		return await client.messages.stream({
			...(systemMessage ? { system: systemMessage } : {}),
			messages: messageContent,
			model: model.param,
			max_tokens: max_tokens,
			...(reasoningEnabled && model.reasons
				? {
						thinking: {
							type: 'enabled',
							budget_tokens
						}
					}
				: {})
		});
	}

	/**
	 * Handle a chunk of data from the stream
	 */
	handleStreamChunk(
		chunk: any,
		callbacks: {
			onFirstChunk: (requestId: string, conversationId: string) => void;
			onUsage: (usage: UsageMetrics, model: any) => void;
			onContent: (content: string) => void;
			onReasoning?: (content: string) => void;
		}
	) {
		if (chunk.type === 'message_start') {
			// Store input tokens when we first get them
			this.inputTokens = chunk.message.usage.input_tokens || 0;

			const usage: UsageMetrics = {
				prompt_tokens: this.inputTokens,
				completion_tokens: this.outputTokens,
				total_tokens: this.inputTokens + this.outputTokens
			};

			callbacks.onUsage(usage, {
				input_price: 0.000033,
				output_price: 0.000132
			});
		} else if (chunk.type === 'message_delta') {
			// Update output tokens as they come in
			this.outputTokens = chunk.usage.output_tokens || 0;

			const usage: UsageMetrics = {
				prompt_tokens: this.inputTokens,
				completion_tokens: this.outputTokens,
				total_tokens: this.inputTokens + this.outputTokens
			};

			callbacks.onUsage(usage, {
				input_price: 0.000033,
				output_price: 0.000132
			});
		} else if (chunk.type === 'content_block_delta') {
			if (chunk.delta.type === 'thinking_delta' && callbacks.onReasoning) {
				const thinkingContent = chunk.delta?.thinking || '';
				callbacks.onReasoning(thinkingContent);
			} else if (chunk.delta.type === 'text_delta') {
				const content = chunk.delta?.text || '';
				if (content) {
					callbacks.onContent(content);
				}
			}
		}

		// Call onFirstChunk for any first chunk
		if (chunk.type === 'message_start') {
			callbacks.onFirstChunk(crypto.randomUUID(), '');
		}
	}
}
