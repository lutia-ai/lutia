/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import type { Conversation } from '@prisma/client';
import { PaymentTier } from '@prisma/client';

// Define mocks with hoisted to make them available before module imports
const mocks = vi.hoisted(() => {
	// Custom store mock implementation to allow proper subscription and updates
	function createMockStore<T>(initialValue: T) {
		let value = initialValue;
		const subscribers: ((value: T) => void)[] = [];

		const subscribe = (callback: (value: T) => void) => {
			subscribers.push(callback);
			callback(value);

			return () => {
				const index = subscribers.indexOf(callback);
				if (index !== -1) {
					subscribers.splice(index, 1);
				}
			};
		};

		const set = (newValue: T) => {
			value = newValue;
			subscribers.forEach((callback) => callback(value));
		};

		return {
			subscribe: vi.fn(subscribe),
			set: vi.fn(set)
		};
	}

	// Create mock stores with our custom implementation
	return {
		mockConversationsOpen: createMockStore<boolean>(true),
		transitionMocks: {
			fade: vi.fn(() => ({ duration: 0, css: vi.fn() })),
			fly: vi.fn(() => ({ duration: 0, css: vi.fn() }))
		},
		navigationMocks: {
			goto: vi.fn()
		},
		mockDeserialize: vi.fn((text) => ({
			type: 'success',
			data: {
				data: {
					conversations: [
						{
							id: '1',
							title: 'Test Conversation 1',
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						},
						{
							id: '2',
							title: 'Test Conversation 2',
							created_at: new Date(Date.now() - 86400000).toISOString(),
							updated_at: new Date(Date.now() - 86400000).toISOString()
						}
					],
					hasMore: false,
					total: 2
				}
			}
		}))
	};
});

// Mock essential dependencies
vi.mock('svelte/transition', () => ({
	fade: mocks.transitionMocks.fade,
	fly: mocks.transitionMocks.fly
}));

vi.mock('$app/navigation', () => ({
	goto: mocks.navigationMocks.goto
}));

vi.mock('$app/forms', () => ({
	deserialize: mocks.mockDeserialize
}));

// Simple mock for stores
vi.mock('$lib/stores', () => ({
	conversationsOpen: mocks.mockConversationsOpen
}));

// Mock global fetch
global.fetch = vi.fn(() =>
	Promise.resolve({
		text: () => Promise.resolve('mockResponseText')
	})
) as any;

// Import component after all mocks are set up
import ConversationsSideBar from '$lib/components/sidebar/ConversationsSideBar.svelte';

describe('ConversationsSideBar Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = '';
		mocks.mockConversationsOpen.set(true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should be defined', () => {
		expect(ConversationsSideBar).toBeDefined();
	});

	it('should be a constructor function', () => {
		expect(typeof ConversationsSideBar).toBe('function');
	});

	it('renders with the correct header', () => {
		const { container } = render(ConversationsSideBar, {
			props: {
				paymentTier: PaymentTier.PayAsYouGo
			}
		});

		// Check if the sidebar container is rendered
		const sidebar = container.querySelector('.conversations-sidebar');
		expect(sidebar).not.toBeNull();

		// Check if header has the correct title
		const headerTitle = container.querySelector('.header h2');
		expect(headerTitle).not.toBeNull();
		if (headerTitle) {
			expect(headerTitle.textContent).toBe('Chat history');
		}
	});

	it('closes the sidebar when close button is clicked', async () => {
		const { container } = render(ConversationsSideBar, {
			props: {
				paymentTier: PaymentTier.PayAsYouGo
			}
		});

		// Find the close button
		const closeButton = container.querySelector('.close-button');
		expect(closeButton).not.toBeNull();

		// Reset the mock to clear previous calls
		mocks.mockConversationsOpen.set.mockClear();

		// Click the close button
		if (closeButton) {
			await fireEvent.click(closeButton);

			// Verify that conversationsOpen was set to false
			expect(mocks.mockConversationsOpen.set).toHaveBeenCalledWith(false);
		}
	});

	it('shows loading state initially', () => {
		const { container } = render(ConversationsSideBar, {
			props: {
				paymentTier: PaymentTier.PayAsYouGo
			}
		});

		// Should show loading initially
		const loadingElement = container.querySelector('.loading');
		expect(loadingElement).not.toBeNull();
		if (loadingElement) {
			expect(loadingElement.textContent).toContain('Loading conversations');
		}
	});
});
