/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
	estimateTokenCount,
	roundToTwoSignificantDigits
} from '$lib/models/cost-calculators/tokenCounter';

describe('Token Counter', () => {
	describe('estimateTokenCount', () => {
		it('should return 0 for empty text', () => {
			expect(estimateTokenCount('')).toBe(0);
			expect(estimateTokenCount('', 'simple')).toBe(0);
		});

		it('should estimate tokens correctly using the simple model', () => {
			// Simple model divides character count by 4
			expect(estimateTokenCount('hello', 'simple')).toBe(2); // 5 chars / 4 = 1.25, ceil to 2
			expect(estimateTokenCount('hello world', 'simple')).toBe(3); // 11 chars / 4 = 2.75, ceil to 3
			expect(estimateTokenCount('a'.repeat(16), 'simple')).toBe(4); // 16 chars / 4 = 4
		});

		it('should estimate tokens using the GPT model', () => {
			// Base GPT model uses more complex logic
			const result = estimateTokenCount('hello world');
			expect(result).toBeGreaterThan(0);
			// Should be roughly 1.3 tokens per word * 2 words * 1.1 buffer = ~2.86, ceil to 3
			expect(result).toBe(3);
		});

		it('should account for URLs in token estimation', () => {
			const textWithUrl = 'Check out https://example.com for more info';
			const textWithoutUrl = 'Check out example dot com for more info';

			// Text with URL should have more tokens
			expect(estimateTokenCount(textWithUrl)).toBeGreaterThan(
				estimateTokenCount(textWithoutUrl)
			);
		});

		it('should account for code blocks in token estimation', () => {
			const textWithCode = 'Here is some code: ```const x = 1;```';
			const textWithoutCode = 'Here is some code: const x = 1;';

			// Text with code block should have more tokens
			expect(estimateTokenCount(textWithCode)).toBeGreaterThan(
				estimateTokenCount(textWithoutCode)
			);
		});

		it('should account for non-Latin characters in token estimation', () => {
			const latinText = 'Hello world';
			const nonLatinText = 'こんにちは世界'; // Japanese "Hello World"

			// Normalize by word count for fair comparison
			const latinPerChar = estimateTokenCount(latinText) / latinText.length;
			const nonLatinPerChar = estimateTokenCount(nonLatinText) / nonLatinText.length;

			// Non-Latin text should use more tokens per character
			expect(nonLatinPerChar).toBeGreaterThan(latinPerChar);
		});
	});

	describe('roundToTwoSignificantDigits', () => {
		it('should return "0" for zero', () => {
			expect(roundToTwoSignificantDigits(0)).toBe('0');
		});

		it('should round to two significant digits for numbers < 1', () => {
			expect(roundToTwoSignificantDigits(0.0123)).toBe('0.012');
			expect(roundToTwoSignificantDigits(0.0765)).toBe('0.077');
			expect(roundToTwoSignificantDigits(0.00999)).toBe('0.0100');
		});

		it('should round to two significant digits for numbers ≥ 1', () => {
			expect(roundToTwoSignificantDigits(1.23)).toBe('1.2');
			expect(roundToTwoSignificantDigits(12.3456)).toBe('12');
			expect(roundToTwoSignificantDigits(123.456)).toBe('120');
			expect(roundToTwoSignificantDigits(1234.56)).toBe('1200');
		});

		it('should handle negative numbers correctly', () => {
			expect(roundToTwoSignificantDigits(-0.0123)).toBe('-0.012');
			expect(roundToTwoSignificantDigits(-1.23)).toBe('-1.2');
			expect(roundToTwoSignificantDigits(-123.456)).toBe('-120');
		});
	});
});
