/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import type { UserWithSettings } from '$lib/types/types';

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
            subscribers.forEach(callback => callback(value));
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

describe('Sidebar Component', () => {
    it('should be defined', () => {
        expect(Sidebar).toBeDefined();
    });
    
    it('should be a constructor function', () => {
        expect(typeof Sidebar).toBe('function');
    });

    it('should have a prototype', () => {
        expect(Sidebar.prototype).toBeDefined();
    });
}); 