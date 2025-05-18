/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { formatModelEnumToReadable, getModelFromName } from '$lib/models/modelUtils';
import { ApiModel } from '@prisma/client';
import type { Model } from '$lib/types/types';

// Define mocks with hoisted to make them available before imports
const mocks = vi.hoisted(() => {
	return {
		mockDictionary: {
			openAI: {
				models: {
					GPT_4o: {
						name: 'GPT_4o',
						param: '100k',
						hub: 'openai',
						input_price: 10,
						output_price: 30,
						context_window: 128000,
						legacy: false,
						handlesImages: true,
						maxImages: 30,
						generatesImages: false,
						reasons: true,
						extendedThinking: true,
						description: 'GPT-4o',
						max_input_per_request: 120000
					},
					GPT_4_Vision: {
						name: 'GPT_4_Vision',
						param: '128k',
						hub: 'openai',
						input_price: 10,
						output_price: 30,
						context_window: 128000,
						legacy: false,
						handlesImages: true,
						maxImages: 30,
						generatesImages: false,
						reasons: true,
						extendedThinking: true,
						description: 'GPT-4 Vision',
						max_input_per_request: 120000
					}
				}
			},
			anthropic: {
				models: {
					Claude_3_Opus: {
						name: 'Claude_3_Opus',
						param: '200k',
						hub: 'anthropic',
						input_price: 15,
						output_price: 75,
						context_window: 200000,
						legacy: false,
						handlesImages: true,
						maxImages: 20,
						generatesImages: false,
						reasons: false,
						extendedThinking: false,
						description: 'Claude 3 Opus',
						max_input_per_request: 150000
					}
				}
			}
		}
	};
});

// Mock the modelDictionary
vi.mock('$lib/models/modelDictionary', () => ({
	modelDictionary: mocks.mockDictionary
}));

describe('Model Utilities', () => {
	describe('formatModelEnumToReadable', () => {
		it('should replace underscores with spaces', () => {
			expect(formatModelEnumToReadable('GPT_4')).toBe('GPT 4');
			expect(formatModelEnumToReadable('Claude_3_Opus')).toBe('Claude 3 Opus');
		});

		it('should add periods for version numbers', () => {
			expect(formatModelEnumToReadable('GPT_3_5_Turbo')).toBe('GPT 3.5 Turbo');
			expect(formatModelEnumToReadable('Claude_2_1')).toBe('Claude 2.1');
		});

		it('should handle complex model names', () => {
			expect(formatModelEnumToReadable('GPT_4_Vision_Preview')).toBe('GPT 4 Vision Preview');
			expect(formatModelEnumToReadable('Claude_3_5_Sonnet')).toBe('Claude 3.5 Sonnet');
		});

		it('should handle empty strings', () => {
			expect(formatModelEnumToReadable('')).toBe('');
		});
	});

	describe('getModelFromName', () => {
		it('should return correct model for OpenAI models', () => {
			const model = getModelFromName(ApiModel.GPT_4o);
			expect(model).not.toBeNull();
			if (model) {
				expect(model.name).toBe('GPT_4o');
				expect(model.hub).toBe('openai');
			}
		});

		it('should return correct model for Anthropic models', () => {
			const model = getModelFromName(ApiModel.Claude_3_Opus);
			expect(model).not.toBeNull();
			if (model) {
				expect(model.name).toBe('Claude_3_Opus');
				expect(model.hub).toBe('anthropic');
			}
		});

		it('should return null for unknown models', () => {
			// Use a string that's not in our mock dictionary
			const model = getModelFromName('Unknown_Model' as ApiModel);
			expect(model).toBeNull();
		});
	});
});
