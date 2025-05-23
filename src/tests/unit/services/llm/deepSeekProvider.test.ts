/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekProvider } from '$lib/services/llm/deepSeekProvider';
import type { Model } from '$lib/types/types';
import type { UsageMetrics } from '$lib/services/llm/types';

// Mock OpenAI (DeepSeek uses OpenAI SDK)
vi.mock('openai', () => {
	const createMockStream = (includeReasoning = false) => {
		const chunks = [
			{
				choices: [
					{
						index: 0,
						delta: {
							content: 'Hello, ',
							...(includeReasoning
								? { reasoning_content: 'I need to greet the user.' }
								: {})
						}
					}
				]
			},
			{
				choices: [
					{
						index: 0,
						delta: {
							content: 'world!',
							...(includeReasoning
								? { reasoning_content: ' This is a friendly greeting.' }
								: {})
						}
					}
				]
			},
			{
				usage: {
					prompt_tokens: 10,
					completion_tokens: 20,
					total_tokens: 30
				},
				model: 'deepseek-chat'
			}
		];

		return {
			[Symbol.asyncIterator]: async function* () {
				for (const chunk of chunks) {
					yield chunk;
				}
			}
		};
	};

	return {
		default: vi.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: vi.fn().mockImplementation((params) => {
						const hasReasoning = params.reasoning === true;
						return Promise.resolve(createMockStream(hasReasoning));
					})
				}
			}
		}))
	};
});

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		SECRET_DEEPSEEK_API_KEY: 'test-api-key'
	}
}));

// Mock file handling utility
vi.mock('$lib/utils/fileHandling', () => ({
	addFilesToMessage: vi.fn((messages) => messages)
}));

describe('DeepSeekProvider', () => {
	let provider: DeepSeekProvider;
	let mockCallbacks: {
		onFirstChunk: ReturnType<typeof vi.fn>;
		onUsage: ReturnType<typeof vi.fn>;
		onContent: ReturnType<typeof vi.fn>;
		onReasoning: ReturnType<typeof vi.fn>;
	};
	let mockModel: Model;

	beforeEach(() => {
		vi.clearAllMocks();
		provider = new DeepSeekProvider();
		mockCallbacks = {
			onFirstChunk: vi.fn(),
			onUsage: vi.fn(),
			onContent: vi.fn(),
			onReasoning: vi.fn()
		};

		mockModel = {
			name: 'R1' as any,
			param: 'deepseek-reasoner',
			legacy: false,
			input_price: 0.00000014,
			output_price: 0.00000028,
			context_window: 64000,
			hub: 'deepseek',
			handlesImages: true,
			maxImages: 5,
			generatesImages: false,
			description: 'DeepSeek reasoning model',
			max_tokens: 4096,
			reasons: true,
			extendedThinking: false,
			max_input_per_request: 64000,
			severity: 0
		} as Model;

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
			{ role: 'user', content: 'Hello', message_id: 123 },
			{ role: 'assistant', content: 'Hi there', message_id: 456 }
		];

		const result = provider.processMessages(messages, [], []);

		// Check that messages were processed correctly
		expect(result).toHaveLength(2);
		expect(result[0].role).toBe('user');
		expect(result[0].content).toBe('Hello');
		// Message IDs should be removed
		expect(result[0]).not.toHaveProperty('message_id');
		expect(result[1]).not.toHaveProperty('message_id');
	});

	it('should process messages correctly with images', () => {
		const messages = [{ role: 'user', content: 'Describe this image', message_id: 123 }];

		const images = [
			{
				data: 'data:image/jpeg;base64,abc123',
				media_type: 'image/jpeg'
			}
		];

		const result = provider.processMessages(messages, images, []);

		// Check that the last message content is now an array with text and image
		expect(result).toHaveLength(1);
		expect(Array.isArray(result[0].content)).toBeTruthy();

		// Should have two content items - text and image
		expect(result[0].content).toHaveLength(2);
		expect(result[0].content[0].type).toBe('text');
		expect(result[0].content[0].text).toBe('Describe this image');
		expect(result[0].content[1].type).toBe('image_url');
		expect(result[0].content[1].image_url.url).toBe('data:image/jpeg;base64,abc123');
	});

	it('should handle multiple images correctly', () => {
		const messages = [{ role: 'user', content: 'Compare these images', message_id: 123 }];

		const images = [
			{
				data: 'data:image/jpeg;base64,abc123',
				media_type: 'image/jpeg'
			},
			{
				data: 'data:image/png;base64,def456',
				media_type: 'image/png'
			}
		];

		const result = provider.processMessages(messages, images, []);

		// Should have three content items - text and two images
		expect(result[0].content).toHaveLength(3);
		expect(result[0].content[0].type).toBe('text');
		expect(result[0].content[1].type).toBe('image_url');
		expect(result[0].content[2].type).toBe('image_url');
	});

	it('should create completion stream successfully', async () => {
		const messages = [
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there' }
		];

		const stream = await provider.createCompletionStream({
			model: mockModel,
			messages,
			reasoningEnabled: false
		});

		expect(stream).toBeDefined();
	});

	it('should create completion stream with reasoning enabled', async () => {
		const reasoningModel = {
			...mockModel,
			reasons: true
		} as Model;

		const messages = [{ role: 'user', content: 'Hello' }];

		const stream = await provider.createCompletionStream({
			model: reasoningModel,
			messages,
			reasoningEnabled: true
		});

		expect(stream).toBeDefined();
	});

	it('should handle first chunk correctly', async () => {
		const chunk = {
			choices: [
				{
					index: 0,
					delta: {
						content: 'Hello, world!'
					}
				}
			]
		};

		provider.handleStreamChunk(chunk, mockCallbacks);

		// First chunk should trigger onFirstChunk
		expect(mockCallbacks.onFirstChunk).toHaveBeenCalledWith(
			'123e4567-e89b-12d3-a456-426614174000',
			''
		);

		// Content should be passed to onContent
		expect(mockCallbacks.onContent).toHaveBeenCalledWith('Hello, world!');
	});

	it('should handle usage chunk correctly', async () => {
		const usageChunk = {
			usage: {
				prompt_tokens: 10,
				completion_tokens: 20,
				total_tokens: 30
			},
			model: 'deepseek-chat'
		};

		provider.handleStreamChunk(usageChunk, mockCallbacks);

		// Should call onUsage with the correct metrics
		expect(mockCallbacks.onUsage).toHaveBeenCalledWith({
			prompt_tokens: 10,
			completion_tokens: 20,
			total_tokens: 30
		});
	});

	it('should handle reasoning content correctly', async () => {
		const reasoningChunk = {
			choices: [
				{
					index: 0,
					delta: {
						reasoning_content: 'I need to think about this...'
					}
				}
			]
		};

		provider.handleStreamChunk(reasoningChunk, mockCallbacks);

		// Should call onReasoning with the reasoning content
		expect(mockCallbacks.onReasoning).toHaveBeenCalledWith('I need to think about this...');
	});

	it('should handle chunk with both content and reasoning', async () => {
		const combinedChunk = {
			choices: [
				{
					index: 0,
					delta: {
						content: 'Hello there!',
						reasoning_content: 'I should greet the user.'
					}
				}
			]
		};

		provider.handleStreamChunk(combinedChunk, mockCallbacks);

		// Both callbacks should be called
		expect(mockCallbacks.onContent).toHaveBeenCalledWith('Hello there!');
		expect(mockCallbacks.onReasoning).toHaveBeenCalledWith('I should greet the user.');
	});

	it('should handle empty content chunks', async () => {
		const emptyChunk = {
			choices: [
				{
					index: 0,
					delta: {}
				}
			]
		};

		provider.handleStreamChunk(emptyChunk, mockCallbacks);

		// Should still call onFirstChunk for empty chunks
		expect(mockCallbacks.onFirstChunk).toHaveBeenCalledWith(
			'123e4567-e89b-12d3-a456-426614174000',
			''
		);
		expect(mockCallbacks.onContent).not.toHaveBeenCalled();
	});

	it('should handle a complete stream lifecycle', async () => {
		const chunks = [
			{
				choices: [
					{
						index: 0,
						delta: {
							content: 'Hello, '
						}
					}
				]
			},
			{
				choices: [
					{
						index: 0,
						delta: {
							content: 'world!'
						}
					}
				]
			},
			{
				usage: {
					prompt_tokens: 10,
					completion_tokens: 20,
					total_tokens: 30
				},
				model: 'deepseek-chat'
			}
		];

		// Process all chunks
		chunks.forEach((chunk) => {
			provider.handleStreamChunk(chunk, mockCallbacks);
		});

		// Should have called onFirstChunk at least once (DeepSeek calls it for each content chunk)
		expect(mockCallbacks.onFirstChunk).toHaveBeenCalled();

		// Should have called onContent twice
		expect(mockCallbacks.onContent).toHaveBeenCalledTimes(2);
		expect(mockCallbacks.onContent).toHaveBeenNthCalledWith(1, 'Hello, ');
		expect(mockCallbacks.onContent).toHaveBeenNthCalledWith(2, 'world!');

		// Should have called onUsage once
		expect(mockCallbacks.onUsage).toHaveBeenCalledTimes(1);
		expect(mockCallbacks.onUsage).toHaveBeenCalledWith({
			prompt_tokens: 10,
			completion_tokens: 20,
			total_tokens: 30
		});
	});

	it('should process files correctly', async () => {
		const messages = [{ role: 'user', content: 'Analyze this file', message_id: 123 }];
		const files = [{ name: 'test.txt', content: 'test content' }];

		const result = provider.processMessages(messages, [], files);

		// addFilesToMessage should have been called
		const { addFilesToMessage } = await import('$lib/utils/fileHandling');
		expect(addFilesToMessage).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					role: 'user',
					content: 'Analyze this file'
				})
			]),
			files
		);
	});

	it('should use correct base URL for DeepSeek API', async () => {
		// Spy on the OpenAI constructor to verify the baseURL
		const mockOpenAI = (await import('openai')).default;

		provider.initializeClient();

		expect(mockOpenAI).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			baseURL: 'https://api.deepseek.com'
		});
	});
});
