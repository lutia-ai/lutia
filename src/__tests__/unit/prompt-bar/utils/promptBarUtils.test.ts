/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    formatPastedText, 
    filterModels, 
    getTextBeforeLastMention, 
    focusAtEnd,
    calculateTokensAndPrice,
    preparePromptWithAttachments
} from '$lib/components/prompt-bar/utils/promptBarUtils';
import type { Model, ModelDictionary, Message } from '$lib/types/types';
import type { ApiModel, ApiProvider } from '@prisma/client';
import * as tokenCounter from '$lib/models/cost-calculators/tokenCounter';
import * as imageCalculator from '$lib/models/cost-calculators/imageCalculator';
import * as modelUtils from '$lib/models/modelUtils';
import { modelDictionary } from '$lib/models/modelDictionary';

// Define mocks for token counting and image calculator
const mockEstimateTokenCount = vi.fn().mockImplementation(text => text.length / 4);
const mockCalculateImageCost = vi.fn().mockReturnValue({ tokens: 1000 });
const mockFormatModelName = vi.fn().mockImplementation(name => name.toUpperCase());

// Set up spies before tests run
beforeEach(() => {
    vi.spyOn(tokenCounter, 'estimateTokenCount').mockImplementation(mockEstimateTokenCount);
    vi.spyOn(imageCalculator, 'calculateImageCostByProvider').mockImplementation(mockCalculateImageCost);
    vi.spyOn(modelUtils, 'formatModelEnumToReadable').mockImplementation(mockFormatModelName);
});

// Clean up after tests
afterEach(() => {
    vi.restoreAllMocks();
});

describe('promptBarUtils', () => {
    describe('formatPastedText', () => {
        it('should replace newlines with <br> tags', () => {
            const result = formatPastedText('Line 1\nLine 2');
            expect(result).toContain('<br>');
            expect(result).not.toContain('\n');
        });

        it('should escape HTML entities', () => {
            const result = formatPastedText('<div>Test & "quote" \'single\'</div>');
            expect(result).not.toContain('<div>');
            expect(result).toContain('&lt;div&gt;');
            expect(result).toContain('&amp;');
            expect(result).toContain('&quot;');
            expect(result).toContain('&#039;');
        });

        it('should keep <br> tags unescaped', () => {
            const input = 'Line 1<br>Line 2';
            const result = formatPastedText(input);
            expect(result).toContain('<br>');
            expect(result).not.toContain('&lt;br&gt;');
        });
    });

    describe('filterModels', () => {
        it('should filter models by name', () => {
            const result = filterModels(modelDictionary, 'GPT_4');
            expect(result.length).toBeGreaterThan(0);
            // Check for any model with GPT_4 in its name
            expect(result.some(item => item.model.name.includes('GPT_4'))).toBe(true);
        });

        it('should filter models by company', () => {
            const result = filterModels(modelDictionary, 'anthropic');
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].company).toBe('anthropic');
        });

        it('should return empty array when no matches', () => {
            const result = filterModels(modelDictionary, 'nonexistent');
            expect(result).toHaveLength(0);
        });

        it('should be case-insensitive', () => {
            const result = filterModels(modelDictionary, 'GPT');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getTextBeforeLastMention', () => {
        it('should return text before the last @ symbol', () => {
            const result = getTextBeforeLastMention('Hello @user1 and @user2');
            expect(result).toBe('Hello @user1 and ');
        });

        it('should return empty string if content starts with @', () => {
            const result = getTextBeforeLastMention('@user');
            expect(result).toBe('');
        });

        it('should return original content if no @ exists', () => {
            const content = 'Hello there';
            const result = getTextBeforeLastMention(content);
            expect(result).toBe(content);
        });
    });

    describe('focusAtEnd', () => {
        it('should focus the element and move cursor to the end', () => {
            // Setup
            document.body.innerHTML = '<div id="test">Test content</div>';
            const element = document.getElementById('test')!;
            
            // Mock selection API
            const mockRange = {
                selectNodeContents: vi.fn(),
                collapse: vi.fn()
            };
            const mockSelection = {
                removeAllRanges: vi.fn(),
                addRange: vi.fn()
            };
            
            // Stub these methods
            vi.spyOn(document, 'createRange').mockReturnValue(mockRange as any);
            vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);
            vi.spyOn(element, 'focus').mockImplementation(() => {});
            
            // Execute
            focusAtEnd(element);
            
            // Assert
            expect(element.focus).toHaveBeenCalled();
            expect(document.createRange).toHaveBeenCalled();
            expect(mockRange.selectNodeContents).toHaveBeenCalledWith(element);
            expect(mockRange.collapse).toHaveBeenCalledWith(false);
            expect(mockSelection.removeAllRanges).toHaveBeenCalled();
            expect(mockSelection.addRange).toHaveBeenCalled();
        });
    });

    describe('calculateTokensAndPrice', () => {
        let mockModel: Model;
        let mockCompany: ApiProvider;
        let mockImages: any[];

        beforeEach(() => {
            // Use a real model from the dictionary
            mockModel = modelDictionary.openAI.models.gpt4o;
            mockCompany = 'openAI';
            mockImages = [{ url: 'image1.jpg' }, { url: 'image2.jpg' }];
            
            // Reset mocks for each test
            mockEstimateTokenCount.mockClear();
            mockCalculateImageCost.mockClear();
        });

        it('should return zero tokens and price for image generation models', async () => {
            // Use a real image generation model from the dictionary
            mockModel = modelDictionary.openAI.models.dalle3;
            const result = await calculateTokensAndPrice('Test prompt', [], mockModel, mockCompany);
            expect(result.tokens).toBe(0);
            expect(result.price).toBe(0);
        });

        it('should calculate tokens and price correctly for text', async () => {
            const prompt = 'This is a test prompt';
            
            // Set mock return value
            mockEstimateTokenCount.mockReturnValueOnce(5.75);
            
            const result = await calculateTokensAndPrice(prompt, [], mockModel, mockCompany);
            
            // Check mock was called
            expect(mockEstimateTokenCount).toHaveBeenCalled();
            
            // Check results
            expect(result.tokens).toBe(5.75);
            expect(result.price).toBeCloseTo((5.75 / 1000000) * mockModel.input_price, 10);
        });

        it('should add image tokens when model handles images', async () => {
            const prompt = 'Test with images';
            
            // Set mock return values
            mockEstimateTokenCount.mockReturnValueOnce(4.5);
            mockCalculateImageCost.mockReturnValueOnce({ tokens: 1000 });
            
            const result = await calculateTokensAndPrice(prompt, mockImages, mockModel, mockCompany);
            
            // Check mocks were called
            expect(mockEstimateTokenCount).toHaveBeenCalled();
            expect(mockCalculateImageCost).toHaveBeenCalled();
            
            // Check results
            expect(result.tokens).toBe(1004.5);
            expect(result.price).toBeCloseTo((1004.5 / 1000000) * mockModel.input_price, 10);
        });
    });

    describe('preparePromptWithAttachments', () => {
        const mockFiles = [
            { name: 'test.txt', content: 'This is test content' },
            { name: 'code.js', content: 'function test() { return true; }' }
        ];

        it('should append file info to string prompts', () => {
            const prompt = 'Check these files:';
            const result = preparePromptWithAttachments(prompt, mockFiles);
            
            expect(typeof result).toBe('string');
            expect(result as string).toContain('Check these files:');
            expect(result as string).toContain('File: test.txt');
            expect(result as string).toContain('Content: This is test content');
            expect(result as string).toContain('File: code.js');
            expect(result as string).toContain('function test()');
        });

        it('should truncate long file contents', () => {
            const longContent = 'a'.repeat(1000);
            const longFiles = [{ name: 'long.txt', content: longContent }];
            
            const result = preparePromptWithAttachments('Prompt', longFiles) as string;
            
            expect(result).toContain('a'.repeat(500));
            expect(result).toContain('...');
            expect(result).not.toContain('a'.repeat(501));
        });

        it('should add files as system messages for message arrays', () => {
            const messages: Message[] = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there' }
            ];
            
            const result = preparePromptWithAttachments(messages, mockFiles) as Message[];
            
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(4); // Original 2 messages + 2 system messages for files
            expect(result[0]).toEqual({ role: 'user', content: 'Hello' });
            expect(result[1]).toEqual({ role: 'assistant', content: 'Hi there' });
            expect(result[2].role).toBe('system');
            expect(result[2].content).toContain('File: test.txt');
            expect(result[3].role).toBe('system');
            expect(result[3].content).toContain('File: code.js');
        });
    });
}); 