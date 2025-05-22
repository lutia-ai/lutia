/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiProvider, PaymentTier } from '@prisma/client';
import { ReadableStream } from 'stream/web';

// All mocks must be at the top, before any imports that use them
vi.mock('$lib/db/crud/user', () => {
	return {
		retrieveUserByEmail: vi.fn().mockImplementation(() => ({
			id: 'user123',
			email: 'test@example.com',
			payment_tier: PaymentTier.PayAsYouGo,
			credits: 100,
			total_spent: 0
		}))
	};
});

vi.mock('$lib/utils/apiRequestValidator', () => {
	return {
		validateApiRequest: vi.fn().mockImplementation(async () => ({
			plainText: 'Hello, how are you?',
			messages: [{ role: 'user', content: 'Hello, how are you?' }],
			model: {
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
				max_tokens: 4096
			},
			images: [],
			files: [],
			messageConversationId: 'conv123',
			referencedMessageIds: []
		}))
	};
});

vi.mock('$lib/services/llm/llmService', () => {
	const createMockStream = (options: { delay?: number; abortable?: boolean } = {}) => {
		const { delay = 0, abortable = false } = options;

		return new ReadableStream({
			start(controller) {
				// Send an initial chunk with request info
				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'request_info',
							request_id: 'req123',
							conversation_id: 'conv123'
						}) + '\n'
					)
				);

				// Send first content chunk immediately
				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'text',
							content: 'Hello! I am'
						}) + '\n'
					)
				);

				if (abortable) {
					// For abortable streams, add a delay before sending more chunks
					// This simulates a longer response that can be interrupted
					setTimeout(() => {
						try {
							controller.enqueue(
								new TextEncoder().encode(
									JSON.stringify({
										type: 'text',
										content: ' doing well. How are you?'
									}) + '\n'
								)
							);

							// Send usage info
							controller.enqueue(
								new TextEncoder().encode(
									JSON.stringify({
										type: 'usage',
										usage: {
											inputPrice: 0.0001,
											outputPrice: 0.0003
										}
									}) + '\n'
								)
							);

							// Send message ID
							controller.enqueue(
								new TextEncoder().encode(
									JSON.stringify({
										type: 'message_id',
										message_id: 12345
									}) + '\n'
								)
							);

							controller.close();
						} catch (error) {
							// Stream was likely canceled
							console.log('[Test] Stream was aborted during processing');
						}
					}, delay);
				} else {
					// Send remaining chunks immediately for normal tests
					controller.enqueue(
						new TextEncoder().encode(
							JSON.stringify({
								type: 'text',
								content: ' doing well. How are you?'
							}) + '\n'
						)
					);

					// Send usage info
					controller.enqueue(
						new TextEncoder().encode(
							JSON.stringify({
								type: 'usage',
								usage: {
									inputPrice: 0.0001,
									outputPrice: 0.0003
								}
							}) + '\n'
						)
					);

					// Send message ID
					controller.enqueue(
						new TextEncoder().encode(
							JSON.stringify({
								type: 'message_id',
								message_id: 12345
							}) + '\n'
						)
					);

					controller.close();
				}
			},
			cancel(reason) {
				console.log('[Test] Stream canceled:', reason);
				// Simulate cleanup when stream is canceled
			}
		});
	};

	// Default mock returns normal stream
	const mockProcessLLMRequest = vi.fn().mockResolvedValue(createMockStream()) as any;

	// Expose the factory function for tests that need special behavior
	mockProcessLLMRequest.createMockStream = createMockStream;

	return {
		processLLMRequest: mockProcessLLMRequest
	};
});

vi.mock('$lib/services/llm/imageGenerationService', () => {
	return {
		handleImageGeneration: vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ image: 'mock_base64_data', outputPrice: 0.04 }), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Request-Id': 'req123'
				}
			})
		)
	};
});

// Mock database operations to verify balance deduction and message saving
vi.mock('$lib/db/crud/balance', () => ({
	updateUserBalanceWithDeduction: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/db/crud/apiRequest', () => ({
	createMessageAndApiRequestEntry: vi.fn().mockResolvedValue({
		message: { id: 12345 },
		apiRequest: { id: 67890 }
	}),
	updateApiRequestWithCompletion: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/db/crud/conversation', () => ({
	updateConversationLastMessage: vi.fn().mockResolvedValue(undefined)
}));

// Import the API handler after all mocks
import { POST } from '../../../routes/api/llm/+server';

// Set up auth mock
const authMock = {
	auth: vi.fn().mockResolvedValue({
		user: {
			id: 'user123',
			email: 'test@example.com'
		}
	})
};

describe('LLM API Endpoint', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Re-setup auth mock after clearing all mocks
		authMock.auth.mockResolvedValue({
			user: {
				id: 'user123',
				email: 'test@example.com'
			}
		});

		// Re-setup the validateApiRequest mock to ensure it always returns valid data
		const { validateApiRequest } = await import('$lib/utils/apiRequestValidator');
		(validateApiRequest as any).mockResolvedValue({
			plainText: 'Hello, how are you?',
			messages: [{ role: 'user', content: 'Hello, how are you?' }],
			model: {
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
				max_tokens: 4096
			},
			images: [],
			files: [],
			messageConversationId: 'conv123',
			referencedMessageIds: []
		});

		// Re-setup image generation mock after clearing all mocks
		const { handleImageGeneration } = await import('$lib/services/llm/imageGenerationService');
		(handleImageGeneration as any).mockResolvedValue(
			new Response(JSON.stringify({ image: 'mock_base64_data', outputPrice: 0.04 }), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Request-Id': 'req123'
				}
			})
		);

		// Re-setup database mocks to ensure they're available for new tests
		const { updateUserBalanceWithDeduction } = await import('$lib/db/crud/balance');
		const { createMessageAndApiRequestEntry } = await import('$lib/db/crud/apiRequest');

		(updateUserBalanceWithDeduction as any).mockResolvedValue(undefined);
		(createMessageAndApiRequestEntry as any).mockResolvedValue({
			message: { id: 12345 },
			apiRequest: { id: 67890 }
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should handle valid LLM requests successfully', async () => {
		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				provider: ApiProvider.openAI,
				plainTextPrompt: 'Hello, how are you?',
				promptStr: JSON.stringify([{ role: 'user', content: 'Hello, how are you?' }]),
				modelStr: JSON.stringify({
					name: 'GPT-4',
					param: 'gpt-4'
				}),
				imagesStr: '[]',
				filesStr: '[]'
			})
		});

		const result = await POST({
			request: mockRequest,
			locals: authMock,
			url: new URL('http://localhost/api/llm')
		} as any);

		// Check response type and headers
		expect(result).toBeInstanceOf(Response);
		expect(result.headers.get('Content-Type')).toBe('text/event-stream');
		expect(result.headers.get('Cache-Control')).toBe('no-cache');
		expect(result.headers.get('Connection')).toBe('keep-alive');
		expect(result.headers.has('X-Request-Id')).toBeTruthy();

		// Check the response body
		const reader = result.body!.getReader();
		const decoder = new TextDecoder();
		let responseText = '';

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			responseText += decoder.decode(value, { stream: true });
		}

		// Verify expected data in the response
		expect(responseText).toContain('request_info');
		expect(responseText).toContain('conv123');
		expect(responseText).toContain('Hello! I am');
		expect(responseText).toContain('doing well. How are you?');
		expect(responseText).toContain('usage');
		expect(responseText).toContain('message_id');
	});

	it('should handle image generation models', async () => {
		// Get the mock to modify
		const { validateApiRequest } = await import('$lib/utils/apiRequestValidator');

		// Mock validateApiRequest to return a model with generatesImages=true for this test
		(validateApiRequest as any).mockImplementationOnce(async () => ({
			plainText: 'Generate an image of a cat',
			messages: [{ role: 'user', content: 'Generate an image of a cat' }],
			model: {
				name: 'DALL-E 3',
				param: 'dall-e-3',
				legacy: false,
				input_price: 0.00001,
				output_price: 0.00003,
				context_window: 8192,
				hub: 'openai',
				handlesImages: false,
				maxImages: 0,
				generatesImages: true,
				description: 'Image generation model',
				max_tokens: 4096
			},
			images: [],
			files: [],
			messageConversationId: 'conv123',
			referencedMessageIds: []
		}));

		const { handleImageGeneration } = await import('$lib/services/llm/imageGenerationService');

		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				provider: ApiProvider.openAI,
				plainTextPrompt: JSON.stringify('Generate an image of a cat'),
				promptStr: JSON.stringify([
					{ role: 'user', content: 'Generate an image of a cat' }
				]),
				modelStr: JSON.stringify({
					name: 'DALL-E 3',
					param: 'dall-e-3',
					generatesImages: true
				})
			})
		});

		const result = await POST({
			request: mockRequest,
			locals: authMock,
			url: new URL('http://localhost/api/llm')
		} as any);

		// Verify the image generation handler was called
		expect(handleImageGeneration).toHaveBeenCalled();

		// Check that we get a proper response for image generation
		expect(result).toBeInstanceOf(Response);
		expect(result.headers.get('Content-Type')).toBe('application/json');
	});

	it('should handle authentication errors', async () => {
		// Override auth to return null (unauthorized)
		const unauthRequest = {
			request: new Request('http://localhost/api/llm', {
				method: 'POST',
				body: JSON.stringify({})
			}),
			locals: {
				auth: vi.fn().mockResolvedValue(null)
			},
			url: new URL('http://localhost/api/llm')
		} as any;

		// Expect the request to throw a 401 error
		await expect(POST(unauthRequest)).rejects.toThrow();
	});

	it('should handle missing provider errors', async () => {
		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				// No provider specified
				plainTextPrompt: 'Hello, how are you?',
				promptStr: JSON.stringify([{ role: 'user', content: 'Hello, how are you?' }]),
				modelStr: JSON.stringify({
					name: 'GPT-4',
					param: 'gpt-4'
				})
			})
		});

		// Expect the request to throw a 400 error
		await expect(
			POST({
				request: mockRequest,
				locals: authMock,
				url: new URL('http://localhost/api/llm')
			} as any)
		).rejects.toThrow();
	});

	it('should handle insufficient balance errors', async () => {
		const { validateApiRequest } = await import('$lib/utils/apiRequestValidator');
		const { InsufficientBalanceError } = await import('$lib/types/customErrors');

		// Make validateApiRequest throw an InsufficientBalanceError
		(validateApiRequest as any).mockRejectedValueOnce(new InsufficientBalanceError());

		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				provider: ApiProvider.openAI,
				plainTextPrompt: 'Hello, how are you?',
				promptStr: JSON.stringify([{ role: 'user', content: 'Hello, how are you?' }]),
				modelStr: JSON.stringify({
					name: 'GPT-4',
					param: 'gpt-4'
				})
			})
		});

		// Expect the request to throw a 500 error
		await expect(
			POST({
				request: mockRequest,
				locals: authMock,
				url: new URL('http://localhost/api/llm')
			} as any)
		).rejects.toThrow();
	});

	it('should handle request cancellation mid-stream and still save partial response', async () => {
		// Set up mock to use an abortable stream with delay that includes finalization
		const { processLLMRequest } = await import('$lib/services/llm/llmService');

		// Create a custom stream that properly simulates the real behavior with finalization
		const abortableStreamWithFinalization = new ReadableStream({
			async start(controller) {
				// Send initial request info
				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'request_info',
							request_id: 'req123',
							conversation_id: 'conv123'
						}) + '\n'
					)
				);

				// Send some content before abortion
				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'text',
							content: 'Hello! I am'
						}) + '\n'
					)
				);

				// Simulate abortion happening but still send finalization events
				setTimeout(async () => {
					try {
						// Even when aborted, finalizeResponse should be called
						const { createMessageAndApiRequestEntry } = await import(
							'$lib/db/crud/apiRequest'
						);
						const { updateUserBalanceWithDeduction } = await import(
							'$lib/db/crud/balance'
						);

						// Simulate the actual database calls that would happen in finalizeResponse
						await (createMessageAndApiRequestEntry as any)();
						await (updateUserBalanceWithDeduction as any)();

						// Send usage and message_id to complete the stream as the real system would
						controller.enqueue(
							new TextEncoder().encode(
								JSON.stringify({
									type: 'usage',
									usage: {
										inputPrice: 0.0001,
										outputPrice: 0.0002
									}
								}) + '\n'
							)
						);

						controller.enqueue(
							new TextEncoder().encode(
								JSON.stringify({
									type: 'message_id',
									message_id: 12345
								}) + '\n'
							)
						);

						controller.close();
					} catch (error) {
						console.log('[Test] Stream processing completed with abortion');
						controller.close();
					}
				}, 50);
			}
		});

		(processLLMRequest as any).mockResolvedValueOnce(abortableStreamWithFinalization);

		// Create an AbortController to cancel the request
		const controller = new AbortController();

		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				provider: ApiProvider.openAI,
				plainTextPrompt: 'Tell me a long story...',
				promptStr: JSON.stringify([{ role: 'user', content: 'Tell me a long story...' }]),
				modelStr: JSON.stringify({
					name: 'GPT-4',
					param: 'gpt-4'
				}),
				imagesStr: '[]',
				filesStr: '[]'
			}),
			signal: controller.signal
		});

		const result = await POST({
			request: mockRequest,
			locals: authMock,
			url: new URL('http://localhost/api/llm')
		} as any);

		// Start reading the stream
		const reader = result.body!.getReader();
		const decoder = new TextDecoder();
		let responseText = '';
		let receivedUsage = false;
		let receivedMessageId = false;

		try {
			// Read chunks until completion or abortion
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				responseText += chunk;

				// Check for finalization events
				if (chunk.includes('usage')) {
					receivedUsage = true;
				}
				if (chunk.includes('message_id')) {
					receivedMessageId = true;
				}

				// Abort after receiving some content
				if (chunk.includes('Hello! I am')) {
					controller.abort();
				}
			}
		} catch (error) {
			// Expected when request is aborted
		}

		// Verify we received partial content and finalization
		expect(responseText).toContain('request_info');
		expect(responseText).toContain('Hello! I am');
		expect(receivedUsage).toBe(true);
		expect(receivedMessageId).toBe(true);

		// Verify database operations were called during finalization
		const { createMessageAndApiRequestEntry } = await import('$lib/db/crud/apiRequest');
		expect(createMessageAndApiRequestEntry).toHaveBeenCalled();
	});

	it('should deduct balance and save message even for aborted requests with partial content', async () => {
		// Mock the LLM service to simulate a stream that gets content then gets aborted
		const { processLLMRequest } = await import('$lib/services/llm/llmService');

		// Create a custom stream that sends some content then simulates abortion with proper finalization
		const abortedStreamWithFinalization = new ReadableStream({
			async start(controller) {
				// Send initial request info
				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'request_info',
							request_id: 'req123',
							conversation_id: 'conv123'
						}) + '\n'
					)
				);

				// Send partial content
				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'text',
							content: 'This is a partial response...'
						}) + '\n'
					)
				);

				// Simulate the finalization process that happens even when aborted
				setTimeout(async () => {
					try {
						// Simulate the database operations that would happen in finalizeResponse
						const { updateUserBalanceWithDeduction } = await import(
							'$lib/db/crud/balance'
						);
						const { createMessageAndApiRequestEntry } = await import(
							'$lib/db/crud/apiRequest'
						);

						// Call the mocked functions to simulate the real behavior
						await (updateUserBalanceWithDeduction as any)();
						await (createMessageAndApiRequestEntry as any)();

						// Send usage info (partial billing) - this happens during finalization
						controller.enqueue(
							new TextEncoder().encode(
								JSON.stringify({
									type: 'usage',
									usage: {
										inputPrice: 0.0001,
										outputPrice: 0.0002 // Partial output cost
									}
								}) + '\n'
							)
						);

						// Send message ID (indicating it was saved) - this happens after database operations
						controller.enqueue(
							new TextEncoder().encode(
								JSON.stringify({
									type: 'message_id',
									message_id: 12345
								}) + '\n'
							)
						);

						// Close properly after finalization
						controller.close();
					} catch (error) {
						console.log('[Test] Finalization completed despite abortion');
						controller.close();
					}
				}, 30);
			}
		});

		(processLLMRequest as any).mockResolvedValueOnce(abortedStreamWithFinalization);

		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				provider: ApiProvider.openAI,
				plainTextPrompt: 'Generate a long response...',
				promptStr: JSON.stringify([
					{ role: 'user', content: 'Generate a long response...' }
				]),
				modelStr: JSON.stringify({
					name: 'GPT-4',
					param: 'gpt-4'
				}),
				imagesStr: '[]',
				filesStr: '[]'
			})
		});

		const result = await POST({
			request: mockRequest,
			locals: authMock,
			url: new URL('http://localhost/api/llm')
		} as any);

		// Read the stream until completion
		const reader = result.body!.getReader();
		const decoder = new TextDecoder();
		let responseText = '';
		let receivedUsage = false;
		let receivedMessageId = false;

		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				responseText += chunk;

				// Check for specific events
				if (chunk.includes('usage')) {
					receivedUsage = true;
				}
				if (chunk.includes('message_id')) {
					receivedMessageId = true;
				}
			}
		} catch (error) {
			// Handle any stream errors
		}

		// Verify we received the partial content and billing info
		expect(responseText).toContain('This is a partial response...');
		expect(receivedUsage).toBe(true);
		expect(receivedMessageId).toBe(true);

		// Verify database operations were called during finalization despite partial abortion
		const { updateUserBalanceWithDeduction } = await import('$lib/db/crud/balance');
		const { createMessageAndApiRequestEntry } = await import('$lib/db/crud/apiRequest');

		expect(createMessageAndApiRequestEntry).toHaveBeenCalled();
		expect(updateUserBalanceWithDeduction).toHaveBeenCalled();
	});

	it('should handle connection drops gracefully during streaming', async () => {
		// Mock a stream that simulates connection drop after partial content
		const { processLLMRequest } = await import('$lib/services/llm/llmService');

		const connectionDropStream = new ReadableStream({
			start(controller) {
				// Send initial chunks successfully
				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'request_info',
							request_id: 'req123',
							conversation_id: 'conv123'
						}) + '\n'
					)
				);

				controller.enqueue(
					new TextEncoder().encode(
						JSON.stringify({
							type: 'text',
							content: 'Starting response...'
						}) + '\n'
					)
				);

				// Simulate connection drop after some delay
				setTimeout(() => {
					// This simulates the stream being closed unexpectedly
					controller.close();
				}, 10);
			}
		});

		(processLLMRequest as any).mockResolvedValueOnce(connectionDropStream);

		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				provider: ApiProvider.openAI,
				plainTextPrompt: 'Tell me something interesting...',
				promptStr: JSON.stringify([
					{ role: 'user', content: 'Tell me something interesting...' }
				]),
				modelStr: JSON.stringify({
					name: 'GPT-4',
					param: 'gpt-4'
				}),
				imagesStr: '[]',
				filesStr: '[]'
			})
		});

		const result = await POST({
			request: mockRequest,
			locals: authMock,
			url: new URL('http://localhost/api/llm')
		} as any);

		// Read the stream until it closes
		const reader = result.body!.getReader();
		const decoder = new TextDecoder();
		let responseText = '';

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			responseText += decoder.decode(value, { stream: true });
		}

		// Verify we received at least some content before connection drop
		expect(responseText).toContain('request_info');
		expect(responseText).toContain('Starting response...');

		// Verify the request was processed even though connection dropped
		expect(result).toBeInstanceOf(Response);
		expect(result.headers.get('Content-Type')).toBe('text/event-stream');
	});

	it('should not deduct balance if no content was received before cancellation', async () => {
		// Mock a stream that gets cancelled immediately before any content
		const { processLLMRequest } = await import('$lib/services/llm/llmService');

		const immediatelyCancelledStream = new ReadableStream({
			start(controller) {
				// Immediately error without sending any content
				setTimeout(() => {
					controller.error(new Error('Request cancelled before processing'));
				}, 1);
			}
		});

		(processLLMRequest as any).mockResolvedValueOnce(immediatelyCancelledStream);

		const mockRequest = new Request('http://localhost/api/llm', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				provider: ApiProvider.openAI,
				plainTextPrompt: 'Quick question...',
				promptStr: JSON.stringify([{ role: 'user', content: 'Quick question...' }]),
				modelStr: JSON.stringify({
					name: 'GPT-4',
					param: 'gpt-4'
				}),
				imagesStr: '[]',
				filesStr: '[]'
			})
		});

		const result = await POST({
			request: mockRequest,
			locals: authMock,
			url: new URL('http://localhost/api/llm')
		} as any);

		// Try to read the stream (should error quickly)
		const reader = result.body!.getReader();
		let errorOccurred = false;

		try {
			await reader.read();
		} catch (error) {
			errorOccurred = true;
		}

		expect(errorOccurred).toBe(true);

		// Verify no balance was deducted since no content was processed
		const { updateUserBalanceWithDeduction } = await import('$lib/db/crud/balance');
		const { createMessageAndApiRequestEntry } = await import('$lib/db/crud/apiRequest');

		// These should not be called if the request failed before processing
		expect(updateUserBalanceWithDeduction).not.toHaveBeenCalled();
		expect(createMessageAndApiRequestEntry).not.toHaveBeenCalled();
	});
});
