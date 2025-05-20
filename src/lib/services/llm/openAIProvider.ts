import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for OpenAI/ChatGPT
 */
export class OpenAIProvider implements LLMProvider {
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
			// Convert the last message content to GPT-4 Vision format
			if (typeof processedMessages[processedMessages.length - 1].content === 'string') {
				const textContent = processedMessages[processedMessages.length - 1]
					.content as string;
				const gptImages = images.map((image) => ({
					type: 'image_url',
					image_url: {
						url: image.data,
						detail: image.detail || 'auto'
					}
				}));

				// Replace the string content with an array of content parts
				processedMessages[processedMessages.length - 1].content = [
					{ type: 'text', text: textContent },
					...gptImages
				];
			}
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

		return await client.chat.completions.create({
			model: model.param,
			messages,
			stream: true,
			stream_options: {
				include_usage: true
			}
		});
	}

	/**
	 * Handle a chunk of data from the stream
	 */
	handleStreamChunk(
		chunk: any,
		callbacks: {
			onFirstChunk: (requestId: string, conversationId: string) => void;
			onUsage: (usage: UsageMetrics, model: Model) => void;
			onContent: (content: string) => void;
			onReasoning?: (content: string) => void;
		}
	) {
		const content = chunk.choices?.[0]?.delta?.content || '';

		if (chunk.usage) {
			const usage: UsageMetrics = {
				prompt_tokens: chunk.usage.prompt_tokens,
				completion_tokens: chunk.usage.completion_tokens,
				total_tokens: chunk.usage.total_tokens
			};
			callbacks.onUsage(usage, chunk.model);
		}

		if (content) {
			callbacks.onContent(content);
		}
	}
}
