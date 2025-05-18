/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Settings from '$lib/components/settings/Settings.svelte';
import { isSettingsOpen, bodyScrollLocked } from '$lib/stores';
import type { UserWithSettings } from '$lib/types/types';

// Mock the store values
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
		}
	};
});

// Mock components used in Settings.svelte
vi.mock('$lib/components/settings/GeneralSettingsPage.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/settings/BillingSettingsPage.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/settings/UsageSettingsPage.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/icons/SettingsIcon.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/icons/DollarIcon.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/icons/UsageIcon.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/icons/CrossIcon.svelte', () => ({
	default: vi.fn()
}));

describe('Settings Component', () => {
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
		payment_tier: 'PayAsYouGo',
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
	 * Test body scroll lock
	 */
	it.skip('should set bodyScrollLocked to true on mount', () => {
		render(Settings, {
			props: { user: mockUser }
		});
		expect(bodyScrollLocked.set).toHaveBeenCalledWith(true);
	});
});
