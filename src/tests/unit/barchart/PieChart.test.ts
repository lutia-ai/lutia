/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import PieChart from '$lib/components/barchart/PieChart.svelte';
import type { Company, UsageObject } from '$lib/types/types';

// Mock Chart.js
vi.mock('chart.js/auto', () => {
	const Chart = vi.fn(() => ({
		update: vi.fn(),
		data: {
			labels: [],
			datasets: [{ data: [], backgroundColor: [] }]
		}
	}));

	return { Chart };
});

// Mock the capitalizeFirstLetter utility
vi.mock('$lib/components/barchart/utils', () => ({
	capitalizeFirstLetter: vi.fn((word) => word.charAt(0).toUpperCase() + word.slice(1))
}));

describe('PieChart Component', () => {
	// Sample test data with string keys that match Company enum values
	const sampleUsageData: Record<string, UsageObject[]> = {
		openAI: [
			{ value: 100, request_count: 5 } as UsageObject,
			{ value: 200, request_count: 10 } as UsageObject
		],
		anthropic: [
			{ value: 150, request_count: 7 } as UsageObject,
			{ value: 250, request_count: 12 } as UsageObject
		]
	};

	const sampleColors: Record<string, string> = {
		openAI: 'blue',
		anthropic: 'green'
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock canvas and context with type assertion
		HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
			clearRect: vi.fn(),
			fillRect: vi.fn(),
			fillText: vi.fn(),
			measureText: vi.fn(() => ({ width: 100 })),
			rect: vi.fn(),
			fill: vi.fn(),
			beginPath: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			closePath: vi.fn(),
			stroke: vi.fn(),
			arc: vi.fn()
		})) as unknown as (contextId: string, options?: any) => any;
	});

	/**
	 * Test component rendering with required props
	 */
	it('should render correctly with required props', () => {
		const { container } = render(PieChart, {
			props: {
				usageData: sampleUsageData as unknown as Record<Company, UsageObject[]>,
				companyColors: sampleColors as unknown as Record<Company, string>
			}
		});

		// Verify the component renders with proper structure
		const chartContainer = container.querySelector('.chart-container');
		expect(chartContainer).toBeDefined();

		// Should have a canvas element
		const canvas = container.querySelector('canvas');
		expect(canvas).toBeDefined();

		// Should have a total container
		const totalContainer = container.querySelector('.total-container');
		expect(totalContainer).toBeDefined();
	});

	/**
	 * Test total cost calculation and display
	 */
	it('should display the correct total cost when showCost is true', () => {
		const { container } = render(PieChart, {
			props: {
				usageData: sampleUsageData as unknown as Record<Company, UsageObject[]>,
				companyColors: sampleColors as unknown as Record<Company, string>,
				showCost: true
			}
		});

		// Check that the total cost is correctly calculated and displayed
		const totalDisplay = container.querySelector('.total-container span');
		expect(totalDisplay).toBeDefined();
		expect(totalDisplay?.textContent?.trim()).toBe('$700.00'); // 100 + 200 + 150 + 250 = 700
	});

	/**
	 * Test total request count calculation and display
	 */
	it('should display the correct request count when showCost is false', () => {
		const { container } = render(PieChart, {
			props: {
				usageData: sampleUsageData as unknown as Record<Company, UsageObject[]>,
				companyColors: sampleColors as unknown as Record<Company, string>,
				showCost: false
			}
		});

		// Check that the total request count is correctly calculated and displayed
		const totalDisplay = container.querySelector('.total-container span');
		expect(totalDisplay).toBeDefined();
		expect(totalDisplay?.textContent?.trim()).toBe('34'); // 5 + 10 + 7 + 12 = 34
	});

	/**
	 * Test data processing
	 */
	it('should process usage data correctly', () => {
		// Directly call the processUsageData function by passing props and triggering reactivity
		const { container } = render(PieChart, {
			props: {
				usageData: sampleUsageData as unknown as Record<Company, UsageObject[]>,
				companyColors: sampleColors as unknown as Record<Company, string>
			}
		});

		// Check that the total cost is correctly calculated which confirms data was processed
		const totalDisplay = container.querySelector('.total-container span');
		expect(totalDisplay?.textContent?.trim()).toBe('$700.00');

		// We can't easily access the processed data directly in the test,
		// but we can verify the component processed it by checking the output
	});

	/**
	 * Test empty data handling
	 */
	it('should handle empty data gracefully', () => {
		const emptyUsageData = {};

		const { container } = render(PieChart, {
			props: {
				usageData: emptyUsageData as unknown as Record<Company, UsageObject[]>,
				companyColors: sampleColors as unknown as Record<Company, string>
			}
		});

		// Total should be $0.00 which confirms the "No data" entry was created
		const totalDisplay = container.querySelector('.total-container span');
		expect(totalDisplay?.textContent?.trim()).toBe('$0.00');
	});
});
