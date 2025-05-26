/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateTokensAndPrice } from '$lib/components/prompt-bar/utils/promptBarUtils';
import { modelDictionary } from '$lib/models/modelDictionary';
import type { Model } from '$lib/types/types';
import type { ApiProvider } from '@prisma/client';

// Mock the token counter
vi.mock('$lib/models/cost-calculators/tokenCounter', () => ({
	estimateTokenCount: vi.fn((text) => {
		// Simulate real token counting behavior
		if (!text || text === '""' || text === '[]') return 0;
		return Math.ceil(text.length / 4);
	})
}));

// Mock the image calculator
vi.mock('$lib/models/cost-calculators/imageCalculator', () => ({
	calculateImageCostByProvider: vi.fn(() => ({ tokens: 0, cost: 0 }))
}));

/**
 * PromptBar Utility Function Tests
 * These tests focus on the core utility functions used by the PromptBar component,
 */
describe('PromptBar Utility Function Tests', () => {
	let mockModel: Model;
	let mockCompany: ApiProvider;

	beforeEach(() => {
		mockModel = modelDictionary.openAI.models.gpt4o;
		mockCompany = 'openAI';
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should show 0 tokens and 0 price when prompt is empty and context window is 0', async () => {
		const emptyPrompt = '';

		const result = await calculateTokensAndPrice(emptyPrompt, [], mockModel, mockCompany);

		expect(result.tokens).toBe(0);
		expect(result.price).toBe(0);
	});

	/**
	 * Test various empty prompt formats that should all return 0 tokens
	 */
	it('should return 0 tokens for various empty prompt formats', async () => {
		const emptyPrompts = ['', '<br>', '   ', '\n', '\t', '&nbsp;', '<br><br>', '  <br>  '];

		for (const emptyPrompt of emptyPrompts) {
			const result = await calculateTokensAndPrice(emptyPrompt, [], mockModel, mockCompany);

			expect(result.tokens).toBe(0);
			expect(result.price).toBe(0);
		}
	});

	/**
	 * Test for empty message arrays
	 */
	it('should return 0 tokens for empty message arrays', async () => {
		const emptyMessages: any[] = [];

		const result = await calculateTokensAndPrice(emptyMessages, [], mockModel, mockCompany);

		expect(result.tokens).toBe(0);
		expect(result.price).toBe(0);
	});

	/**
	 * Test for message arrays with empty content
	 */
	it('should return 0 tokens for message arrays with empty content', async () => {
		const messagesWithEmptyContent = [
			{ role: 'user' as const, content: '' },
			{ role: 'assistant' as const, content: '   ' },
			{ role: 'user' as const, content: '<br>' }
		];

		const result = await calculateTokensAndPrice(
			messagesWithEmptyContent,
			[],
			mockModel,
			mockCompany
		);

		expect(result.tokens).toBe(0);
		expect(result.price).toBe(0);
	});

	/**
	 * Test that non-empty prompt shows non-zero tokens
	 */
	it('should show non-zero tokens for non-empty prompt', async () => {
		const nonEmptyPrompt = 'Hello, how are you?';

		const result = await calculateTokensAndPrice(nonEmptyPrompt, [], mockModel, mockCompany);

		expect(result.tokens).toBeGreaterThan(0);
		expect(result.price).toBeGreaterThan(0);
	});

	/**
	 * Test that non-empty message arrays show non-zero tokens
	 */
	it('should show non-zero tokens for non-empty message arrays', async () => {
		const nonEmptyMessages = [
			{ role: 'user' as const, content: 'Hello' },
			{ role: 'assistant' as const, content: 'Hi there!' }
		];

		const result = await calculateTokensAndPrice(nonEmptyMessages, [], mockModel, mockCompany);

		expect(result.tokens).toBeGreaterThan(0);
		expect(result.price).toBeGreaterThan(0);
	});

	/**
	 * Test that image generation models return 0 tokens regardless of prompt
	 */
	it('should return 0 tokens for image generation models', async () => {
		const imageModel = modelDictionary.openAI.models.dalle3;
		const prompt = 'Generate an image of a cat';

		const result = await calculateTokensAndPrice(prompt, [], imageModel, mockCompany);

		expect(result.tokens).toBe(0);
		expect(result.price).toBe(0);
	});

	/**
	 * Test that <br> prompts return 0 tokens (special case)
	 */
	it('should return 0 tokens for <br> prompts', async () => {
		const brPrompt = '<br>';

		const result = await calculateTokensAndPrice(brPrompt, [], mockModel, mockCompany);

		expect(result.tokens).toBe(0);
		expect(result.price).toBe(0);
	});

	/**
	 * Test edge cases with mixed empty and whitespace content
	 */
	it('should handle edge cases with mixed empty content', async () => {
		const edgeCases = [
			'  \n  ', // Mixed whitespace
			'<br> \t <br>', // Break tags with whitespace
			'&nbsp;&nbsp;', // Multiple non-breaking spaces
			'\r\n\t' // Different line endings
		];

		for (const edgeCase of edgeCases) {
			const result = await calculateTokensAndPrice(edgeCase, [], mockModel, mockCompany);
			expect(result.tokens).toBe(0);
			expect(result.price).toBe(0);
		}
	});

	/**
	 * Test that the fix works correctly with file attachments
	 */
	it('should handle empty prompts with file attachments correctly', async () => {
		const emptyPrompt = '';
		const mockAttachments = [{ url: 'test.jpg' }];

		const result = await calculateTokensAndPrice(
			emptyPrompt,
			mockAttachments,
			mockModel,
			mockCompany
		);

		// Empty prompt should still return 0 tokens even with attachments
		// (The image processing would be handled separately)
		expect(result.tokens).toBe(0);
		expect(result.price).toBe(0);
	});
});
