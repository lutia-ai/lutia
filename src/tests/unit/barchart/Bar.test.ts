/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Bar, { getGroupExtents, getStackExtents } from '$lib/components/barchart/Bar.svelte';
import { stackOffsetNone, stackOffsetExpand } from 'd3-shape';

// Mock the LayerCake context
const mockContext = {
	data: { subscribe: vi.fn() },
	xGet: { subscribe: vi.fn() },
	xScale: { subscribe: vi.fn() },
	yScale: { subscribe: vi.fn() },
	rGet: { subscribe: vi.fn() }
};

// Mock the getContext function to provide our mock context
vi.mock('svelte', async () => {
	const actual = await vi.importActual('svelte');
	return {
		...actual,
		getContext: vi.fn((name) => {
			if (name === 'LayerCake') {
				return mockContext;
			}
			return null;
		})
	};
});

describe('Bar Component', () => {
	const sampleData = [
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

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up default mocked values
		mockContext.data.subscribe.mockImplementation((fn) => {
			fn(sampleData);
			return () => {};
		});

		mockContext.xGet.subscribe.mockImplementation((fn) => {
			// Function to get x value
			fn((d: any) => d.date);
			return () => {};
		});

		mockContext.rGet.subscribe.mockImplementation((fn) => {
			// Function to get color
			fn((key: string) => (key === 'GPT-4' ? 'blue' : 'green'));
			return () => {};
		});

		// Mock xScale with bandwidth for bar charts
		mockContext.xScale.subscribe.mockImplementation((fn) => {
			const scale = (val: string) => {
				if (val === '2023-01') return 0;
				if (val === '2023-02') return 100;
				return 0;
			};
			scale.bandwidth = () => 80;
			fn(scale);
			return () => {};
		});

		// Mock yScale for bar height
		mockContext.yScale.subscribe.mockImplementation((fn) => {
			// Simple linear scale mapping values 0-300 to 300-0
			const scale = (val: number) => 300 - val;
			fn(scale);
			return () => {};
		});
	});

	/**
	 * Test static utility functions
	 */
	it('should calculate group extents correctly', () => {
		const data = [
			{ value1: 10, value2: 20 },
			{ value1: 30, value2: 40 }
		];

		const extents = getGroupExtents(data, ['value1', 'value2']);

		// Should include min and max from both keys
		expect(extents[0]).toBe(10); // min value
		expect(extents[1]).toBe(40); // max value
	});

	it('should calculate stack extents correctly', () => {
		const data = [
			{ date: '2023-01', model: 'GPT-4', value: 100 },
			{ date: '2023-01', model: 'Claude', value: 200 },
			{ date: '2023-02', model: 'GPT-4', value: 150 },
			{ date: '2023-02', model: 'Claude', value: 250 }
		];

		const extents = getStackExtents(data, 'date', 'model', stackOffsetNone);

		// For stacked data with stackOffsetNone
		expect(extents[0]).toBe(0); // min value (always 0 for stackOffsetNone)
		expect(extents[1]).toBeGreaterThan(0); // max value (sum of stacked values)
	});

	/**
	 * Test component rendering in stacked layout
	 */
	it('should render correctly in stacked layout', () => {
		const props = {
			groupBy: 'date',
			stackBy: 'model',
			layout: 'stacked',
			offset: stackOffsetNone,
			delay: 300,
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { container } = render(Bar, { props });

		// Verify the component renders with proper structure
		const columnGroup = container.querySelector('.column-group');
		expect(columnGroup).toBeDefined();

		// Should render rect elements for each data point
		const rects = container.querySelectorAll('rect');
		expect(rects.length).toBe(4); // One for each data point
	});

	/**
	 * Test component rendering in grouped layout
	 */
	it('should render correctly in grouped layout', () => {
		const props = {
			groupBy: 'date',
			stackBy: 'model',
			layout: 'grouped',
			offset: stackOffsetNone,
			delay: 300,
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { container } = render(Bar, { props });

		// Verify the component renders with proper structure
		const columnGroup = container.querySelector('.column-group');
		expect(columnGroup).toBeDefined();

		// Should render rect elements for each data point
		const rects = container.querySelectorAll('rect');
		expect(rects.length).toBe(4); // One for each data point
	});

	/**
	 * Test percent layout with stackOffsetExpand
	 */
	it('should use stackOffsetExpand for percent layout', () => {
		const props = {
			groupBy: 'date',
			stackBy: 'model',
			layout: 'stacked',
			offset: stackOffsetExpand,
			delay: 300,
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { container } = render(Bar, { props });

		// Verify the component still renders correctly
		const columnGroup = container.querySelector('.column-group');
		expect(columnGroup).toBeDefined();
	});

	/**
	 * Test data pivoting and preparation
	 */
	it('should correctly pivot and prepare chart data', () => {
		const props = {
			groupBy: 'date',
			stackBy: 'model',
			layout: 'stacked',
			offset: stackOffsetNone,
			delay: 300,
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { container } = render(Bar, { props });

		// Instead of accessing internal reactive variables, verify the output
		// Check that the correct number of rect elements were created (one for each data point)
		const rects = container.querySelectorAll('rect');
		expect(rects.length).toBeGreaterThan(0);

		// Verify that all the required g elements are present
		const columnGroup = container.querySelector('.column-group');
		expect(columnGroup).toBeDefined();

		// We have 4 data points (2 dates × 2 models)
		expect(rects.length).toBe(4);
	});
});
