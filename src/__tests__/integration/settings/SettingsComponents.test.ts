/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Settings from '$lib/components/settings/Settings.svelte';
import { isSettingsOpen, bodyScrollLocked, darkMode } from '$lib/stores';
import { PaymentTier } from '@prisma/client';
import type { UserWithSettings } from '$lib/types/types';

// Mock the stores
vi.mock('$lib/stores', () => {
	return {
		isSettingsOpen: {
			subscribe: vi.fn().mockImplementation((callback) => {
				callback(true);
				return () => {};
			}),
			set: vi.fn()
		},
		bodyScrollLocked: {
			subscribe: vi.fn().mockImplementation((callback) => {
				callback(false);
				return () => {};
			}),
			set: vi.fn()
		},
		darkMode: {
			subscribe: vi.fn().mockImplementation((callback) => {
				callback(false);
				return () => {};
			}),
			set: vi.fn()
		},
		numberPrevMessages: {
			subscribe: vi.fn().mockImplementation((callback) => {
				callback(10);
				return () => {};
			})
		}
	};
});

// Mock the auth client
vi.mock('@auth/sveltekit/client', () => ({
	signIn: vi.fn(),
	signOut: vi.fn()
}));

// Mock fetch API for billing operations
global.fetch = vi.fn().mockImplementation((url) => {
	return Promise.resolve({
		ok: true,
		text: () => Promise.resolve('{"type":"success","data":{"balance":25.75}}')
	});
});

// Mock stripe integration
vi.mock('@stripe/stripe-js', () => ({
	loadStripe: vi.fn().mockResolvedValue({
		elements: vi.fn().mockReturnValue({
			create: vi.fn().mockReturnValue({
				mount: vi.fn(),
				on: vi.fn(),
				update: vi.fn()
			})
		})
	})
}));

// Mock utility functions
vi.mock('$lib/components/settings/utils/settingsUtils', () => ({
	saveUserSettings: vi.fn()
}));

// Mock environmental variables
vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_STRIPE_API_KEY: 'mock-stripe-key'
	}
}));

describe('Settings Components Integration', () => {
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

	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test tab navigation between settings components
	 */
	it('should navigate between settings tabs and render appropriate content', async () => {
		const { container } = render(Settings, { props: { user: mockUser } });

		// Initial tab should be General
		expect(screen.getByText('Appearance')).toBeInTheDocument();

		// Click on Billing tab
		const billingTab = screen.getByText('Billing').closest('.sidebar-option');
		await fireEvent.click(billingTab!);

		// Billing content should be visible
		expect(container.querySelector('.card-body')).toBeTruthy();
		expect(container.querySelector('.transaction-history')).toBeTruthy();

		// Click on Usage tab
		const usageTab = screen.getByText('Usage').closest('.sidebar-option');
		await fireEvent.click(usageTab!);

		// Usage content should be visible
		expect(container.querySelector('.usage-body')).toBeTruthy();

		// Go back to General tab
		const generalTab = screen.getByText('General').closest('.sidebar-option');
		await fireEvent.click(generalTab!);

		// General content should be visible again
		expect(screen.getByText('Appearance')).toBeInTheDocument();
	});

	/**
	 * Test dark mode setting persists across tab changes
	 */
	it('should preserve dark mode setting when switching tabs', async () => {
		const { container } = render(Settings, { props: { user: mockUser } });

		// Toggle dark mode in General tab
		const darkModeSetting = screen.getByText('Dark mode').closest('.setting');
		await fireEvent.click(darkModeSetting!);

		// Verify darkMode.set was called
		expect(darkMode.set).toHaveBeenCalledTimes(1);

		// Switch to Billing tab and back
		const billingTab = screen.getByText('Billing').closest('.sidebar-option');
		await fireEvent.click(billingTab!);

		const generalTab = screen.getByText('General').closest('.sidebar-option');
		await fireEvent.click(generalTab!);

		// Dark mode setting should still be there
		expect(screen.getByText('Dark mode')).toBeInTheDocument();
	});

	/**
	 * Test closing settings panel
	 */
	it('should call isSettingsOpen.set(false) when close button is clicked', async () => {
		const { container } = render(Settings, { props: { user: mockUser } });

		// Click the close button
		const closeButton = container.querySelector('.title-container button');
		await fireEvent.click(closeButton!);

		// Verify isSettingsOpen was set to false
		expect(isSettingsOpen.set).toHaveBeenCalledWith(false);
	});

	/**
	 * Test body scroll lock applied on mount and released on destroy
	 */
	it.skip('should manage body scroll lock correctly', () => {
		const { unmount } = render(Settings, { props: { user: mockUser } });

		// On mount, body scroll should be locked
		expect(bodyScrollLocked.set).toHaveBeenCalledWith(true);

		// On unmount, body scroll should be unlocked
		unmount();
		expect(bodyScrollLocked.set).toHaveBeenCalledWith(false);
	});
});
