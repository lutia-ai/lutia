import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for Meta/Llama
 *
 * Note: This actually uses OpenAI's SDK since Meta's API follows the OpenAI protocol
 */
export class LlamaProvider implements LLMProvider {
	/**
	 * Initialize the Meta/Llama client (using OpenAI SDK compatible interface)
	 */
	initializeClient() {
		return new OpenAI({
			apiKey: env.VITE_LLAMA_API_KEY,
			baseURL: 'https://api.llama-api.com' // This may need to be adjusted based on the actual API endpoint
		});
	}

	/**
	 * Process messages according to Llama requirements
	 */
	processMessages(messages: any[], images: any[], files: any[]) {
		console.log('[Llama Provider] Processing messages');
		let processedMessages = [...messages];

		if (images.length > 0) {
			// Format images for Llama
			const textContent = processedMessages[processedMessages.length - 1].content;
			const llamaImages = images.map((image) => ({
				type: 'image_url',
				image_url: {
					url: image.data
				}
			}));

			// Replace the string content with an array of content parts
			processedMessages[processedMessages.length - 1].content = [
				{ type: 'text', text: textContent },
				...llamaImages
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
		console.log('[Llama Provider] Creating completion stream');
		const client = this.initializeClient();

		try {
			return await client.chat.completions.create({
				model: model.param,
				messages,
				stream: true,
				stream_options: {
					include_usage: true
				}
			});
		} catch (err) {
			console.error('[Llama Provider] Error creating stream:', err);
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
		console.log(`[Llama Provider] Processing chunk`);
		const content = chunk.choices?.[0]?.delta?.content || '';

		if (chunk.usage) {
			const usage: UsageMetrics = {
				prompt_tokens: chunk.usage.prompt_tokens,
				completion_tokens: chunk.usage.completion_tokens,
				total_tokens: chunk.usage.total_tokens
			};
			callbacks.onUsage(usage, {
				input_price: 0.0000015, // Adjust based on actual Llama pricing
				output_price: 0.000002
			});
		}

		if (content) {
			callbacks.onContent(content);
		}

		// If this is first chunk, make sure we call onFirstChunk
		if (chunk.isFirstChunk || chunk.choices?.[0]?.index === 0) {
			callbacks.onFirstChunk(crypto.randomUUID(), '');
		}
	}
}
