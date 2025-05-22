import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for DeepSeek
 */
export class DeepSeekProvider implements LLMProvider {
	/**
	 * Initialize the DeepSeek client (using OpenAI SDK with different baseURL)
	 */
	initializeClient() {
		return new OpenAI({
			apiKey: env.SECRET_DEEPSEEK_API_KEY,
			baseURL: 'https://api.deepseek.com'
		});
	}

	/**
	 * Process messages according to DeepSeek requirements
	 */
	processMessages(messages: any[], images: any[], files: any[]) {
		let processedMessages = [...messages];

		if (images.length > 0) {
			const textObject = {
				type: 'text',
				text: processedMessages[processedMessages.length - 1].content
			};
			const gptImages = images.map((image) => ({
				type: 'image_url',
				image_url: {
					url: image.data
				}
			}));
			processedMessages[processedMessages.length - 1].content = [textObject, ...gptImages];
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
		messages: any;
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
			onUsage: (usage: UsageMetrics) => void;
			onContent: (content: string) => void;
			onReasoning?: (content: string) => void;
		}
	) {
		// Track if this is the first content chunk
		const isFirstContentChunk = chunk.choices?.[0]?.index === 0;
		const content = chunk.choices?.[0]?.delta?.content || '';
		const reasoningContent = chunk.choices?.[0]?.delta?.reasoning_content || '';

		// Call onFirstChunk for first message chunk
		if (isFirstContentChunk || (!content && !reasoningContent && !chunk.usage)) {
			callbacks.onFirstChunk(crypto.randomUUID(), '');
		}

		if (chunk.usage) {
			const usage: UsageMetrics = {
				prompt_tokens: chunk.usage.prompt_tokens,
				completion_tokens: chunk.usage.completion_tokens,
				total_tokens: chunk.usage.total_tokens
			};
			callbacks.onUsage(usage);
		}

		if (reasoningContent && callbacks.onReasoning) {
			callbacks.onReasoning(reasoningContent);
		}

		if (content) {
			callbacks.onContent(content);
		}
	}
}
