/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import type { UserWithSettings } from '$lib/types/types';
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
		mockDarkMode: createMockStore<boolean>(false),
		mockShowPricing: createMockStore<boolean>(false),
		mockShowLegacyModels: createMockStore<boolean>(false),
		mockChosenCompany: createMockStore<any>('openAI'),
		mockChatHistory: createMockStore<any[]>([]),
		mockIsContextWindowAuto: createMockStore<boolean>(true),
		mockChosenModel: createMockStore<any>({ name: 'GPT_4o' }),
		mockIsSettingsOpen: createMockStore<boolean>(false),
		mockConversationsOpen: createMockStore<boolean>(false),
		mockCompanySelection: createMockStore<any[]>(['anthropic', 'google', 'xAI', 'deepSeek']),
		mockGptModelSelection: createMockStore<any[]>([{ name: 'GPT_4o' }]),
		mockConversationId: createMockStore<string>('123'),
		mockContextWindowOpen: createMockStore<boolean>(false),
		mockMobileSidebarOpen: createMockStore<boolean>(false),
		mockFilesSidebarOpen: createMockStore<boolean>(false),
		pageStore: {
			subscribe: vi.fn((fn) => {
				fn({ url: { pathname: '/chat/123' } });
				return () => {};
			})
		},
		transitionMocks: {
			fade: vi.fn(() => ({ duration: 0, css: vi.fn() })),
			fly: vi.fn(() => ({ duration: 0, css: vi.fn() }))
		},
		navigationMocks: {
			goto: vi.fn()
		},
		signInMock: vi.fn()
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

vi.mock('$app/stores', () => ({
	page: mocks.pageStore
}));

vi.mock('@auth/sveltekit/client', () => ({
	signIn: mocks.signInMock
}));

// Simple mock for stores
vi.mock('$lib/stores', () => ({
	darkMode: mocks.mockDarkMode,
	showPricing: mocks.mockShowPricing,
	showLegacyModels: mocks.mockShowLegacyModels,
	chosenCompany: mocks.mockChosenCompany,
	chatHistory: mocks.mockChatHistory,
	isContextWindowAuto: mocks.mockIsContextWindowAuto,
	chosenModel: mocks.mockChosenModel,
	isSettingsOpen: mocks.mockIsSettingsOpen,
	conversationsOpen: mocks.mockConversationsOpen,
	companySelection: mocks.mockCompanySelection,
	gptModelSelection: mocks.mockGptModelSelection,
	conversationId: mocks.mockConversationId,
	contextWindowOpen: mocks.mockContextWindowOpen,
	mobileSidebarOpen: mocks.mockMobileSidebarOpen,
	filesSidebarOpen: mocks.mockFilesSidebarOpen
}));

// Import component after all mocks are set up
import Sidebar from '$lib/components/sidebar/Sidebar.svelte';

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

describe('Sidebar Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = '';
		mocks.mockIsContextWindowAuto.set(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('toggles the context window when the button is clicked', async () => {
		const { getByText } = render(Sidebar, { props: { user: mockUser, userImage: null } });

		const contextButton = getByText('View context window').closest('.settings-icon');
		await fireEvent.click(contextButton!);

		expect(mocks.mockContextWindowOpen.set).toHaveBeenCalledWith(true);
		expect(mocks.mockConversationsOpen.set).toHaveBeenCalledWith(false);
		expect(mocks.mockFilesSidebarOpen.set).toHaveBeenCalledWith(false);
	});

	it('creates a new chat when clicking the new chat button', async () => {
		const { getByText } = render(Sidebar, { props: { user: mockUser, userImage: null } });

		const newChatButton = getByText('New chat').closest('.settings-icon');
		await fireEvent.click(newChatButton!);

		expect(mocks.mockChatHistory.set).toHaveBeenCalledWith([]);
		expect(mocks.mockConversationId.set).toHaveBeenCalledWith('new');
		expect(mocks.navigationMocks.goto).toHaveBeenCalledWith('/chat/new', {
			replaceState: true
		});
	});
});
