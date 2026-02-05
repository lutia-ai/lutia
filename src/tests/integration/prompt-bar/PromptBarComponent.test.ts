/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import type { UserWithSettings } from '$lib/db/types';
import { PaymentTier } from '@prisma/client';

describe('PromptBar Component Tests', () => {
	let mockUser: UserWithSettings;

	beforeEach(() => {
		// Create a proper mock user
		mockUser = {
			id: 1,
			name: 'Test User',
			email: 'test@example.com',
			password_hash: null,
			oauth: null,
			oauth_link_token: null,
			reset_password_token: null,
			reset_expiration: null,
			stripe_id: null,
			email_verified: true,
			email_code: null,
			payment_tier: PaymentTier.PayAsYouGo,
			created_at: new Date(),
			updated_at: new Date(),
			premium_until: null,
			user_settings: {
				id: 1,
				user_id: 1,
				company_menu_open: false,
				prompt_pricing_visible: true,
				show_context_window_button: true,
				context_window: 4000
			}
		} as UserWithSettings;
	});

	it('should render PromptBar component', async () => {
		// Import the component dynamically to avoid hoisting issues
		const { default: PromptBar } = await import('$lib/components/prompt-bar/PromptBar.svelte');

		const { container } = render(PromptBar, {
			props: { user: mockUser }
		});

		// Basic assertions to ensure the component renders
		expect(container).toBeTruthy();
		expect(container.querySelector('.prompt-bar-wrapper')).toBeTruthy();
	});

	it('should render PromptBar with different props', async () => {
		const { default: PromptBar } = await import('$lib/components/prompt-bar/PromptBar.svelte');

		const premiumUser = {
			...mockUser,
			payment_tier: PaymentTier.Premium,
			user_settings: {
				...mockUser.user_settings!,
				prompt_pricing_visible: false
			}
		};

		const { container } = render(PromptBar, {
			props: { user: premiumUser }
		});

		expect(container).toBeTruthy();
		expect(container.querySelector('.prompt-bar')).toBeTruthy();
	});

	it('should render PromptBar with different user settings', async () => {
		const { default: PromptBar } = await import('$lib/components/prompt-bar/PromptBar.svelte');

		const userWithDifferentSettings = {
			...mockUser,
			user_settings: {
				...mockUser.user_settings!,
				company_menu_open: true,
				show_context_window_button: false
			}
		};

		const { container } = render(PromptBar, {
			props: { user: userWithDifferentSettings }
		});

		expect(container).toBeTruthy();
	});

	it('should handle component lifecycle', async () => {
		const { default: PromptBar } = await import('$lib/components/prompt-bar/PromptBar.svelte');

		const { component, unmount } = render(PromptBar, {
			props: { user: mockUser }
		});

		// Test component events
		let resizeTriggered = false;
		component.$on('resize', () => {
			resizeTriggered = true;
		});

		// Component should exist
		expect(component).toBeTruthy();

		// Unmount to test cleanup
		unmount();
	});
});
