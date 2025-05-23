import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for Google's Gemini
 */
export class GeminiProvider implements LLMProvider {
	private genAI!: GoogleGenAI;
	private isFirstContent: boolean = true;

	/**
	 * Initialize the Gemini client
	 */
	initializeClient() {
		this.genAI = new GoogleGenAI({ apiKey: env.VITE_GOOGLE_GEMINI_API_KEY });
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

		// Reset first content flag for each new stream
		this.isFirstContent = true;

		const { prompt, geminiImage } = messages;

		// Generate the stream
		try {
			let streamResponse;

			// Configure thinking for 2.5 series models
			const config = reasoningEnabled
				? {
						thinkingConfig: {
							includeThoughts: true
						}
					}
				: undefined;

			if (geminiImage) {
				// For image requests, pass content and config separately
				const content = [
					...prompt.contents.map((msg: any) => ({
						role: msg.role,
						parts: msg.parts
					})),
					{
						role: 'user',
						parts: [geminiImage]
					}
				];

				streamResponse = await client.models.generateContentStream({
					model: model.param,
					contents: content,
					config: config
				});
			} else {
				streamResponse = await client.models.generateContentStream({
					model: model.param,
					contents: prompt.contents,
					config: config
				});
			}

			// Return the stream directly - no normalization needed
			return streamResponse;
		} catch (err) {
			console.error('[Gemini Provider] Error creating stream:', err);
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
			onUsage: (usage: UsageMetrics) => void;
			onContent: (content: string) => void;
			onReasoning?: (content: string) => void;
		}
	) {
		try {
			// Check if the response has the expected structure
			const candidate = chunk.candidates?.[0];

			// Process all parts in the candidate content
			const parts = candidate?.content?.parts || [];
			let hasContent = false;

			for (const part of parts) {
				if (!part.text) {
					continue;
				}

				hasContent = true;

				// Check if this is thinking content or regular content
				if (part.thought) {
					// This is thinking/reasoning content
					if (callbacks.onReasoning) {
						callbacks.onReasoning(part.text);
					}
				} else {
					// This is regular response content
					callbacks.onContent(part.text);
				}
			}

			// Call onFirstChunk with the first chunk that has any content
			if (this.isFirstContent && hasContent) {
				this.isFirstContent = false;
				callbacks.onFirstChunk(crypto.randomUUID(), '');
			}

			// Handle usage metadata from the new SDK
			if (chunk.usageMetadata) {
				const usage: UsageMetrics = {
					prompt_tokens: chunk.usageMetadata.promptTokenCount || 0,
					completion_tokens: chunk.usageMetadata.candidatesTokenCount || 0,
					thinking_tokens: chunk.usageMetadata.thoughtsTokenCount || 0,
					total_tokens: chunk.usageMetadata.totalTokenCount || 0
				};

				callbacks.onUsage(usage);
			}
		} catch (err) {
			console.error('[Gemini Provider] Error handling chunk:', err);
		}
	}
}
