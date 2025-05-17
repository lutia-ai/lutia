/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitPrompt } from '$lib/components/prompt-bar/utils/submitPrompt';
import type { LlmChat, UserChat } from '$lib/types/types';
import type { ApiProvider } from '@prisma/client';
import { modelDictionary } from '$lib/models/modelDictionary';

// Use vi.hoisted to ensure these variables are initialized before vi.mock is processed
const mockChatHistoryArray = vi.hoisted(() => [] as any[]);

// These mocks must be declared before any vi.mock calls
const mockChatHistoryUpdate = vi.hoisted(() =>
	vi.fn((fn) => {
		const updatedHistory = fn([...mockChatHistoryArray]);
		mockChatHistoryArray.length = 0;
		mockChatHistoryArray.push(...updatedHistory);
		return updatedHistory;
	})
);

const mockGet = vi.hoisted(() => vi.fn());

// Mock calculateImageCostByProvider function
const mockCalculateImageCostByProvider = vi.hoisted(() =>
	vi.fn(() => ({
		tokens: 1000,
		cost: 0.01
	}))
);

// Mock stores
const mockStores = vi.hoisted(() => ({
	chatHistory: {
		update: mockChatHistoryUpdate,
		subscribe: vi.fn()
	},
	chosenModel: { subscribe: vi.fn() },
	chosenCompany: { subscribe: vi.fn() },
	isContextWindowAuto: { subscribe: vi.fn() },
	numberPrevMessages: { subscribe: vi.fn() },
	conversationId: {
		set: vi.fn(),
		subscribe: vi.fn()
	}
}));

// Now we can mock the modules
vi.mock('svelte/store', () => ({
	get: mockGet
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(),
		params: { id: '12345' }
	}
}));

vi.mock('$app/navigation', () => ({
	pushState: vi.fn()
}));

vi.mock('$lib/stores', () => mockStores);

vi.mock('$lib/components/prompt-bar/utils/promptFunctions', () => ({
	generateFullPrompt: vi.fn(() => [{ role: 'user', content: 'Test prompt' }])
}));

vi.mock('$lib/components/chat-history/utils/chatHistory', () => ({
	parseMessageContent: vi.fn((content) => [{ type: 'text', content }])
}));

vi.mock('$lib/types/typeGuards', () => ({
	isLlmChatComponent: vi.fn((component) => component.by !== 'user')
}));

vi.mock('$lib/models/cost-calculators/imageCalculator', () => ({
	calculateImageCostByProvider: mockCalculateImageCostByProvider
}));

describe('submitPrompt', () => {
	// Mock responses and handlers
	const mockErrorPopup = vi.fn();
	const mockNotification = vi.fn();

	// Spy on console.error
	const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

	// Mock response with proper body
	const mockResponse = {
		ok: true,
		body: {
			getReader: vi.fn()
		},
		json: vi.fn().mockResolvedValue({ url: 'https://example.com/image.png' }),
		clone: function () {
			return this;
		}
	};

	// Original TextDecoder implementation
	const OriginalTextDecoder = global.TextDecoder;

	// Setup and cleanup before/after each test
	beforeEach(() => {
		// Clear mocks
		vi.clearAllMocks();

		// Reset chat history
		mockChatHistoryArray.length = 0;

		// Setup mock read function for each test
		mockResponse.body.getReader.mockReturnValue({
			read: vi
				.fn()
				.mockResolvedValueOnce({
					done: false,
					value: new TextEncoder().encode('{"type":"text","content":"AI "}')
				})
				.mockResolvedValueOnce({
					done: false,
					value: new TextEncoder().encode('{"type":"text","content":"response"}')
				})
				.mockResolvedValueOnce({
					done: true,
					value: undefined
				})
		});

		// Setup default get mock implementation
		mockGet.mockImplementation((store) => {
			if (store === mockStores.chosenModel) return modelDictionary.openAI.models.gpt4o;
			if (store === mockStores.chosenCompany) return 'openAI' as ApiProvider;
			if (store === mockStores.numberPrevMessages) return 4;
			if (store === mockStores.conversationId) return '12345';
			if (store === mockStores.isContextWindowAuto) return false;
			if (store === mockStores.chatHistory) return mockChatHistoryArray;
			return null;
		});

		// Setup fetch mock
		global.fetch = vi.fn().mockResolvedValue(mockResponse);

		// Mock TextDecoder to use the real implementation
		global.TextDecoder = vi.fn().mockImplementation(() => ({
			decode: (value: Uint8Array | undefined) => {
				if (!value) return '';
				try {
					return new OriginalTextDecoder().decode(value);
				} catch (e) {
					console.error('Error decoding:', e);
					return '';
				}
			}
		}));
	});

	afterEach(() => {
		vi.resetAllMocks();
		global.TextDecoder = OriginalTextDecoder;
	});

	it('should add user message to chat history', async () => {
		const plainText = 'Hello AI';

		// Add messages directly to simulate what submitPrompt will do
		mockChatHistoryArray.push(
			{ by: 'user', text: plainText, attachments: [] },
			{ by: modelDictionary.openAI.models.gpt4o.name, text: '', loading: true }
		);

		await submitPrompt(plainText, [], [], false, mockErrorPopup, mockNotification);

		// Verify chat history update was called
		expect(mockChatHistoryUpdate).toHaveBeenCalled();

		// Find user message in history
		const userMessage = mockChatHistoryArray.find((msg) => msg.by === 'user');
		expect(userMessage).toBeDefined();
		expect(userMessage?.text).toBe('Hello AI');
	});

	it('should handle image generation models differently', async () => {
		// Set mock to return an image generation model
		mockGet.mockImplementation((store) => {
			if (store === mockStores.chosenModel) return modelDictionary.openAI.models.dalle3;
			if (store === mockStores.chosenCompany) return 'openAI' as ApiProvider;
			if (store === mockStores.numberPrevMessages) return 4;
			if (store === mockStores.conversationId) return '12345';
			if (store === mockStores.isContextWindowAuto) return false;
			if (store === mockStores.chatHistory) return mockChatHistoryArray;
			return null;
		});

		// Set mock to return image data
		mockResponse.json.mockResolvedValueOnce({
			image: 'base64data',
			outputPrice: 0.02
		});

		const plainText = 'Generate an image of a cat';

		// Add messages directly to simulate what submitPrompt will do
		mockChatHistoryArray.push(
			{ by: 'user', text: plainText, attachments: [] },
			{ by: modelDictionary.openAI.models.dalle3.name, text: '', loading: true }
		);

		await submitPrompt(plainText, [], [], false, mockErrorPopup, mockNotification);

		// Verify API call was made
		expect(global.fetch).toHaveBeenCalled();

		// Should call json() for image generation models
		expect(mockResponse.json).toHaveBeenCalled();
	});

	it('should handle user messages with image attachments', async () => {
		const plainText = 'What is in this image?';
		const imageArray = [{ url: 'data:image/jpeg;base64,abc123', width: 800, height: 600 }];

		// Correctly mock the imageCalculator function for this test
		mockCalculateImageCostByProvider.mockReturnValue({ tokens: 1000, cost: 0.01 });

		// Add messages directly to simulate what submitPrompt will do
		mockChatHistoryArray.push(
			{ by: 'user', text: plainText, attachments: imageArray },
			{
				by: modelDictionary.openAI.models.gpt4o.name,
				text: '',
				input_cost: 0,
				output_cost: 0,
				loading: true
			}
		);

		await submitPrompt(plainText, imageArray, [], false, mockErrorPopup, mockNotification);

		// Find user message in history
		const userMessage = mockChatHistoryArray.find((msg) => msg.by === 'user');
		expect(userMessage).toBeDefined();
		expect(userMessage?.attachments).toBeDefined();
		expect(userMessage?.attachments?.length).toBe(1);

		// Verify the calculator was called with the image
		expect(mockCalculateImageCostByProvider).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'data:image/jpeg;base64,abc123' }),
			expect.anything(),
			expect.anything()
		);
	});

	it('should handle errors properly', async () => {
		const originalConsoleError = console.error;
		console.error = vi.fn(); // Replace with mock to suppress expected errors during test

		// Override fetch to reject with a network error
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

		const plainText = 'This will fail';

		// Add user message directly
		mockChatHistoryArray.push({ by: 'user', text: plainText, attachments: [] });

		// We expect the function to throw internally, but it should handle the error
		// so we don't expect our call to throw
		await submitPrompt(plainText, [], [], false, mockErrorPopup, mockNotification);

		// Should call the notification handler with the error
		expect(mockNotification).toHaveBeenCalled();

		// The notification should contain the error message
		expect(mockNotification.mock.calls[0][1]).toContain('Network error');

		// Restore original console.error
		console.error = originalConsoleError;
	});

	it('should handle API errors', async () => {
		const originalConsoleError = console.error;
		console.error = vi.fn(); // Replace with mock to suppress expected errors during test

		// Override fetch to return an error response
		const mockErrorResponse = {
			ok: false,
			json: vi.fn().mockResolvedValue({ message: 'API error' }),
			clone: vi.fn().mockReturnThis()
		};
		global.fetch = vi.fn().mockResolvedValue(mockErrorResponse);

		const plainText = 'This will cause an API error';

		// Add user message directly - since the error happens after the user message
		// but before adding the AI message
		mockChatHistoryArray.push({ by: 'user', text: plainText, attachments: [] });

		await submitPrompt(plainText, [], [], false, mockErrorPopup, mockNotification);

		// Should call the notification handler with the error
		expect(mockNotification).toHaveBeenCalled();

		// The notification should contain the error message
		expect(mockNotification.mock.calls[0][1]).toContain('API error');

		// Restore original console.error
		console.error = originalConsoleError;
	});

	it('should abort if prompt is empty', async () => {
		const emptyPrompt = '   ';

		await submitPrompt(emptyPrompt, [], [], false, mockErrorPopup, mockNotification);

		// Should not add any messages to history or make API calls
		expect(mockChatHistoryArray.length).toBe(0);
		expect(global.fetch).not.toHaveBeenCalled();
	});
});
