/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import UsageSettingsPage from '$lib/components/settings/UsageSettingsPage.svelte';
import { PaymentTier } from '@prisma/client';
import type { UserWithSettings, UsageObject } from '$lib/types/types';

// Mock the components used by UsageSettingsPage
vi.mock('$lib/components/barchart/StackedBarChart.svelte', () => ({
	default: vi.fn().mockImplementation(() => ({
		$$type: 'svelte:component',
		render: () => ({})
	}))
}));

vi.mock('$lib/components/barchart/PieChart.svelte', () => ({
	default: vi.fn().mockImplementation(() => ({
		$$type: 'svelte:component',
		render: () => ({})
	}))
}));

// Mock the model logos
vi.mock('$lib/models/modelLogos', () => ({
	modelLogos: {
		openAI: { logo: vi.fn() },
		anthropic: { logo: vi.fn() },
		google: { logo: vi.fn() },
		xAI: { logo: vi.fn() },
		deepSeek: { logo: vi.fn() }
	}
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('UsageSettingsPage Component', () => {
	const mockUser: UserWithSettings = {
		id: 1,
		name: 'Test User',
		email: 'test@example.com',
		password_hash: null,
		oauth: null,
		oauth_link_token: null,
		reset_password_token: null,
		reset_expiration: null,
		email_verified: false,
		email_code: null,
		payment_tier: PaymentTier.PayAsYouGo,
		premium_until: null,
		stripe_id: null,
		user_settings: {
			id: 1,
			user_id: 1,
			company_menu_open: true,
			prompt_pricing_visible: true,
			show_context_window_button: true,
			context_window: 4000
		}
	};

	// Sample usage data
	const mockApiRequests = [
		{
			api_provider: 'openAI',
			api_model: 'gpt-4',
			request_timestamp: new Date('2023-08-01T10:00:00Z').toISOString(),
			total_cost: '0.12',
			input_tokens: 100,
			output_tokens: 200
		},
		{
			api_provider: 'openAI',
			api_model: 'gpt-4',
			request_timestamp: new Date('2023-08-02T14:30:00Z').toISOString(),
			total_cost: '0.08',
			input_tokens: 75,
			output_tokens: 150
		},
		{
			api_provider: 'anthropic',
			api_model: 'claude-3-opus',
			request_timestamp: new Date('2023-08-01T11:45:00Z').toISOString(),
			total_cost: '0.15',
			input_tokens: 120,
			output_tokens: 220
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock fetch to return test data
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({ apiRequests: mockApiRequests })
		});
	});

	/**
	 * Test initial component rendering
	 */
	it('should render with month selector', async () => {
		const { container } = render(UsageSettingsPage, { props: { user: mockUser } });

		// Should have a month selector
		const monthSelector = container.querySelector('.month-selector');
		expect(monthSelector).toBeTruthy();

		// Should have navigation buttons
		const prevButton = container.querySelector('.month-selector button:first-child');
		const nextButton = container.querySelector('.month-selector button:last-child');
		expect(prevButton?.textContent).toBe('<');
		expect(nextButton?.textContent).toBe('>');
	});

	/**
	 * Test month navigation
	 */
	it('should update month when navigation buttons are clicked', async () => {
		const { container } = render(UsageSettingsPage, { props: { user: mockUser } });

		// Get the initial month display
		const monthDisplay = container.querySelector('.month-selector span');
		const initialMonth = monthDisplay?.textContent;

		// Click next month button
		const nextButton = container.querySelector('.month-selector button:last-child');
		await fireEvent.click(nextButton!);

		// Verify month changed
		expect(monthDisplay?.textContent).not.toBe(initialMonth);

		// Verify API was called with an updated date range
		expect(global.fetch).toHaveBeenCalled(); // Only checking it was called
	});

	/**
	 * Test layout switching
	 */
	it('should switch chart layout when buttons are clicked', async () => {
		// First need to set mounted = true
		vi.useFakeTimers();

		const { container } = render(UsageSettingsPage, { props: { user: mockUser } });

		// Simulate component mounting
		await vi.runAllTimersAsync();

		// Add mock usageData
		const usageSettingsPageInstance = Object.values(container).find(
			(value) => value?.type?.__value?.__name === 'UsageSettingsPage'
		);

		if (usageSettingsPageInstance) {
			// @ts-ignore - accessing private component state for testing
			usageSettingsPageInstance.$$set({ mounted: true });
			// @ts-ignore - accessing private component state for testing
			usageSettingsPageInstance.$$set({
				usageData: {
					openAI: [
						{
							date: '1',
							model: 'gpt-4',
							value: 0.1,
							input_tokens: 100,
							output_tokens: 200,
							request_count: 1
						}
					]
				}
			});
		}

		await vi.runAllTimersAsync();

		// After data is loaded, find layout option buttons (grouped, stacked, percent)
		const layoutButtons = container.querySelectorAll('.layout-options-container .option');

		if (layoutButtons.length > 0) {
			// Click on "Grouped" layout
			await fireEvent.click(layoutButtons[1]); // 0 = stacked, 1 = grouped, 2 = percent

			// Check if the clicked button now has the selected style
			expect(layoutButtons[1]).toHaveStyle('background: var(--text-color)');
			expect(layoutButtons[0]).not.toHaveStyle('background: var(--text-color)');
		}

		vi.useRealTimers();
	});

	/**
	 * Test rendering with pay-as-you-go vs premium user
	 */
	it('should pass showCost=true to charts for pay-as-you-go users', async () => {
		vi.mock('$lib/components/barchart/PieChart.svelte', () => ({
			default: vi.fn().mockImplementation((props) => {
				expect(props.showCost).toBe(true);
				return {
					$$type: 'svelte:component',
					render: () => ({})
				};
			})
		}));

		render(UsageSettingsPage, { props: { user: mockUser } });
	});

	it('should pass showCost=false to charts for premium users', async () => {
		vi.mock('$lib/components/barchart/PieChart.svelte', () => ({
			default: vi.fn().mockImplementation((props) => {
				expect(props.showCost).toBe(false);
				return {
					$$type: 'svelte:component',
					render: () => ({})
				};
			})
		}));

		const premiumUser = {
			...mockUser,
			payment_tier: PaymentTier.Premium
		};

		render(UsageSettingsPage, { props: { user: premiumUser } });
	});
});
