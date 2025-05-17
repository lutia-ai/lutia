/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Tooltip from '$lib/components/barchart/Tooltip.svelte';
import { ApiModel } from '@prisma/client';

// Mock the required utility functions
vi.mock('$lib/models/cost-calculators/tokenCounter', () => ({
	roundToTwoSignificantDigits: vi.fn((value) => value.toFixed(2))
}));

vi.mock('$lib/models/modelUtils', () => ({
	formatModelEnumToReadable: vi.fn((model) => {
		if (model === ApiModel.GPT_4) return 'GPT-4';
		if (model === ApiModel.Claude_3_Opus) return 'Claude 3 Opus';
		return model;
	})
}));

describe('Tooltip Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test component rendering with required props
	 */
	it('should render correctly with required props', () => {
		const props = {
			model: ApiModel.GPT_4,
			cost: 0.15,
			input_tokens: 1000,
			output_tokens: 500,
			request_count: 10,
			x: 100,
			y: 200
		};

		const { container } = render(Tooltip, { props });

		// Verify the component renders with proper structure
		const tooltipElement = container.querySelector('.tooltip');
		expect(tooltipElement).toBeDefined();

		// Verify tooltip position is set correctly
		expect((tooltipElement as HTMLElement).style.left).toBe('100px');
		expect((tooltipElement as HTMLElement).style.top).toBe('200px');

		// Verify content
		const paragraphs = container.querySelectorAll('.tooltip p');
		expect(paragraphs).toHaveLength(5); // Model, input tokens, output tokens, requests, cost

		// Check model name
		expect(paragraphs[0].textContent).toContain('Model:');
		expect(paragraphs[0].textContent).toContain('GPT-4');

		// Check tokens
		expect(paragraphs[1].textContent).toContain('Input tokens:');
		expect(paragraphs[1].textContent).toContain('1,000');

		expect(paragraphs[2].textContent).toContain('Output tokens:');
		expect(paragraphs[2].textContent).toContain('500');

		// Check requests
		expect(paragraphs[3].textContent).toContain('Requests:');
		expect(paragraphs[3].textContent).toContain('10');

		// Check cost
		expect(paragraphs[4].textContent).toContain('Cost:');
		expect(paragraphs[4].textContent).toContain('$0.15');
	});

	/**
	 * Test hiding cost display
	 */
	it('should hide cost when showCost is false', () => {
		const props = {
			model: ApiModel.Claude_3_Opus,
			cost: 0.75,
			input_tokens: 2000,
			output_tokens: 1500,
			request_count: 5,
			x: 100,
			y: 200,
			showCost: false
		};

		const { container } = render(Tooltip, { props });

		// Verify content has one fewer paragraph (no cost)
		const paragraphs = container.querySelectorAll('.tooltip p');
		expect(paragraphs).toHaveLength(4); // Model, input tokens, output tokens, requests

		// Verify no cost paragraph exists
		const costParagraph = Array.from(paragraphs).find((p) => p.textContent?.includes('Cost:'));
		expect(costParagraph).toBeUndefined();
	});

	/**
	 * Test with different model types
	 */
	it('should display different model names correctly', () => {
		const props = {
			model: ApiModel.Claude_3_Opus,
			cost: 0.5,
			input_tokens: 1000,
			output_tokens: 500,
			request_count: 10,
			x: 100,
			y: 200
		};

		const { container } = render(Tooltip, { props });

		// Check model name for Claude
		const modelText = container.querySelector('.tooltip p')?.textContent;
		expect(modelText).toContain('Claude 3 Opus');
	});

	/**
	 * Test number formatting
	 */
	it('should format large numbers with commas', () => {
		const props = {
			model: ApiModel.GPT_4,
			cost: 1.25,
			input_tokens: 1000000, // 1 million
			output_tokens: 500000, // 500k
			request_count: 1000,
			x: 100,
			y: 200
		};

		const { container } = render(Tooltip, { props });

		// Check token formatting
		const paragraphs = container.querySelectorAll('.tooltip p');

		// Input tokens should be formatted with commas
		expect(paragraphs[1].textContent).toContain('1,000,000');

		// Output tokens should be formatted with commas
		expect(paragraphs[2].textContent).toContain('500,000');

		// Request count should be formatted with commas
		expect(paragraphs[3].textContent).toContain('1,000');
	});
});
