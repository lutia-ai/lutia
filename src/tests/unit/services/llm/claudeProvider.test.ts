/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeProvider } from '$lib/services/llm/claudeProvider';
import type { Model } from '$lib/types/types';
import type { UsageMetrics } from '$lib/services/llm/types';

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
	// Create a mock stream implementation
	const createMockStream = () => {
		// Create a generator function that will yield chunks
		const messageStartChunk = {
			type: 'message_start',
			message: {
				id: 'msg_123',
				usage: {
					input_tokens: 50,
					output_tokens: 0
				}
			}
		};

		const contentChunk1 = {
			type: 'content_block_delta',
			delta: {
				type: 'text_delta',
				text: 'Hello, '
			}
		};

		const contentChunk2 = {
			type: 'content_block_delta',
			delta: {
				type: 'text_delta',
				text: 'world!'
			}
		};

		const messageDeltaChunk = {
			type: 'message_delta',
			usage: {
				output_tokens: 100
			}
		};

		// Return an object with these chunks as a stream
		return {
			[Symbol.asyncIterator]: async function* () {
				yield messageStartChunk;
				yield contentChunk1;
				yield contentChunk2;
				yield messageDeltaChunk;
			}
		};
	};

	// Mock Anthropic constructor and methods
	return {
		default: vi.fn().mockImplementation(() => ({
			messages: {
				stream: vi.fn().mockResolvedValue(createMockStream())
			}
		}))
	};
});

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		VITE_ANTHROPIC_API_KEY: 'test-api-key'
	}
}));

// Mock file handling utility
vi.mock('$lib/utils/fileHandling', () => ({
	addFilesToMessage: vi.fn((messages) => messages)
}));

describe('ClaudeProvider', () => {
	let provider: ClaudeProvider;
	let mockCallbacks: {
		onFirstChunk: ReturnType<typeof vi.fn>;
		onUsage: ReturnType<typeof vi.fn>;
		onContent: ReturnType<typeof vi.fn>;
		onReasoning: ReturnType<typeof vi.fn>;
	};
	let mockModel: Model;

	beforeEach(() => {
		vi.clearAllMocks();
		provider = new ClaudeProvider();
		mockCallbacks = {
			onFirstChunk: vi.fn(),
			onUsage: vi.fn(),
			onContent: vi.fn(),
			onReasoning: vi.fn()
		};

		mockModel = {
			name: 'Claude_3_Opus',
			param: 'claude-3-opus-20240229',
			legacy: false,
			input_price: 0.000033,
			output_price: 0.000132,
			context_window: 200000,
			hub: 'claude',
			handlesImages: true,
			maxImages: 5,
			generatesImages: false,
			description: 'Most powerful Claude model for complex tasks',
			max_tokens: 4096,
			reasons: true,
			extendedThinking: false,
			max_input_per_request: 200000,
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
		expect(result[0].content[1].type).toBe('image');
		expect(result[0].content[1].source.type).toBe('base64');
		expect(result[0].content[1].source.data).toBe('abc123');
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

	it('should handle system messages correctly', async () => {
		const messages = [
			{ role: 'system', content: 'You are a helpful assistant' },
			{ role: 'user', content: 'Hello' }
		];

		// Spy on the initializeClient method
		const initSpy = vi.spyOn(provider, 'initializeClient');

		await provider.createCompletionStream({
			model: mockModel,
			messages,
			reasoningEnabled: false
		});

		// Get the client mock
		const clientMock = initSpy.mock.results[0].value;

		// Check that stream was called with system parameter
		expect(clientMock.messages.stream).toHaveBeenCalledWith(
			expect.objectContaining({
				system: 'You are a helpful assistant'
			})
		);
	});

	it('should enable reasoning when requested', async () => {
		const messages = [{ role: 'user', content: 'Hello' }];

		// Spy on the initializeClient method
		const initSpy = vi.spyOn(provider, 'initializeClient');

		await provider.createCompletionStream({
			model: mockModel,
			messages,
			reasoningEnabled: true
		});

		// Get the client mock
		const clientMock = initSpy.mock.results[0].value;

		// Check that stream was called with thinking parameter
		expect(clientMock.messages.stream).toHaveBeenCalledWith(
			expect.objectContaining({
				thinking: expect.objectContaining({
					type: 'enabled'
				})
			})
		);
	});

	it('should handle message_start chunks correctly', () => {
		const chunk = {
			type: 'message_start',
			message: {
				id: 'msg_123',
				usage: {
					input_tokens: 50,
					output_tokens: 0
				}
			}
		};

		provider.handleStreamChunk(chunk, mockCallbacks);

		// Should call onFirstChunk
		expect(mockCallbacks.onFirstChunk).toHaveBeenCalledWith(
			'123e4567-e89b-12d3-a456-426614174000',
			''
		);

		// Should call onUsage with initial token counts
		expect(mockCallbacks.onUsage).toHaveBeenCalledWith({
			prompt_tokens: 50,
			completion_tokens: 0,
			total_tokens: 50
		});
	});

	it('should handle message_delta chunks correctly', () => {
		// First set up with a message_start chunk to initialize token tracking
		const startChunk = {
			type: 'message_start',
			message: {
				id: 'msg_123',
				usage: {
					input_tokens: 50,
					output_tokens: 0
				}
			}
		};

		provider.handleStreamChunk(startChunk, mockCallbacks);

		// Now handle a message_delta chunk
		const deltaChunk = {
			type: 'message_delta',
			usage: {
				output_tokens: 30
			}
		};

		// Reset mocks
		mockCallbacks.onUsage.mockClear();

		provider.handleStreamChunk(deltaChunk, mockCallbacks);

		// Should call onUsage with updated token counts
		expect(mockCallbacks.onUsage).toHaveBeenCalledWith({
			prompt_tokens: 50,
			completion_tokens: 30,
			total_tokens: 80
		});
	});

	it('should handle content_block_delta with text correctly', () => {
		const chunk = {
			type: 'content_block_delta',
			delta: {
				type: 'text_delta',
				text: 'Hello, world!'
			}
		};

		provider.handleStreamChunk(chunk, mockCallbacks);

		// Should call onContent with the text
		expect(mockCallbacks.onContent).toHaveBeenCalledWith('Hello, world!');
	});

	it('should handle content_block_delta with thinking correctly', () => {
		const chunk = {
			type: 'content_block_delta',
			delta: {
				type: 'thinking_delta',
				thinking: 'I need to consider this carefully...'
			}
		};

		provider.handleStreamChunk(chunk, mockCallbacks);

		// Should call onReasoning with the thinking content
		expect(mockCallbacks.onReasoning).toHaveBeenCalledWith(
			'I need to consider this carefully...'
		);
	});

	it('should handle a complete stream lifecycle', async () => {
		const messages = [{ role: 'user', content: 'Hello' }];

		// Create the stream
		const stream = await provider.createCompletionStream({
			model: mockModel,
			messages,
			reasoningEnabled: false
		});

		// Process all chunks
		for await (const chunk of stream) {
			provider.handleStreamChunk(chunk, mockCallbacks);
		}

		// Verify the expected calls
		expect(mockCallbacks.onFirstChunk).toHaveBeenCalled();
		expect(mockCallbacks.onContent).toHaveBeenCalledWith('Hello, ');
		expect(mockCallbacks.onContent).toHaveBeenCalledWith('world!');
		expect(mockCallbacks.onUsage).toHaveBeenCalledTimes(2); // Once for start, once for delta
	});
});
