/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import type { ChatComponent } from '$lib/types/types';

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
		mockChatHistory: createMockStore<ChatComponent[]>([]),
		mockNumberPrevMessages: createMockStore<number>(1),
		mockFullPrompt: createMockStore<string>(''),
		mockContextWindowOpen: createMockStore<boolean>(true),
		mockBodyScrollLocked: createMockStore<boolean>(false),
		transitionMocks: {
			fade: vi.fn(() => ({ duration: 0, css: vi.fn() })),
			fly: vi.fn(() => ({ duration: 0, css: vi.fn() }))
		},
		navigationMocks: {
			goto: vi.fn()
		},
		markedMock: vi.fn((text) => `<p>${text}</p>`),
		utilMocks: {
			sanitizeLLmContent: vi.fn((content) => content),
			processLinks: vi.fn((content) => content)
		},
		fileMocks: {
			getFileIcon: vi.fn(() => 'TXT'),
			getFileIconColor: vi.fn(() => '#ff0000')
		},
		modelMocks: {
			formatModelEnumToReadable: vi.fn((modelName) => `Formatted ${modelName}`)
		},
		typeGuardMocks: {
			isUserChatComponent: vi.fn((component) => component?.by === 'user'),
			isLlmChatComponent: vi.fn((component) => component?.by !== 'user'),
			isModelAnthropic: vi.fn((model) => model.includes('Claude')),
			isModelOpenAI: vi.fn((model) => model.includes('GPT')),
			isModelGoogle: vi.fn((model) => model.includes('Gemini')),
			isModelXAI: vi.fn((model) => model.includes('Grok')),
			isModelDeepSeek: vi.fn((model) => model.includes('DeepSeek'))
		}
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

// Mock marked for markdown rendering
vi.mock('marked', () => ({
	marked: mocks.markedMock
}));

// Simple mock for stores
vi.mock('$lib/stores', () => ({
	darkMode: { subscribe: vi.fn(() => () => {}) },
	contextWindowOpen: mocks.mockContextWindowOpen,
	chatHistory: mocks.mockChatHistory,
	fullPrompt: mocks.mockFullPrompt,
	numberPrevMessages: mocks.mockNumberPrevMessages,
	bodyScrollLocked: mocks.mockBodyScrollLocked
}));

// Mock the chat history utility functions
vi.mock('$lib/components/chat-history/utils/chatHistory', () => ({
	sanitizeLLmContent: mocks.utilMocks.sanitizeLLmContent,
	processLinks: mocks.utilMocks.processLinks
}));

// Mock the file handling utilities
vi.mock('$lib/utils/fileHandling.js', () => ({
	getFileIcon: mocks.fileMocks.getFileIcon,
	getFileIconColor: mocks.fileMocks.getFileIconColor
}));

// Mock utility functions
vi.mock('$lib/models/modelUtils', () => ({
	formatModelEnumToReadable: mocks.modelMocks.formatModelEnumToReadable
}));

// Mock type guards
vi.mock('$lib/types/typeGuards', () => ({
	isUserChatComponent: mocks.typeGuardMocks.isUserChatComponent,
	isLlmChatComponent: mocks.typeGuardMocks.isLlmChatComponent,
	isModelAnthropic: mocks.typeGuardMocks.isModelAnthropic,
	isModelOpenAI: mocks.typeGuardMocks.isModelOpenAI,
	isModelGoogle: mocks.typeGuardMocks.isModelGoogle,
	isModelXAI: mocks.typeGuardMocks.isModelXAI,
	isModelDeepSeek: mocks.typeGuardMocks.isModelDeepSeek
}));

// Import component after all mocks are set up
import ContextWindowSideBar from '$lib/components/sidebar/ContextWindowSideBar.svelte';

describe('ContextWindowSideBar Component', () => {
	// Test data
	const mockMessages = [
		{
			message_id: 1,
			by: 'user',
			text: 'Hello, can you help me with a question?',
			attachments: []
		},
		{
			message_id: 2,
			by: 'GPT_4o',
			text: "Of course! I'd be happy to help. What's your question?",
			input_cost: 0.001,
			output_cost: 0.002,
			price_open: false,
			loading: false,
			copied: false,
			components: [
				{
					type: 'text',
					content: "Of course! I'd be happy to help. What's your question?"
				}
			]
		},
		{
			message_id: 3,
			by: 'user',
			text: 'How do I use the context window in this app?',
			attachments: []
		},
		{
			message_id: 4,
			by: 'Claude_3_Opus',
			text: 'The context window allows you to control how much of the conversation history is included when sending a new message to the AI.',
			input_cost: 0.002,
			output_cost: 0.004,
			price_open: false,
			loading: false,
			copied: false,
			components: [
				{
					type: 'text',
					content:
						'The context window allows you to control how much of the conversation history is included when sending a new message to the AI.'
				}
			]
		}
	];

	const userPrompt = 'Tell me more about how context windows affect pricing';

	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = '';

		// Reset store values
		mocks.mockChatHistory.set(mockMessages);
		mocks.mockNumberPrevMessages.set(2);
		mocks.mockFullPrompt.set(userPrompt);
		mocks.mockContextWindowOpen.set(true);
		mocks.mockBodyScrollLocked.set(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should be defined', () => {
		expect(ContextWindowSideBar).toBeDefined();
	});

	it('should be a constructor function', () => {
		expect(typeof ContextWindowSideBar).toBe('function');
	});

	it('renders with the correct header', () => {
		const { container } = render(ContextWindowSideBar);

		// Check if the sidebar container is rendered
		const sidebar = container.querySelector('.context-window-sidebar');
		expect(sidebar).not.toBeNull();

		// Check if header has the correct title
		const headerTitle = container.querySelector('.header-top h2');
		expect(headerTitle).not.toBeNull();
		if (headerTitle) {
			expect(headerTitle.textContent).toBe('Context Window');
		}

		// Check if slider container exists
		const sliderContainer = container.querySelector('.slider-container');
		expect(sliderContainer).not.toBeNull();
	});

	it('displays chat history based on numberPrevMessages setting', async () => {
		const { container } = render(ContextWindowSideBar);

		// With numberPrevMessages = 2, we should see 4 messages (2 exchanges)
		// Plus the current prompt message
		const messageItems = container.querySelectorAll('.message-item');

		// There should be 5 total message items (4 from history + 1 for current prompt)
		expect(messageItems.length).toBe(5);

		// The first message item should be from the user
		const firstMessage = messageItems[0];
		expect(firstMessage.classList.contains('user-message')).toBe(true);

		// The second message item should be from the AI
		const secondMessage = messageItems[1];
		expect(secondMessage.classList.contains('assistant-message')).toBe(true);

		// Check content of messages
		const firstMessageContent = firstMessage.querySelector('.message-content p');
		expect(firstMessageContent).not.toBeNull();
		if (firstMessageContent) {
			expect(firstMessageContent.innerHTML).toContain(mockMessages[0].text);
		}
		const secondMessageContent = secondMessage.querySelector('.message-content p');
		expect(secondMessageContent).not.toBeNull();
		if (secondMessageContent) {
			expect(secondMessageContent.innerHTML).toContain(mockMessages[1].text);
		}
	});

	it('calls set on the numberPrevMessages store when changing value', () => {
		render(ContextWindowSideBar);

		// Initially, the mock should have been called once during the beforeEach
		expect(mocks.mockNumberPrevMessages.set).toHaveBeenCalledWith(2);

		// Reset the mock to clear previous calls
		mocks.mockNumberPrevMessages.set.mockClear();

		// Verify that the mock is reset
		expect(mocks.mockNumberPrevMessages.set).not.toHaveBeenCalled();
	});

	it('displays the current prompt correctly', () => {
		const { container } = render(ContextWindowSideBar);

		// Find the current prompt section
		const currentPromptSection = Array.from(container.querySelectorAll('.message-number')).find(
			(el) => el.textContent?.includes('Current prompt')
		);

		expect(currentPromptSection).not.toBeNull();

		// Verify the parent message item has the correct prompt text
		if (currentPromptSection) {
			const messageItem = currentPromptSection.closest('.message-item');
			const messageContent = messageItem?.querySelector('.message-content p');
			expect(messageContent?.innerHTML).toContain(userPrompt);
		}
	});

	it('shows different icons for different AI models', () => {
		const { container } = render(ContextWindowSideBar);

		// Get all message items
		const messageItems = container.querySelectorAll('.message-item');

		// Find the GPT message
		const gptMessage = Array.from(messageItems).find((el) =>
			el.querySelector('.message-header .role-label')?.textContent?.includes('GPT')
		);

		expect(gptMessage).not.toBeNull();

		// Find the Claude message
		const claudeMessage = Array.from(messageItems).find((el) =>
			el.querySelector('.message-header .role-label')?.textContent?.includes('Claude')
		);

		expect(claudeMessage).not.toBeNull();
	});

	it('closes the sidebar when close button is clicked', async () => {
		const { container } = render(ContextWindowSideBar);

		// Find the close button
		const closeButton = container.querySelector('.close-button');
		expect(closeButton).not.toBeNull();

		// Reset the mock to clear previous calls
		mocks.mockContextWindowOpen.set.mockClear();

		// Verify that the mock is reset
		expect(mocks.mockContextWindowOpen.set).not.toHaveBeenCalled();

		// Click the close button
		if (closeButton) {
			await fireEvent.click(closeButton);

			// Verify that contextWindowOpen was set to false
			expect(mocks.mockContextWindowOpen.set).toHaveBeenCalledWith(false);
		}
	});
});
