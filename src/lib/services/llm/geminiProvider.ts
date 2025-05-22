import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for Google's Gemini
 */
export class GeminiProvider implements LLMProvider {
	private genAI!: GoogleGenerativeAI;
	private genAIModel: any;
	private finalContent: string = '';
	private inputTokens: number = 0;
	private isFirstContent: boolean = true;

	/**
	 * Initialize the Gemini client
	 */
	initializeClient() {
		this.genAI = new GoogleGenerativeAI(env.VITE_GOOGLE_GEMINI_API_KEY);
		return this.genAI;
	}

	/**
	 * Process messages according to Gemini requirements
	 */
	processMessages(messages: any[], images: any[], files: any[]) {
		let processedMessages = [...messages];
		let geminiImage: any = null;

		if (images.length > 0) {
			// For Gemini, we need to handle images differently
			const image = images[0]; // Only first image is supported in Gemini
			// Extract the base64 data from the data URL
			const base64Data = image.data.split(',')[1];
			geminiImage = {
				inlineData: {
					data: base64Data,
					mimeType: image.media_type
				}
			};
		}

		if (files.length > 0) {
			processedMessages = addFilesToMessage(processedMessages, files);
		}

		// Convert messages to Gemini format
		const prompt = {
			contents: processedMessages.map((message) => ({
				role: message.role === 'user' ? message.role : 'model',
				parts: [
					{
						text:
							typeof message.content === 'string'
								? message.content
								: JSON.stringify(message.content)
					}
				]
			}))
		};

		// Store the prompt and image for later use
		return { prompt, geminiImage };
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
		this.genAIModel = client.getGenerativeModel({ model: model.param });

		// Reset first content flag for each new stream
		this.isFirstContent = true;

		const { prompt, geminiImage } = messages;

		// Count input tokens
		let inputCountResult: { totalTokens: number };
		try {
			if (geminiImage) {
				inputCountResult = await this.genAIModel.countTokens([
					JSON.stringify(prompt),
					geminiImage
				]);
			} else {
				inputCountResult = await this.genAIModel.countTokens(prompt);
			}
			this.inputTokens = inputCountResult.totalTokens;
		} catch (err) {
			console.error('[Gemini Provider] Error counting tokens:', err);
			this.inputTokens = 0;
		}

		// Generate the stream
		try {
			let streamResponse;
			if (geminiImage) {
				streamResponse = await this.genAIModel.generateContentStream([
					JSON.stringify(prompt),
					geminiImage
				]);
			} else {
				streamResponse = await this.genAIModel.generateContentStream(prompt);
			}

			// Create a normalized async iterator that works the same way regardless
			// of whether we're using stream.stream or the direct stream
			return this.normalizeGeminiStream(streamResponse);
		} catch (err) {
			console.error('[Gemini Provider] Error creating stream:', err);
			throw err;
		}
	}

	/**
	 * Normalize the Gemini stream into a standardized async iterator
	 * This handles differences between Gemini API versions
	 */
	private async *normalizeGeminiStream(streamResponse: any): AsyncGenerator<any> {
		this.finalContent = ''; // Reset for this stream

		try {
			// Determine which stream property to use
			const streamIterator = streamResponse.stream ? streamResponse.stream : streamResponse;

			// Track if this is the last chunk
			let isLastChunk = false;

			// Iterate through the stream
			for await (const chunk of streamIterator) {
				// Check if this is the last chunk (some versions set this flag)
				if (chunk.isLast) {
					isLastChunk = true;
				}

				// Yield the chunk for processing
				yield chunk;

				// Accumulate content for token counting
				const candidate = chunk.candidates?.[0];
				const content = candidate?.content?.parts?.[0]?.text || '';
				if (content) {
					this.finalContent += content;
				}
			}

			// After the stream ends, yield a final chunk with usage info
			// This mimics the behavior of other providers like Claude
			if (this.finalContent) {
				try {
					const outputCountResult = await this.genAIModel.countTokens(this.finalContent);
					const outputTokens = outputCountResult.totalTokens;

					// Create a synthetic "final" chunk with token usage
					yield {
						isLast: true,
						usage: {
							input_tokens: this.inputTokens,
							output_tokens: outputTokens,
							total_tokens: this.inputTokens + outputTokens
						}
					};
				} catch (err) {
					console.error('[Gemini Provider] Error counting output tokens:', err);
					// Still provide a chunk with whatever token info we have
					yield {
						isLast: true,
						usage: {
							input_tokens: this.inputTokens,
							output_tokens: 0,
							total_tokens: this.inputTokens
						}
					};
				}
			}
		} catch (err) {
			console.error('[Gemini Provider] Error in normalized stream:', err);
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
		try {
			// Check if the response has the expected structure
			const candidate = chunk.candidates?.[0];
			const content = candidate?.content?.parts?.[0]?.text || '';

			// Call onFirstChunk with the first chunk that has content
			if (this.isFirstContent) {
				this.isFirstContent = false;
				callbacks.onFirstChunk(crypto.randomUUID(), '');
			}

			if (content) {
				callbacks.onContent(content);
			}

			// If this is the end of the stream (final chunk with usage), report usage
			if (chunk.isLast && chunk.usage) {
				const usage: UsageMetrics = {
					prompt_tokens: chunk.usage.input_tokens || this.inputTokens,
					completion_tokens: chunk.usage.output_tokens || 0,
					total_tokens: chunk.usage.total_tokens || this.inputTokens
				};

				callbacks.onUsage(usage, {
					input_price: 0.00000125,
					output_price: 0.00000375
				});
			}
		} catch (err) {
			console.error('[Gemini Provider] Error handling chunk:', err);
		}
	}
}
