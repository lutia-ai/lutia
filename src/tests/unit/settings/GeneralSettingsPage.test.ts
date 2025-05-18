/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import GeneralSettingsPage from '$lib/components/settings/GeneralSettingsPage.svelte';
import { darkMode, isSettingsOpen } from '$lib/stores';
import { PaymentTier } from '@prisma/client';
import { get } from 'svelte/store';
import type { UserWithSettings } from '$lib/types/types';

// Mock the stores
vi.mock('$lib/stores', () => {
	return {
		darkMode: {
			subscribe: vi.fn().mockImplementation((callback) => {
				callback(false); // initial value: light mode
				return () => {};
			}),
			set: vi.fn()
		},
		isSettingsOpen: {
			subscribe: vi.fn().mockImplementation((callback) => {
				callback(true);
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

// Mock the Switch component
vi.mock('$lib/components/Switch.svelte', () => ({
	default: vi.fn().mockImplementation(() => ({
		$$type: 'svelte:component',
		render: () => ({}),
		on: false,
		$on: vi.fn()
	}))
}));

// Mock the auth client
vi.mock('@auth/sveltekit/client', () => ({
	signIn: vi.fn(),
	signOut: vi.fn()
}));

// Mock utility functions
vi.mock('$lib/components/settings/utils/settingsUtils', () => ({
	saveUserSettings: vi.fn()
}));

describe('GeneralSettingsPage Component', () => {
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
	 * Test that the component renders correctly
	 */
	it.skip('should render all settings sections', () => {
		const { container } = render(GeneralSettingsPage, { props: { user: mockUser } });

		// Check that main headings are present
		expect(screen.getByText('Appearance')).toBeInTheDocument();
		expect(screen.getByText('Account')).toBeInTheDocument();

		// Check for specific settings
		expect(screen.getByText('Dark mode')).toBeInTheDocument();
		expect(screen.getByText('Prompt pricing')).toBeInTheDocument();
		expect(screen.getByText('Always show companies')).toBeInTheDocument();
		expect(screen.getByText('Log out')).toBeInTheDocument();
	});

	/**
	 * Test dark mode toggle
	 */
	it.skip('should toggle dark mode when clicked', async () => {
		const { container } = render(GeneralSettingsPage, { props: { user: mockUser } });

		// Find and click the dark mode setting
		const darkModeSetting = screen.getByText('Dark mode').closest('.setting');
		await fireEvent.click(darkModeSetting!);

		// Verify the store was updated
		expect(darkMode.set).toHaveBeenCalledTimes(1);
	});

	/**
	 * Test prompt pricing toggle
	 */
	it.skip('should toggle prompt pricing and save settings', async () => {
		const { saveUserSettings } = await import('$lib/components/settings/utils/settingsUtils');

		const { container } = render(GeneralSettingsPage, { props: { user: mockUser } });

		// Find and click the prompt pricing setting
		const promptPricingSetting = screen.getByText('Prompt pricing').closest('.setting');
		await fireEvent.click(promptPricingSetting!);

		// Verify settings were saved
		expect(saveUserSettings).toHaveBeenCalledWith(
			expect.objectContaining({
				prompt_pricing_visible: false
			})
		);
	});

	/**
	 * Test company dropdown toggle
	 */
	it.skip('should toggle company dropdown and save settings', async () => {
		const { saveUserSettings } = await import('$lib/components/settings/utils/settingsUtils');

		const { container } = render(GeneralSettingsPage, { props: { user: mockUser } });

		// Find and click the company dropdown setting
		const companyDropdownSetting = screen
			.getByText('Always show companies')
			.closest('.setting');
		await fireEvent.click(companyDropdownSetting!);

		// Verify settings were saved
		expect(saveUserSettings).toHaveBeenCalledWith(
			expect.objectContaining({
				company_menu_open: false
			})
		);
	});

	/**
	 * Test Google account linking
	 */
	it.skip('should show Google link option when not linked', () => {
		const userWithoutGoogle = {
			...mockUser,
			oauth: 'email' // Not Google
		};

		const { container } = render(GeneralSettingsPage, { props: { user: userWithoutGoogle } });

		// Check that the link option is shown
		expect(screen.getByText(/Link Google account/)).toBeInTheDocument();
	});

	/**
	 * Test logout functionality
	 */
	it.skip('should call signOut when Log out is clicked', async () => {
		const { signOut } = await import('@auth/sveltekit/client');

		const { container } = render(GeneralSettingsPage, { props: { user: mockUser } });

		// Find and click the logout button
		const logoutButton = screen.getByText('Log out').closest('.setting');
		await fireEvent.click(logoutButton!);

		// Verify signOut was called
		expect(signOut).toHaveBeenCalled();
		expect(isSettingsOpen.set).toHaveBeenCalledWith(false);
	});
});
