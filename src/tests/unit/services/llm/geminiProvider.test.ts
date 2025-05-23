/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '$lib/services/llm/geminiProvider';
import type { UsageMetrics } from '$lib/services/llm/types';
import type { Model } from '$lib/types/types';

// Mock @google/genai (new SDK)
vi.mock('@google/genai', () => {
	const mockCountTokens = vi.fn().mockImplementation(() => Promise.resolve({ totalTokens: 100 }));
	const mockGenerateContentStream = vi.fn().mockImplementation(() => ({
		[Symbol.asyncIterator]: async function* () {
			yield {
				candidates: [
					{
						content: {
							parts: [{ text: 'Hello' }]
						}
					}
				]
			};
			yield {
				candidates: [
					{
						content: {
							parts: [{ text: ' world' }]
						}
					}
				]
			};
			// Final chunk with usage metadata
			yield {
				candidates: [
					{
						content: {
							parts: [{ text: '!' }]
						}
					}
				],
				usageMetadata: {
					promptTokenCount: 10,
					candidatesTokenCount: 20,
					thoughtsTokenCount: 0,
					totalTokenCount: 30
				}
			};
		}
	}));

	return {
		GoogleGenAI: vi.fn().mockImplementation(() => ({
			models: {
				generateContentStream: mockGenerateContentStream,
				countTokens: mockCountTokens
			}
		}))
	};
});

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		VITE_GOOGLE_GEMINI_API_KEY: 'test-api-key'
	}
}));

// Mock file handling utility
vi.mock('$lib/utils/fileHandling', () => ({
	addFilesToMessage: vi.fn((messages) => messages)
}));

describe('GeminiProvider', () => {
	let provider: GeminiProvider;
	let mockCallbacks: {
		onFirstChunk: ReturnType<typeof vi.fn>;
		onUsage: ReturnType<typeof vi.fn>;
		onContent: ReturnType<typeof vi.fn>;
		onReasoning: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		provider = new GeminiProvider();
		mockCallbacks = {
			onFirstChunk: vi.fn(),
			onUsage: vi.fn(),
			onContent: vi.fn(),
			onReasoning: vi.fn()
		};

		// Mock crypto.randomUUID
		Object.defineProperty(global, 'crypto', {
			value: {
				randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000')
			}
		});
	});

	it('should initialize client correctly', () => {
		const client = provider.initializeClient();
		expect(client).toBeDefined();
	});

	it('should process messages correctly without images or files', () => {
		const messages = [
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there' }
		];
		const result = provider.processMessages(messages, [], []);

		// Check that the messages were processed correctly
		expect(result).toHaveProperty('prompt');
		expect(result).toHaveProperty('geminiImage');
		expect(result.geminiImage).toBeNull();

		// Check prompt structure
		const { prompt } = result;
		expect(prompt.contents).toHaveLength(2);
		expect(prompt.contents[0].role).toBe('user');
		expect(prompt.contents[0].parts[0].text).toBe('Hello');
		expect(prompt.contents[1].role).toBe('model');
		expect(prompt.contents[1].parts[0].text).toBe('Hi there');
	});

	it('should process messages correctly with an image', () => {
		const messages = [{ role: 'user', content: 'Describe this image' }];
		const images = [
			{
				data: 'data:image/jpeg;base64,abc123',
				media_type: 'image/jpeg'
			}
		];

		const result = provider.processMessages(messages, images, []);

		// Check image is processed correctly
		expect(result.geminiImage).toBeDefined();
		expect(result.geminiImage.inlineData.data).toBe('abc123');
		expect(result.geminiImage.inlineData.mimeType).toBe('image/jpeg');
	});

	it('should create completion stream successfully', async () => {
		const model = {
			param: 'gemini-1.5-pro',
			input_price: 0.00000125,
			output_price: 0.00000375,
			name: 'Gemini_1_5_Pro',
			legacy: false,
			context_window: 1000000,
			hub: 'gemini',
			handlesImages: true,
			maxImages: 1,
			generatesImages: false,
			description: 'Google Gemini Pro model',
			max_tokens: 4096
		} as Model;

		const messages = {
			prompt: {
				contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
			},
			geminiImage: null
		};

		const stream = await provider.createCompletionStream({ model, messages });
		expect(stream).toBeDefined();
	});

	it('should handle stream chunks correctly', async () => {
		// Create a mock chunk
		const chunk = {
			candidates: [
				{
					content: {
						parts: [{ text: 'Hello, world!' }]
					}
				}
			]
		};

		// Call handleStreamChunk with the mock chunk
		provider.handleStreamChunk(chunk, mockCallbacks);

		// First chunk should trigger onFirstChunk
		expect(mockCallbacks.onFirstChunk).toHaveBeenCalledWith(
			'123e4567-e89b-12d3-a456-426614174000',
			''
		);

		// Content should be passed to onContent
		expect(mockCallbacks.onContent).toHaveBeenCalledWith('Hello, world!');
	});

	it('should report usage on final chunk', async () => {
		// Create a mock chunk with usage metadata (new SDK format)
		const chunkWithUsage = {
			candidates: [
				{
					content: {
						parts: [{ text: 'Final response' }]
					}
				}
			],
			usageMetadata: {
				promptTokenCount: 10,
				candidatesTokenCount: 20,
				thoughtsTokenCount: 0,
				totalTokenCount: 30
			}
		};

		// Call handleStreamChunk with the chunk containing usage
		provider.handleStreamChunk(chunkWithUsage, mockCallbacks);

		// Should call onUsage with the correct metrics
		expect(mockCallbacks.onUsage).toHaveBeenCalledWith({
			prompt_tokens: 10,
			completion_tokens: 20,
			thinking_tokens: 0,
			total_tokens: 30
		});
	});

	it('should handle a complete stream lifecycle', async () => {
		const model = {
			param: 'gemini-1.5-pro',
			input_price: 0.00000125,
			output_price: 0.00000375,
			name: 'Gemini_1_5_Pro',
			legacy: false,
			context_window: 1000000,
			hub: 'gemini',
			handlesImages: true,
			maxImages: 1,
			generatesImages: false,
			description: 'Google Gemini Pro model',
			max_tokens: 4096
		} as Model;

		const messages = {
			prompt: {
				contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
			},
			geminiImage: null
		};

		// Create the stream
		const stream = await provider.createCompletionStream({ model, messages });

		// Process all chunks
		for await (const chunk of stream) {
			provider.handleStreamChunk(chunk, mockCallbacks);
		}

		// Verify that appropriate callback methods were called
		expect(mockCallbacks.onFirstChunk).toHaveBeenCalled();
		expect(mockCallbacks.onContent).toHaveBeenCalled();
		// Usage should be called when chunk has usageMetadata
		expect(mockCallbacks.onUsage).toHaveBeenCalled();
	});

	it('should handle errors in token counting', async () => {
		// Mock an error in the models API
		const originalInitialize = provider.initializeClient;
		provider.initializeClient = vi.fn().mockImplementation(() => ({
			models: {
				countTokens: vi.fn().mockRejectedValue(new Error('Token counting failed')),
				generateContentStream: vi.fn().mockImplementation(() => ({
					[Symbol.asyncIterator]: async function* () {
						yield {
							candidates: [
								{
									content: {
										parts: [{ text: 'Response with token error' }]
									}
								}
							]
						};
					}
				}))
			}
		}));

		const model = {
			param: 'gemini-1.5-pro',
			input_price: 0.00000125,
			output_price: 0.00000375,
			name: 'Gemini_1_5_Pro',
			legacy: false,
			context_window: 1000000,
			hub: 'gemini',
			handlesImages: true,
			maxImages: 1,
			generatesImages: false,
			description: 'Google Gemini Pro model',
			max_tokens: 4096
		} as Model;

		const messages = {
			prompt: {
				contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
			},
			geminiImage: null
		};

		// Should not throw despite token counting error
		const stream = await provider.createCompletionStream({ model, messages });
		expect(stream).toBeDefined();

		// Restore original method
		provider.initializeClient = originalInitialize;
	});
});
