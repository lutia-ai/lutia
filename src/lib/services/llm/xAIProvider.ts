import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for xAI (Grok)
 *
 * Note: xAI uses an OpenAI-compatible API
 */
export class XAIProvider implements LLMProvider {
	/**
	 * Initialize the xAI client
	 */
	initializeClient() {
		return new OpenAI({
			apiKey: env.SECRET_XAI_API_KEY,
			baseURL: 'https://api.x.ai/v1'
		});
	}

	/**
	 * Process messages according to xAI requirements
	 */
	processMessages(messages: any[], images: any[], files: any[]) {
		let processedMessages = [...messages];

		if (images.length > 0) {
			// Format images for xAI (same format as OpenAI)
			const textContent = processedMessages[processedMessages.length - 1].content;
			const xaiImages = images.map((image) => ({
				type: 'image_url',
				image_url: {
					url: image.data
				}
			}));

			// Replace the string content with an array of content parts
			processedMessages[processedMessages.length - 1].content = [
				{ type: 'text', text: textContent },
				...xaiImages
			];
		}

		if (files.length > 0) {
			processedMessages = addFilesToMessage(processedMessages, files);
		}

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
		messages: any;
		reasoningEnabled?: boolean;
	}) {
		const client = this.initializeClient();

		try {
			return await client.chat.completions.create({
				model: model.param,
				...(model.reasons && reasoningEnabled ? { reasoning_effort: 'high' } : {}),
				messages,
				stream: true,
				stream_options: {
					include_usage: true
				}
			});
		} catch (err) {
			console.error('[xAI Provider] Error creating stream:', err);
			throw err;
		}
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
		const content = chunk.choices?.[0]?.delta?.content || '';
		const reasoningContent = chunk.choices?.[0]?.delta?.reasoning_content || '';

		if (chunk.usage) {
			const usage: UsageMetrics = {
				prompt_tokens: chunk.usage.prompt_tokens,
				completion_tokens: chunk.usage.completion_tokens,
				total_tokens: chunk.usage.total_tokens
			};

			// Use a minimal model object with just the price parameters
			callbacks.onUsage(usage, {
				input_price: 0.000015,
				output_price: 0.000075
			});
		}

		if (content) {
			callbacks.onContent(content);
		}

		if (reasoningContent && callbacks.onReasoning) {
			callbacks.onReasoning(reasoningContent);
		}

		// Call onFirstChunk if this is the first token
		if (!content && !reasoningContent) {
			callbacks.onFirstChunk(crypto.randomUUID(), '');
		}
	}
}
