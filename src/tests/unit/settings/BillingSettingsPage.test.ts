/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import BillingSettingsPage from '$lib/components/settings/BillingSettingsPage.svelte';
import { PaymentTier } from '@prisma/client';
import type { UserWithSettings, CardDetails, TransactionRecord } from '$lib/types/types';
import { deserialize } from '$app/forms';

// Mock necessary modules
vi.mock('@stripe/stripe-js', () => ({
	loadStripe: vi.fn().mockResolvedValue({
		elements: vi.fn().mockReturnValue({
			create: vi.fn().mockReturnValue({
				mount: vi.fn(),
				on: vi.fn(),
				update: vi.fn()
			})
		}),
		createToken: vi.fn().mockResolvedValue({ token: { id: 'mock-token-id' } })
	})
}));

vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_STRIPE_API_KEY: 'mock-stripe-key'
	}
}));

vi.mock('$app/forms', () => ({
	deserialize: vi.fn()
}));

describe('BillingSettingsPage Component', () => {
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

	const mockCardDetails: CardDetails = {
		brand: 'visa',
		last4: '4242',
		expMonth: 12,
		expYear: 2025
	};

	const mockTransactions: TransactionRecord[] = [
		{
			id: '1',
			amount: 10.0,
			date: new Date('2023-07-01'),
			description: 'Top-up',
			status: 'succeeded'
		},
		{
			id: '2',
			amount: 5.0,
			date: new Date('2023-07-15'),
			description: 'API Usage',
			status: 'processing'
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock fetch responses
		global.fetch = vi.fn().mockImplementation((url) => {
			if (url.toString().includes('?/getUsersBillingDetails')) {
				return Promise.resolve({
					text: () => Promise.resolve('success')
				});
			}
			return Promise.resolve({
				text: () => Promise.resolve('{}')
			});
		});

		// Mock the deserialize function to return test data
		(deserialize as any).mockImplementation((data: string) => {
			if (data === 'success') {
				return {
					type: 'success',
					data: {
						balance: 25.75,
						cardDetails: mockCardDetails,
						transactions: mockTransactions
					}
				};
			}
			return { type: 'success', data: {} };
		});

		// Mock DOM methods for Stripe elements
		document.createElement = vi.fn().mockImplementation((tagName) => {
			if (tagName === 'div') {
				const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
				div.id = '';
				return div;
			}
			return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
		});
	});

	/**
	 * Test that the component renders correctly for a pay-as-you-go user
	 */
	it('should render balance container for pay-as-you-go users', async () => {
		const { container } = render(BillingSettingsPage, { props: { user: mockUser } });

		// Wait for the component to load data
		await vi.waitFor(() => {
			const balanceContainer = container.querySelector('.balance-container');
			expect(balanceContainer).toBeTruthy();
		});
	});

	/**
	 * Test that the component doesn't render balance container for subscription users
	 */
	it('should not render balance container for subscription users', async () => {
		const subscriptionUser = {
			...mockUser,
			payment_tier: PaymentTier.Premium
		};

		const { container } = render(BillingSettingsPage, { props: { user: subscriptionUser } });

		// Wait a bit to ensure component has loaded
		await vi.waitFor(() => {
			const balanceContainer = container.querySelector('.balance-container');
			expect(balanceContainer).toBeFalsy();
		});
	});

	/**
	 * Test that card details are rendered correctly
	 */
	it.skip('should render card details when available', async () => {
		const { container } = render(BillingSettingsPage, { props: { user: mockUser } });

		// Wait for the component to load data and render card details
		await vi.waitFor(() => {
			const cardNumber = container.querySelector('.card-number');
			expect(cardNumber).toBeTruthy();
			// Should format card as "Visa •••• •••• •••• 4242"
			expect(cardNumber?.textContent).toContain('4242');
		});
	});

	/**
	 * Test transaction history rendering
	 */
	it.skip('should render transaction history', async () => {
		const { container } = render(BillingSettingsPage, { props: { user: mockUser } });

		// Wait for transactions to load
		await vi.waitFor(() => {
			const transactionRows = container.querySelectorAll('tbody tr');
			expect(transactionRows.length).toBe(2);

			// Check first transaction
			const firstTransaction = transactionRows[0];
			expect(firstTransaction.textContent).toContain('Top-up');
			expect(firstTransaction.textContent).toContain('$10.00');
			expect(firstTransaction.textContent).toContain('succeeded');
		});
	});

	/**
	 * Test "No transactions found" message
	 */
	it.skip('should display message when no transactions exist', async () => {
		// Mock empty transactions
		(deserialize as any).mockImplementationOnce((data: string) => {
			if (data === 'success') {
				return {
					type: 'success',
					data: {
						balance: 25.75,
						cardDetails: mockCardDetails,
						transactions: []
					}
				};
			}
			return { type: 'success', data: {} };
		});

		const { container } = render(BillingSettingsPage, { props: { user: mockUser } });

		// Wait for component to render with no transactions
		await vi.waitFor(() => {
			const noTransactionsMessage = container.querySelector('.no-transactions');
			expect(noTransactionsMessage).toBeTruthy();
			expect(noTransactionsMessage?.textContent).toBe('No transactions found');
		});
	});
});
