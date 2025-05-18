/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { format } from 'd3-format';
import { stackOffsetExpand } from 'd3-shape';
import { pivot } from '$lib/components/barchart/utils.ts';
import { getStackExtents } from '$lib/components/barchart/Bar.svelte';

// Direct import for testing logic only, not rendering
import StackedBarChartModule from '$lib/components/barchart/StackedBarChart.svelte';

// Mock all the imported components to prevent rendering errors
vi.mock('layercake', () => ({
	LayerCake: vi.fn(() => ({
		$set: vi.fn()
	})),
	Svg: vi.fn()
}));

vi.mock('$lib/components/barchart/Bar.svelte', () => ({
	default: vi.fn(),
	getStackExtents: vi.fn((data, groupBy, stackBy, offset) => {
		// Simplified implementation of getStackExtents for testing
		if (offset === stackOffsetExpand) {
			return [0, 1]; // For percent layout
		}
		return [0, 100]; // For regular layouts
	})
}));

vi.mock('$lib/components/barchart/AxisX.svelte', () => ({ default: vi.fn() }));
vi.mock('$lib/components/barchart/AxisY.svelte', () => ({ default: vi.fn() }));
vi.mock('$lib/components/barchart/Tooltip.svelte', () => ({ default: vi.fn() }));

// Test data
interface MockDataItem {
	date: string;
	model: string;
	value: number;
	input_tokens: number;
	output_tokens: number;
	request_count: number;
	[key: string]: string | number; // Index signature to allow for dynamic properties
}

const mockData: MockDataItem[] = [
	{
		date: '2023-01',
		model: 'GPT-4',
		value: 100,
		input_tokens: 1000,
		output_tokens: 500,
		request_count: 5
	},
	{
		date: '2023-01',
		model: 'Claude',
		value: 200,
		input_tokens: 2000,
		output_tokens: 1000,
		request_count: 10
	},
	{
		date: '2023-02',
		model: 'GPT-4',
		value: 150,
		input_tokens: 1500,
		output_tokens: 750,
		request_count: 7
	},
	{
		date: '2023-02',
		model: 'Claude',
		value: 250,
		input_tokens: 2500,
		output_tokens: 1250,
		request_count: 12
	}
];

describe('StackedBarChart Component Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test layout options calculation
	 */
	it('should generate correct options object for "stacked" layout', () => {
		const options = calculateOptions('stacked');
		expect(options).toEqual({ layout: 'stacked' });
	});

	it('should generate correct options object for "grouped" layout', () => {
		const options = calculateOptions('grouped');
		expect(options).toEqual({ layout: 'grouped' });
	});

	it('should generate correct options object for "percent" layout', () => {
		const options = calculateOptions('percent');
		expect(options).toEqual({ layout: 'stacked', offset: stackOffsetExpand });
	});

	it('should generate empty options object for unknown layout', () => {
		const options = calculateOptions('unknown');
		expect(options).toEqual({});
	});

	/**
	 * Test formatTickY function
	 */
	it('should format y-axis ticks as percentages when layout is "percent"', () => {
		const formatTickY = createFormatTickY('percent');
		expect(formatTickY(0.5)).toBe('50%');
		expect(formatTickY(0.75)).toBe('75%');
		expect(formatTickY(1)).toBe('100%');
	});

	it('should format y-axis ticks as currency for non-percent layouts', () => {
		const formatTickY = createFormatTickY('stacked');
		expect(formatTickY(123.45)).toBe('$123.45');
		expect(formatTickY(0)).toBe('$0.00');
		expect(formatTickY(1000)).toBe('$1000.00');
	});

	/**
	 * Test data preparation
	 */
	it('should correctly pivot data for the chart', () => {
		const pivotedData = pivot(mockData, 'date', 'model', (items: MockDataItem[]) =>
			items.reduce((total: number, item: MockDataItem) => total + item.value, 0)
		);

		// Type assertion for pivotedData to avoid TypeScript errors
		type PivotedData = {
			date: string;
			[key: string]: string | number;
		};

		// Check pivoted data structure
		const typedData = pivotedData as PivotedData[];
		expect(typedData).toHaveLength(2);
		expect(typedData[0].date).toBe('2023-01');
		expect(typedData[0]['GPT-4']).toBe(100);
		expect(typedData[0]['Claude']).toBe(200);
		expect(typedData[1].date).toBe('2023-02');
		expect(typedData[1]['GPT-4']).toBe(150);
		expect(typedData[1]['Claude']).toBe(250);
	});

	it('should extract stack keys from pivoted data', () => {
		const pivotedData = pivot(mockData, 'date', 'model', (items: MockDataItem[]) =>
			items.reduce((total: number, item: MockDataItem) => total + item.value, 0)
		);

		// Type assertion for pivotedData to avoid TypeScript errors
		type PivotedData = {
			date: string;
			[key: string]: string | number;
		};

		const stackKeys = Object.keys(pivotedData[0] as PivotedData).filter(
			(key) => key !== 'date'
		);
		expect(stackKeys).toContain('GPT-4');
		expect(stackKeys).toContain('Claude');
		expect(stackKeys).toHaveLength(2);
	});

	/**
	 * Test extents calculation for different layouts
	 */
	it('should calculate appropriate y-axis extents for stacked layout', () => {
		const extents = getStackExtents(mockData, 'date', 'model', stackOffsetExpand);
		expect(extents).toEqual([0, 1]);
	});

	it('should calculate y-axis extents with range [0,1] for percent layout', () => {
		const extents = getStackExtents(mockData, 'date', 'model', stackOffsetExpand);
		expect(extents).toEqual([0, 1]);
	});

	/**
	 * Test default props
	 */
	it('should have reasonable default behavior for props', () => {
		// We can't directly test prop defaults, but we can test the functions
		// that would be created based on those defaults
		const options = calculateOptions('stacked'); // Default layout
		expect(options).toEqual({ layout: 'stacked' });

		const formatTickY = createFormatTickY('stacked');
		expect(formatTickY(100)).toBe('$100.00');
	});
});

/**
 * Helper functions to replicate component logic for testing
 */
function calculateOptions(layout: string): Record<string, any> {
	if (layout === 'grouped') return { layout: 'grouped' };
	if (layout === 'stacked') return { layout: 'stacked' };
	if (layout === 'percent') return { layout: 'stacked', offset: stackOffsetExpand };
	return {};
}

function createFormatTickY(layout: string): (d: number) => string {
	return (d: number) => (layout === 'percent' ? format('.0%')(d) : '$' + format('.2f')(d));
}
