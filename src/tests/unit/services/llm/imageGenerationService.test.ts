/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleImageGeneration } from '$lib/services/llm/imageGenerationService';
import { PaymentTier, ApiProvider, ApiRequestStatus } from '@prisma/client';
import type { Model } from '$lib/types/types';
import type { User } from '@prisma/client';

// Mock OpenAI
vi.mock('openai', () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			images: {
				generate: vi.fn().mockResolvedValue({
					data: [
						{
							b64_json: 'mock_base64_image_data'
						}
					]
				})
			}
		}))
	};
});

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		VITE_OPENAI_API_KEY: 'test-api-key'
	}
}));

// Mock database operations
vi.mock('$lib/db/crud/apiRequest', () => ({
	createMessageAndApiRequestEntry: vi.fn().mockResolvedValue({
		message: { id: 123 },
		apiRequest: { id: 456 }
	})
}));

vi.mock('$lib/db/crud/balance', () => ({
	updateUserBalanceWithDeduction: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/db/crud/conversation', () => ({
	createConversation: vi.fn().mockResolvedValue({ id: 'conv123' }),
	updateConversationLastMessage: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/utils/titleGenerator', () => ({
	generateConversationTitle: vi.fn().mockResolvedValue('Generated Image: A cat')
}));

describe('Image Generation Service', () => {
	let mockUser: User;
	let mockModel: Model;
	let mockRequestBody: any;
	const mockRequestId = 'req123';

	beforeEach(() => {
		vi.clearAllMocks();

		mockUser = {
			id: 1,
			email: 'test@example.com',
			name: 'Test User',
			payment_tier: PaymentTier.PayAsYouGo,
			password_hash: null,
			oauth: null,
			oauth_link_token: null,
			reset_password_token: null,
			reset_expiration: null,
			stripe_id: null,
			email_verified: true,
			email_code: null,
			premium_until: null
		};

		mockModel = {
			name: 'DALL_E' as any,
			param: 'dall-e-3',
			legacy: false,
			input_price: 0,
			output_price: 0.04,
			context_window: 0,
			hub: 'openai',
			handlesImages: false,
			maxImages: 0,
			generatesImages: true,
			description: 'DALL-E 3 image generation model',
			max_tokens: 0,
			reasons: false,
			extendedThinking: false,
			max_input_per_request: 0,
			severity: 0
		} as Model;

		mockRequestBody = {
			plainTextPrompt: JSON.stringify('A cute cat sitting on a windowsill'),
			conversationId: null
		};
	});

	it('should generate an image successfully for PayAsYouGo user', async () => {
		const response = await handleImageGeneration(
			mockRequestBody,
			mockUser,
			mockModel,
			mockRequestId
		);

		// Check response
		expect(response).toBeInstanceOf(Response);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('X-Request-Id')).toBe(mockRequestId);

		// Parse response body
		const responseData = await response.json();
		expect(responseData.image).toBe('mock_base64_image_data');
		expect(responseData.outputPrice).toBe(0.04);

		// Verify OpenAI images.generate was called correctly
		const OpenAIModule = await import('openai');
		const mockOpenAI = vi.mocked(OpenAIModule.default);
		const mockInstance = mockOpenAI.mock.results[0]?.value;
		expect(mockInstance.images.generate).toHaveBeenCalledWith({
			model: 'dall-e-3',
			prompt: 'A cute cat sitting on a windowsill',
			n: 1,
			size: '1024x1024',
			response_format: 'b64_json'
		});

		// Verify balance deduction for PayAsYouGo user
		const { updateUserBalanceWithDeduction } = await import('$lib/db/crud/balance');
		expect(updateUserBalanceWithDeduction).toHaveBeenCalledWith(1, 0.04);

		// Verify API request was created
		const { createMessageAndApiRequestEntry } = await import('$lib/db/crud/apiRequest');
		expect(createMessageAndApiRequestEntry).toHaveBeenCalledWith(
			expect.objectContaining({
				prompt: 'A cute cat sitting on a windowsill',
				response: '[AI generated image]',
				pictures: expect.arrayContaining([
					expect.objectContaining({
						type: 'image',
						data: 'data:image/png;base64,mock_base64_image_data',
						media_type: 'image/png',
						width: 1024,
						height: 1024,
						ai: true
					})
				])
			}),
			expect.objectContaining({
				userId: 1,
				apiProvider: ApiProvider.openAI,
				apiModel: 'DALL_E',
				inputTokens: 0,
				inputCost: 0,
				outputTokens: 0,
				outputCost: 0.04,
				totalCost: 0.04,
				requestId: mockRequestId,
				status: ApiRequestStatus.COMPLETED
			})
		);
	});

	it('should generate an image for Premium user without balance deduction', async () => {
		const premiumUser = {
			...mockUser,
			payment_tier: PaymentTier.Premium
		};

		const response = await handleImageGeneration(
			mockRequestBody,
			premiumUser,
			mockModel,
			mockRequestId
		);

		// Check response
		expect(response).toBeInstanceOf(Response);
		const responseData = await response.json();
		expect(responseData.image).toBe('mock_base64_image_data');

		// Verify no balance deduction for Premium user
		const { updateUserBalanceWithDeduction } = await import('$lib/db/crud/balance');
		expect(updateUserBalanceWithDeduction).not.toHaveBeenCalled();
	});

	it('should create new conversation for Premium user without existing conversation', async () => {
		const premiumUser = {
			...mockUser,
			payment_tier: PaymentTier.Premium
		};

		const response = await handleImageGeneration(
			mockRequestBody,
			premiumUser,
			mockModel,
			mockRequestId
		);

		// Verify conversation was created
		const { createConversation } = await import('$lib/db/crud/conversation');
		const { generateConversationTitle } = await import('$lib/utils/titleGenerator');

		expect(generateConversationTitle).toHaveBeenCalledWith(
			'A cute cat sitting on a windowsill'
		);
		expect(createConversation).toHaveBeenCalledWith(1, 'Generated Image: A cat');

		// Verify conversation last message was updated
		const { updateConversationLastMessage } = await import('$lib/db/crud/conversation');
		expect(updateConversationLastMessage).toHaveBeenCalledWith('conv123');
	});

	it('should not create new conversation for Premium user with existing conversation', async () => {
		const premiumUser = {
			...mockUser,
			payment_tier: PaymentTier.Premium
		};

		const requestBodyWithConversation = {
			...mockRequestBody,
			conversationId: 'existing_conv_456'
		};

		const response = await handleImageGeneration(
			requestBodyWithConversation,
			premiumUser,
			mockModel,
			mockRequestId
		);

		// Verify no new conversation was created
		const { createConversation } = await import('$lib/db/crud/conversation');
		expect(createConversation).not.toHaveBeenCalled();

		// Verify existing conversation last message was updated
		const { updateConversationLastMessage } = await import('$lib/db/crud/conversation');
		expect(updateConversationLastMessage).toHaveBeenCalledWith('existing_conv_456');
	});

	it('should handle conversation title generation failure gracefully', async () => {
		const premiumUser = {
			...mockUser,
			payment_tier: PaymentTier.Premium
		};

		// Mock title generation to fail
		const { generateConversationTitle } = await import('$lib/utils/titleGenerator');
		(generateConversationTitle as any).mockRejectedValueOnce(
			new Error('Title generation failed')
		);

		// Spy on console.error
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await handleImageGeneration(
			mockRequestBody,
			premiumUser,
			mockModel,
			mockRequestId
		);

		// Should still succeed despite title generation failure
		expect(response).toBeInstanceOf(Response);
		const responseData = await response.json();
		expect(responseData.image).toBe('mock_base64_image_data');

		// Should log the error
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Error generating conversation title:',
			expect.any(Error)
		);

		consoleErrorSpy.mockRestore();
	});

	it('should handle different image models correctly', async () => {
		const dalleModel = {
			...mockModel,
			param: 'dall-e-2'
		};

		const response = await handleImageGeneration(
			mockRequestBody,
			mockUser,
			dalleModel,
			mockRequestId
		);

		// Verify OpenAI was called with correct model
		const OpenAIModule = await import('openai');
		const mockOpenAI = vi.mocked(OpenAIModule.default);
		const mockInstance = mockOpenAI.mock.results[0]?.value;
		expect(mockInstance.images.generate).toHaveBeenCalledWith({
			model: 'dall-e-2',
			prompt: 'A cute cat sitting on a windowsill',
			n: 1,
			size: '1024x1024',
			response_format: 'b64_json'
		});
	});

	it('should parse complex prompts correctly', async () => {
		const complexPrompt = {
			...mockRequestBody,
			plainTextPrompt: JSON.stringify(
				'A detailed digital art of a futuristic cityscape with flying cars and neon lights'
			)
		};

		const response = await handleImageGeneration(
			complexPrompt,
			mockUser,
			mockModel,
			mockRequestId
		);

		// Verify OpenAI was called with correct prompt
		const OpenAIModule = await import('openai');
		const mockOpenAI = vi.mocked(OpenAIModule.default);
		const mockInstance = mockOpenAI.mock.results[0]?.value;
		expect(mockInstance.images.generate).toHaveBeenCalledWith({
			model: 'dall-e-3',
			prompt: 'A detailed digital art of a futuristic cityscape with flying cars and neon lights',
			n: 1,
			size: '1024x1024',
			response_format: 'b64_json'
		});
	});

	it('should include proper CORS headers in response', async () => {
		const response = await handleImageGeneration(
			mockRequestBody,
			mockUser,
			mockModel,
			mockRequestId
		);

		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('Cache-Control')).toBe('no-cache');
		expect(response.headers.get('Connection')).toBe('keep-alive');
		expect(response.headers.get('X-Request-Id')).toBe(mockRequestId);
	});

	it('should handle PayAsYouGo user without conversation creation', async () => {
		const response = await handleImageGeneration(
			mockRequestBody,
			mockUser,
			mockModel,
			mockRequestId
		);

		// Verify no conversation was created for PayAsYouGo user
		const { createConversation } = await import('$lib/db/crud/conversation');
		expect(createConversation).not.toHaveBeenCalled();

		// Verify API request was created without conversation ID
		const { createMessageAndApiRequestEntry } = await import('$lib/db/crud/apiRequest');
		expect(createMessageAndApiRequestEntry).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				conversationId: null
			})
		);
	});

	it('should handle OpenAI API initialization with correct API key', async () => {
		const response = await handleImageGeneration(
			mockRequestBody,
			mockUser,
			mockModel,
			mockRequestId
		);

		// Verify OpenAI was initialized with correct API key
		const OpenAI = (await import('openai')).default;
		expect(OpenAI).toHaveBeenCalledWith({
			apiKey: 'test-api-key'
		});
	});
});
