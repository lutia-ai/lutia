/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import PriceLabel from '$lib/components/chat-history/chat-toolbar/PriceLabel.svelte';

// Mock roundToTwoSignificantDigits function
vi.mock('$lib/models/cost-calculators/tokenCounter', () => ({
	roundToTwoSignificantDigits: vi.fn((value) => value.toFixed(4))
}));

describe('PriceLabel Component', () => {
	it('renders with the correct input cost', () => {
		const inputCost = 0.0025;
		const outputCost = 0.0035;

		const { getByText } = render(PriceLabel, {
			props: {
				inputCost,
				outputCost
			}
		});

		// The mock will format the number to 4 decimal places
		expect(getByText('Input:')).toBeInTheDocument();
		expect(getByText('$0.0025')).toBeInTheDocument();
	});

	it('renders with the correct output cost', () => {
		const inputCost = 0.0025;
		const outputCost = 0.0035;

		const { getByText } = render(PriceLabel, {
			props: {
				inputCost,
				outputCost
			}
		});

		expect(getByText('Output:')).toBeInTheDocument();
		expect(getByText('$0.0035')).toBeInTheDocument();
	});

	it('calculates and displays the correct total cost', () => {
		const inputCost = 0.0025;
		const outputCost = 0.0035;
		const totalCost = inputCost + outputCost; // 0.006

		const { getByText } = render(PriceLabel, {
			props: {
				inputCost,
				outputCost
			}
		});

		expect(getByText('Total:')).toBeInTheDocument();
		expect(getByText('$0.0060')).toBeInTheDocument();
	});

	it('handles zero costs correctly', () => {
		const inputCost = 0;
		const outputCost = 0;

		const { getAllByText, getByText } = render(PriceLabel, {
			props: {
				inputCost,
				outputCost
			}
		});

		// Check for the presence of headers
		expect(getByText('Input:')).toBeInTheDocument();
		expect(getByText('Output:')).toBeInTheDocument();
		expect(getByText('Total:')).toBeInTheDocument();

		// Use getAllByText for values that appear multiple times
		const zeroValues = getAllByText('$0.0000');
		expect(zeroValues).toHaveLength(3); // Should find 3 instances
	});
});
