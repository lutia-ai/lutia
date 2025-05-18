/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TokenCounter from '$lib/components/prompt-bar/TokenCounter.svelte';
import { PaymentTier } from '@prisma/client';

describe('TokenCounter', () => {
	/**
	 * Test component rendering with default props
	 */
	it('should render correctly with default props', () => {
		const { container } = render(TokenCounter);

		// Verify the component renders with proper structure
		const tokenContainer = container.querySelector('.input-token-container');
		expect(tokenContainer).toBeDefined();

		// Check if all three elements are present
		const paragraphs = tokenContainer?.querySelectorAll('p');
		expect(paragraphs?.length).toBe(3);

		// Check default values
		expect(paragraphs?.[0].textContent).toContain('Context window: 0');
		expect(paragraphs?.[1].textContent).toContain('Input cost: $0');
		expect(paragraphs?.[2].textContent).toContain('Input tokens: 0');
	});

	/**
	 * Test component with custom props
	 */
	it('should display custom token count and cost', () => {
		const props = {
			tokens: 100,
			cost: 0.02,
			contextWindowSize: 4000
		};

		const { container } = render(TokenCounter, { props });

		const paragraphs = container.querySelectorAll('p');
		expect(paragraphs[0].textContent).toContain('Context window: 4000');
		expect(paragraphs[1].textContent).toContain('Input cost: $0.02');
		expect(paragraphs[2].textContent).toContain('Input tokens: 100');
	});

	it('should handle unknown token count and cost with "?" placeholder', () => {
		const props = {
			tokens: -1,
			cost: -1,
			contextWindowSize: 4000
		};

		const { container } = render(TokenCounter, { props });

		const paragraphs = container.querySelectorAll('p');
		expect(paragraphs[1].textContent).toContain('Input cost: ?');
		expect(paragraphs[2].textContent).toContain('Input tokens: ?');
	});

	/**
	 * Test visibility
	 */
	it('should not render when isVisible is false', () => {
		const { container } = render(TokenCounter, { props: { isVisible: false } });

		const tokenContainer = container.querySelector('.input-token-container');
		expect(tokenContainer).toBeNull();
	});

	/**
	 * Test payment tier behavior
	 */
	it('should hide cost information when not on PayAsYouGo tier', () => {
		const props = {
			tokens: 100,
			cost: 0.02,
			contextWindowSize: 4000,
			paymentTier: PaymentTier.Premium
		};

		const { container } = render(TokenCounter, { props });

		// Should only have two paragraphs (context window and tokens)
		const paragraphs = container.querySelectorAll('p');
		expect(paragraphs.length).toBe(2);

		// Verify no cost information is displayed
		const middleParagraph = container.querySelector('.middle');
		expect(middleParagraph).toBeNull();

		// Check remaining information
		expect(paragraphs[0].textContent).toContain('Context window: 4000');
		expect(paragraphs[1].textContent).toContain('Input tokens: 100');
	});

	it('should show cost information when on PayAsYouGo tier', () => {
		const props = {
			tokens: 100,
			cost: 0.02,
			contextWindowSize: 4000,
			paymentTier: PaymentTier.PayAsYouGo
		};

		const { container } = render(TokenCounter, { props });

		// Should have three paragraphs (context window, cost, and tokens)
		const paragraphs = container.querySelectorAll('p');
		expect(paragraphs.length).toBe(3);

		// Verify cost information is displayed
		const middleParagraph = container.querySelector('.middle');
		expect(middleParagraph).not.toBeNull();
		expect(middleParagraph?.textContent).toContain('Input cost: $0.02');
	});
});
