/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { validateImageUpload } from '$lib/utils/imageValidation';
import type { Model, Image } from '$lib/types/types';
import { ApiModel } from '@prisma/client';

// Mock the formatModelEnumToReadable function
vi.mock('$lib/models/modelUtils', () => ({
	formatModelEnumToReadable: vi.fn((modelName: string) => {
		// Mock the function to return formatted names for testing
		if (modelName === 'Gemini_2_5_Pro') return 'Gemini 2.5 Pro';
		if (modelName === 'GPT_4o') return 'GPT 4o';
		if (modelName === 'GPT_3_5_Turbo') return 'GPT 3.5 Turbo';
		return modelName;
	})
}));

// Mock model data for testing
const mockGeminiModel: Model = {
	name: ApiModel.Gemini_2_5_Pro,
	param: 'gemini-2.5-pro',
	legacy: false,
	input_price: 1.25,
	output_price: 10,
	context_window: 1048576,
	hub: 'Xenova/gpt-4o',
	handlesImages: true,
	maxImages: 1, // Gemini supports only 1 image
	generatesImages: false,
	reasons: true,
	extendedThinking: false,
	description: 'State of the art reasoning model',
	max_input_per_request: 15000
};

const mockOpenAIModel: Model = {
	name: ApiModel.GPT_4o,
	param: 'gpt-4o',
	legacy: false,
	input_price: 2.5,
	output_price: 10,
	context_window: 128000,
	hub: 'Xenova/gpt-4o',
	handlesImages: true,
	maxImages: 5, // OpenAI supports up to 5 images
	generatesImages: false,
	reasons: false,
	extendedThinking: false,
	description: 'Versatile, high-intelligence flagship model',
	max_input_per_request: 10000
};

const mockTextOnlyModel: Model = {
	name: ApiModel.GPT_3_5_Turbo,
	param: 'gpt-3.5-turbo',
	legacy: true,
	input_price: 0.5,
	output_price: 1.5,
	context_window: 16385,
	hub: 'Xenova/gpt-3.5-turbo',
	handlesImages: false,
	maxImages: 0, // No image support
	generatesImages: false,
	reasons: false,
	extendedThinking: false,
	description: 'Fast and affordable small model',
	max_input_per_request: 15000
};

// Mock image data
const mockImage: Image = {
	type: 'image',
	data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD',
	media_type: 'image/jpeg',
	width: 400,
	height: 300
};

describe('validateImageUpload', () => {
	/**
	 * Test validation with models that don't support images
	 */
	it("should reject image upload for models that don't handle images", () => {
		const result = validateImageUpload([], 1, mockTextOnlyModel);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("GPT 3.5 Turbo doesn't support image uploads");
		expect(result.maxImages).toBe(0);
	});

	/**
	 * Test validation for Gemini models (maxImages = 1)
	 */
	it('should allow 1 image for Gemini model when no images exist', () => {
		const result = validateImageUpload([], 1, mockGeminiModel);

		expect(result.isValid).toBe(true);
		expect(result.maxImages).toBe(1);
	});

	it('should reject additional images for Gemini model when 1 image already exists', () => {
		const currentImages = [mockImage];
		const result = validateImageUpload(currentImages, 1, mockGeminiModel);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('Maximum of 1 image allowed for Gemini 2.5 Pro');
		expect(result.errorMessage).toContain('Remove existing images to add new ones');
		expect(result.maxImages).toBe(1);
	});

	it('should reject multiple images for Gemini model when no images exist', () => {
		const result = validateImageUpload([], 2, mockGeminiModel);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('Maximum of 1 image allowed for Gemini 2.5 Pro');
		expect(result.errorMessage).toContain('You can only add 1 more image');
		expect(result.maxImages).toBe(1);
	});

	/**
	 * Test validation for OpenAI models (maxImages = 5)
	 */
	it('should allow images for OpenAI model within limit', () => {
		const currentImages = [mockImage, mockImage]; // 2 existing images
		const result = validateImageUpload(currentImages, 2, mockOpenAIModel); // Adding 2 more (total 4)

		expect(result.isValid).toBe(true);
		expect(result.maxImages).toBe(5);
	});

	it('should reject images for OpenAI model that exceed limit', () => {
		const currentImages = [mockImage, mockImage, mockImage]; // 3 existing images
		const result = validateImageUpload(currentImages, 3, mockOpenAIModel); // Adding 3 more (total 6 > 5)

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('Maximum of 5 images allowed for GPT 4o');
		expect(result.errorMessage).toContain('You can only add 2 more images');
		expect(result.maxImages).toBe(5);
	});

	it('should reject images for OpenAI model when at maximum capacity', () => {
		const currentImages = Array(5).fill(mockImage); // 5 existing images (at limit)
		const result = validateImageUpload(currentImages, 1, mockOpenAIModel);

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('Maximum of 5 images allowed for GPT 4o');
		expect(result.errorMessage).toContain('Remove existing images to add new ones');
		expect(result.maxImages).toBe(5);
	});

	/**
	 * Test edge cases
	 */
	it('should handle zero new images being added', () => {
		const currentImages = [mockImage];
		const result = validateImageUpload(currentImages, 0, mockGeminiModel);

		expect(result.isValid).toBe(true);
		expect(result.maxImages).toBe(1);
	});

	it('should handle empty current images array', () => {
		const result = validateImageUpload([], 1, mockOpenAIModel);

		expect(result.isValid).toBe(true);
		expect(result.maxImages).toBe(5);
	});
});
