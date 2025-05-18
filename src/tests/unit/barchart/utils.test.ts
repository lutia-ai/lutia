/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { bumps, pivot, capitalizeFirstLetter } from '$lib/components/barchart/utils';

describe('barchart utils', () => {
	/**
	 * Test the bumps function that creates random data
	 */
	it('should generate an array of non-negative values with bumps function', () => {
		const result = bumps(10);

		// Check that the result is an array of the expected length
		expect(result).toHaveLength(10);

		// Check that all values are non-negative
		expect(result.every((val) => val >= 0)).toBe(true);

		// Check that values have variation (not all the same)
		const uniqueValues = new Set(result);
		expect(uniqueValues.size).toBeGreaterThan(1);
	});

	/**
	 * Test the pivot function that transforms data for stacking
	 */
	it('should pivot data correctly', () => {
		interface TestData {
			date: string;
			model: string;
			value: number;
		}

		const testData: TestData[] = [
			{ date: '2023-01-01', model: 'GPT-4', value: 10 },
			{ date: '2023-01-01', model: 'Claude', value: 20 },
			{ date: '2023-01-02', model: 'GPT-4', value: 15 },
			{ date: '2023-01-02', model: 'Claude', value: 25 }
		];

		const result = pivot(testData, 'date', 'model', (items: TestData[]) => {
			return items.reduce((sum: number, item: TestData) => sum + item.value, 0);
		});

		// Cast result to expected type for proper property access
		type PivotedData = {
			date: string;
			'GPT-4': number;
			Claude: number;
		};

		// Check structure and values
		expect(result).toHaveLength(2);
		expect((result[0] as PivotedData).date).toBe('2023-01-01');
		expect((result[0] as PivotedData)['GPT-4']).toBe(10);
		expect((result[0] as PivotedData).Claude).toBe(20);
		expect((result[1] as PivotedData).date).toBe('2023-01-02');
		expect((result[1] as PivotedData)['GPT-4']).toBe(15);
		expect((result[1] as PivotedData).Claude).toBe(25);
	});

	/**
	 * Test the capitalizeFirstLetter function
	 */
	it('should capitalize the first letter of a word', () => {
		expect(capitalizeFirstLetter('apple')).toBe('Apple');
		expect(capitalizeFirstLetter('BANANA')).toBe('BANANA');
		expect(capitalizeFirstLetter('cherry pie')).toBe('Cherry pie');
		expect(capitalizeFirstLetter('')).toBe('');
	});
});
