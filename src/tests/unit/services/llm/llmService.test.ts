/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { ApiProvider, PaymentTier } from '@prisma/client';
import { ReadableStream } from 'stream/web';
import type { Model } from '$lib/types/types';

// Mock the provider factory
vi.mock('$lib/services/llm/providerFactory', () => ({
	llmProviderFactory: {
		getProvider: vi.fn().mockImplementation(() => ({
			initializeClient: vi.fn(),
			processMessages: vi.fn().mockImplementation((messages) => {
				return { processedMessages: messages };
			}),
			createCompletionStream: vi.fn().mockImplementation(async () => {
				return {
					[Symbol.asyncIterator]: async function* () {
						yield { type: 'text', content: 'Hello' };
						yield { type: 'text', content: ' world' };
						yield {
							type: 'usage',
							usage: {
								prompt_tokens: 10,
								completion_tokens: 20,
								total_tokens: 30
							}
						};
					}
				};
			}),
			handleStreamChunk: vi.fn().mockImplementation((chunk, callbacks) => {
				if (chunk.type === 'text') {
					callbacks.onContent(chunk.content);
				} else if (chunk.type === 'usage') {
					callbacks.onUsage(chunk.usage, {
						input_price: 0.00001,
						output_price: 0.00003
					});
				}
				// Call onFirstChunk on first content
				if (chunk.type === 'text') {
					callbacks.onFirstChunk('req123', 'conv123');
				}
			})
		}))
	}
}));

// Mock response finalizer
vi.mock('$lib/utils/responseFinalizer', () => ({
	finalizeResponse: vi.fn().mockResolvedValue({
		message: { id: 456 },
		apiRequest: { id: 789 }
	}),
	updateExistingMessageAndRequest: vi.fn().mockResolvedValue({
		message: { id: 123 },
		apiRequest: { id: 456 }
	})
}));

// Import the function to test AFTER mocks are set up
import { processLLMRequest } from '$lib/services/llm/llmService';
import { llmProviderFactory } from '$lib/services/llm/providerFactory';

describe('LLM Service', () => {
	let abortSignal: AbortSignal;
	let abortController: AbortController;
	let mockUser: any;
	let mockModel: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Re-establish the mock implementation after clearing
		const mockGetProvider = llmProviderFactory.getProvider as Mock;
		mockGetProvider.mockImplementation(() => ({
			initializeClient: vi.fn(),
			processMessages: vi.fn().mockImplementation((messages) => {
				return { processedMessages: messages };
			}),
			createCompletionStream: vi.fn().mockImplementation(async () => {
				return {
					[Symbol.asyncIterator]: async function* () {
						yield { type: 'text', content: 'Hello' };
						yield { type: 'text', content: ' world' };
						yield {
							type: 'usage',
							usage: {
								prompt_tokens: 10,
								completion_tokens: 20,
								total_tokens: 30
							}
						};
					}
				};
			}),
			handleStreamChunk: vi.fn().mockImplementation((chunk, callbacks) => {
				if (chunk.type === 'text') {
					callbacks.onContent(chunk.content);
				} else if (chunk.type === 'usage') {
					callbacks.onUsage(chunk.usage, {
						input_price: 0.00001,
						output_price: 0.00003
					});
				}
				// Call onFirstChunk on first content
				if (chunk.type === 'text') {
					callbacks.onFirstChunk('req123', 'conv123');
				}
			})
		}));

		// Re-establish response finalizer mocks after clearing
		const { finalizeResponse, updateExistingMessageAndRequest } = await import(
			'$lib/utils/responseFinalizer'
		);
		(finalizeResponse as Mock).mockResolvedValue({
			message: { id: 456 },
			apiRequest: { id: 789 }
		});
		(updateExistingMessageAndRequest as Mock).mockResolvedValue({
			message: { id: 123 },
			apiRequest: { id: 456 }
		});

		// Set up abort controller for testing
		abortController = new AbortController();
		abortSignal = abortController.signal;

		// Create a standard mock user
		mockUser = {
			id: 'user123',
			email: 'test@example.com',
			payment_tier: PaymentTier.PayAsYouGo
		};

		// Create a standard mock model
		mockModel = {
			name: 'GPT-4',
			param: 'gpt-4',
			legacy: false,
			input_price: 0.00001,
			output_price: 0.00003,
			context_window: 8192,
			hub: 'openai',
			handlesImages: false,
			maxImages: 0,
			generatesImages: false,
			description: 'Most capable GPT-4 model',
			max_tokens: 4096,
			extendedThinking: false,
			max_input_per_request: 4096,
			severity: 0,
			reasons: true
		};

		// Mock crypto.randomUUID
		Object.defineProperty(global, 'crypto', {
			value: {
				randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000')
			}
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should process a request and return a readable stream', async () => {
		const config = {
			user: mockUser,
			model: mockModel,
			messages: [{ role: 'user', content: 'Hello' }],
			plainText: 'Hello',
			images: [],
			files: [],
			apiProvider: ApiProvider.openAI,
			messageConversationId: 'conv123',
			originalConversationId: 'new',
			referencedMessageIds: [],
			requestId: 'req123'
		};

		const stream = await processLLMRequest(config, abortSignal);

		// Check that the result is a ReadableStream
		expect(stream).toBeInstanceOf(ReadableStream);

		// Collect and check the output
		const reader = stream.getReader();
		const chunks: Uint8Array[] = [];

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		// Convert chunks to string
		const output = chunks.map((chunk) => new TextDecoder().decode(chunk)).join('');

		// Verify the output contains expected data
		expect(output).toContain('request_info');
		expect(output).toContain('text');
		expect(output).toContain('Hello');
		expect(output).toContain('world');
		expect(output).toContain('usage');
	});

	it('should handle regeneration requests correctly', async () => {
		const { updateExistingMessageAndRequest } = await import('$lib/utils/responseFinalizer');

		const config = {
			user: mockUser,
			model: mockModel,
			messages: [{ role: 'user', content: 'Hello' }],
			plainText: 'Hello',
			images: [],
			files: [],
			apiProvider: ApiProvider.openAI,
			regenerateMessageId: 123,
			messageConversationId: 'conv123',
			originalConversationId: 'conv123',
			referencedMessageIds: [],
			requestId: 'req123'
		};

		const stream = await processLLMRequest(config, abortSignal);

		// Consume the stream to trigger the finally block
		const reader = stream.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}

		// Verify that updateExistingMessageAndRequest was called for regeneration
		expect(updateExistingMessageAndRequest).toHaveBeenCalled();
	});

	it('should handle new conversation requests correctly', async () => {
		const { finalizeResponse } = await import('$lib/utils/responseFinalizer');

		const config = {
			user: mockUser,
			model: mockModel,
			messages: [{ role: 'user', content: 'Hello' }],
			plainText: 'Hello',
			images: [],
			files: [],
			apiProvider: ApiProvider.openAI,
			messageConversationId: 'conv123',
			originalConversationId: 'new', // 'new' means it's a new conversation
			referencedMessageIds: [],
			requestId: 'req123'
		};

		const stream = await processLLMRequest(config, abortSignal);

		// Consume the stream to trigger the finally block
		const reader = stream.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}

		// Verify that finalizeResponse was called for new messages
		expect(finalizeResponse).toHaveBeenCalled();
		expect(finalizeResponse).toHaveBeenCalledWith(
			expect.objectContaining({
				messageConversationId: 'conv123',
				originalConversationId: 'new'
			})
		);
	});

	it('should handle continuation of existing conversations', async () => {
		const { finalizeResponse } = await import('$lib/utils/responseFinalizer');

		const config = {
			user: mockUser,
			model: mockModel,
			messages: [
				{ role: 'user', content: 'Hello' },
				{ role: 'assistant', content: 'Hi there' },
				{ role: 'user', content: 'How are you?' }
			],
			plainText: 'How are you?',
			images: [],
			files: [],
			apiProvider: ApiProvider.openAI,
			messageConversationId: 'conv123',
			originalConversationId: 'conv123', // Existing conversation
			referencedMessageIds: [],
			requestId: 'req123'
		};

		const stream = await processLLMRequest(config, abortSignal);

		// Consume the stream to trigger the finally block
		const reader = stream.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}

		// Verify conversation ID is passed correctly
		expect(finalizeResponse).toHaveBeenCalled();
		expect(finalizeResponse).toHaveBeenCalledWith(
			expect.objectContaining({
				messageConversationId: 'conv123',
				originalConversationId: 'conv123'
			})
		);
	});

	it('should handle client disconnection gracefully', async () => {
		const config = {
			user: mockUser,
			model: mockModel,
			messages: [{ role: 'user', content: 'Hello' }],
			plainText: 'Hello',
			images: [],
			files: [],
			apiProvider: ApiProvider.openAI,
			messageConversationId: 'conv123',
			originalConversationId: 'new',
			referencedMessageIds: [],
			requestId: 'req123'
		};

		const streamPromise = processLLMRequest(config, abortSignal);

		// Simulate client disconnection
		abortController.abort();

		const stream = await streamPromise;
		const reader = stream.getReader();

		// Try to consume the stream despite the abort
		try {
			while (true) {
				const { done } = await reader.read();
				if (done) break;
			}
		} catch (err) {
			// Stream might be aborted, which is expected
		}

		// The test should complete without throwing errors
		expect(stream).toBeInstanceOf(ReadableStream);
	});

	it('should use the correct conversation ID in the response', async () => {
		const mockGetProvider = llmProviderFactory.getProvider as Mock;

		// Temporarily override the mock for this test
		const originalImplementation = mockGetProvider.getMockImplementation();
		mockGetProvider.mockImplementation(() => ({
			initializeClient: vi.fn(),
			processMessages: vi.fn().mockImplementation((messages) => {
				return { processedMessages: messages };
			}),
			createCompletionStream: vi.fn().mockImplementation(async () => {
				return {
					[Symbol.asyncIterator]: async function* () {
						yield { type: 'text', content: 'Hello' };
						yield { type: 'text', content: ' world' };
						yield {
							type: 'usage',
							usage: {
								prompt_tokens: 10,
								completion_tokens: 20,
								total_tokens: 30
							}
						};
					}
				};
			}),
			handleStreamChunk: vi.fn().mockImplementation((chunk, callbacks) => {
				if (chunk.type === 'text') {
					callbacks.onContent(chunk.content);
				} else if (chunk.type === 'usage') {
					callbacks.onUsage(chunk.usage, {
						input_price: 0.00001,
						output_price: 0.00003
					});
				}
				// Call onFirstChunk with new_conv_123 ID
				if (chunk.type === 'text') {
					callbacks.onFirstChunk('req123', 'new_conv_123');
				}
			})
		}));

		const config = {
			user: mockUser,
			model: mockModel,
			messages: [{ role: 'user', content: 'Hello' }],
			plainText: 'Hello',
			images: [],
			files: [],
			apiProvider: ApiProvider.openAI,
			messageConversationId: 'new_conv_123',
			originalConversationId: 'new', // "new" should trigger using messageConversationId
			referencedMessageIds: [],
			requestId: 'req123'
		};

		try {
			const stream = await processLLMRequest(config, abortSignal);
			const reader = stream.getReader();
			const chunks: Uint8Array[] = [];

			// Read all chunks
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				chunks.push(value);
			}

			// Convert chunks to string
			const output = chunks.map((chunk) => new TextDecoder().decode(chunk)).join('');

			// Verify that the new conversation ID was used
			expect(output).toContain('new_conv_123');
		} finally {
			// Restore the original mock implementation
			if (originalImplementation) {
				mockGetProvider.mockImplementation(originalImplementation);
			}
		}
	});

	it('should handle errors in the stream gracefully', async () => {
		const mockGetProvider = llmProviderFactory.getProvider as Mock;

		// Temporarily override the mock for this test
		const originalImplementation = mockGetProvider.getMockImplementation();
		mockGetProvider.mockImplementation(() => ({
			initializeClient: vi.fn(),
			processMessages: vi.fn().mockImplementation((messages) => {
				return { processedMessages: messages };
			}),
			createCompletionStream: vi.fn().mockImplementation(() => {
				throw new Error('Stream error');
			})
		}));

		const config = {
			user: mockUser,
			model: mockModel,
			messages: [{ role: 'user', content: 'Hello' }],
			plainText: 'Hello',
			images: [],
			files: [],
			apiProvider: ApiProvider.openAI,
			messageConversationId: 'conv123',
			originalConversationId: 'new',
			referencedMessageIds: [],
			requestId: 'req123'
		};

		try {
			// This should throw an error due to the createCompletionStream failure
			await expect(processLLMRequest(config, abortSignal)).rejects.toThrow();
		} finally {
			// Restore the original mock implementation
			if (originalImplementation) {
				mockGetProvider.mockImplementation(originalImplementation);
			}
		}
	});
});
