/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest';

// Mock the stores at the top, before any other imports
vi.mock('$lib/stores', () => {
	const writableMock = {
		subscribe: (callback: (value: any) => void) => {
			callback([]);
			return () => {};
		}
	};

	return {
		chatHistory: writableMock,
		darkMode: {
			subscribe: (callback: (value: boolean) => void) => {
				callback(false);
				return () => {};
			}
		}
	};
});

// Mock the image import
vi.mock('$lib/images/claude.png', () => ({
	default: 'claude.png'
}));

// Mock the markdown processor
vi.mock('$lib/utils/marked-extensions', () => ({
	default: vi.fn().mockImplementation((text: string) => text)
}));

// Mock chat history utilities
vi.mock('$lib/components/chat-history/utils/chatHistory', () => ({
	processLinks: vi.fn().mockImplementation((text: string) => text),
	sanitizeLLmContent: vi.fn().mockImplementation((text: string) => text)
}));

// Mock the necessary utilities and functions
vi.mock('$lib/components/chat-history/utils/copying', () => ({
	copyToClipboard: vi.fn(),
	updateChatHistoryToCopiedState: vi.fn()
}));

vi.mock('$lib/components/chat-history/utils/codeContainerUtils', () => ({
	changeTabWidth: vi.fn((code) => code)
}));

// Mock the type guards
vi.mock('$lib/types/typeGuards', () => ({
	isLlmChatComponent: vi.fn().mockReturnValue(true),
	isModelAnthropic: vi.fn().mockImplementation((model: string) => model.includes('Claude')),
	isModelOpenAI: vi.fn().mockImplementation((model: string) => model.includes('gpt')),
	isModelGoogle: vi.fn().mockImplementation((model: string) => model.includes('Gemini')),
	isModelXAI: vi.fn().mockImplementation((model: string) => model.includes('Grok')),
	isModelDeepSeek: vi.fn().mockImplementation((model: string) => model.includes('DeepSeek'))
}));

// Regular imports after all mocks
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LlmChatComponent from '$lib/components/chat-history/llm-chat/LlmChatComponent.svelte';
import type { LlmChat, Component } from '$lib/types/types';

describe('LlmChatComponent Integration Tests', () => {
	let mockOpenImageViewer: (image: string, alt: string) => void;

	beforeEach(() => {
		vi.clearAllMocks();
		mockOpenImageViewer = vi.fn();
	});

	it('should render text content correctly', () => {
		const mockChat: LlmChat = {
			message_id: 1,
			by: 'Claude-3-Opus',
			text: 'This is a test message from Claude.',
			input_cost: 0.01,
			output_cost: 0.02,
			price_open: false,
			copied: false,
			loading: false,
			components: [
				{
					type: 'text',
					content: 'This is a test message from Claude.'
				} as Component
			]
		};

		const { container } = render(LlmChatComponent, {
			props: {
				chatIndex: 0,
				chat: mockChat,
				openImageViewer: mockOpenImageViewer
			}
		});

		expect(container.textContent).toContain('This is a test message from Claude.');
		expect(container.querySelector('.llm-container')).not.toBeNull();
	});

	it('should render GPT messages with the OpenAI model label', () => {
		const mockChat: LlmChat = {
			message_id: 2,
			by: 'gpt-4o',
			text: 'Hello from GPT-4o',
			input_cost: 0.01,
			output_cost: 0.02,
			price_open: false,
			copied: false,
			loading: false,
			components: [
				{
					type: 'text',
					content: 'Hello from GPT-4o'
				} as Component
			]
		};

		const { container } = render(LlmChatComponent, {
			props: {
				chatIndex: 0,
				chat: mockChat,
				openImageViewer: mockOpenImageViewer
			}
		});

		expect(container.textContent).toContain('Hello from GPT-4o');
		expect(container.textContent).toContain('gpt-4o');
	});

	it('should render code blocks correctly', () => {
		const mockChat: LlmChat = {
			message_id: 3,
			by: 'Claude-3-Opus',
			text: 'Here is some code:',
			input_cost: 0.01,
			output_cost: 0.02,
			price_open: false,
			copied: false,
			loading: false,
			components: [
				{
					type: 'text',
					content: 'Here is some code:'
				} as Component,
				{
					type: 'code',
					code: 'console.log("Hello world");',
					language: 'javascript',
					tabWidth: 4,
					copied: false
				} as Component
			]
		};

		const { container } = render(LlmChatComponent, {
			props: {
				chatIndex: 0,
				chat: mockChat,
				openImageViewer: mockOpenImageViewer
			}
		});

		expect(container.textContent).toContain('Here is some code:');
		expect(container.querySelector('.code-container')).not.toBeNull();
	});

	it('should show loading indicator when message is loading', () => {
		const mockChat: LlmChat = {
			message_id: 6,
			by: 'Claude-3-Opus',
			text: 'Loading...',
			input_cost: 0.01,
			output_cost: 0.02,
			price_open: false,
			copied: false,
			loading: true,
			components: [
				{
					type: 'text',
					content: 'Loading...'
				} as Component
			]
		};

		const { container } = render(LlmChatComponent, {
			props: {
				chatIndex: 0,
				chat: mockChat,
				openImageViewer: mockOpenImageViewer
			}
		});

		// Check if loading indicators are present
		expect(container.querySelector('.rotateLoading')).not.toBeNull();
	});

	it('should render reasoning component when reasoning is provided', () => {
		const mockChat: LlmChat = {
			message_id: 8,
			by: 'Claude-3-Opus',
			text: 'This is the response',
			input_cost: 0.01,
			output_cost: 0.02,
			price_open: false,
			copied: false,
			loading: false,
			components: [
				{
					type: 'text',
					content: 'This is the response'
				} as Component
			],
			reasoning: {
				type: 'reasoning',
				content: 'This is the reasoning behind the response'
			}
		};

		const { container } = render(LlmChatComponent, {
			props: {
				chatIndex: 0,
				chat: mockChat,
				openImageViewer: mockOpenImageViewer
			}
		});

		expect(container.querySelector('.reasoning-paragraph')).not.toBeNull();
	});

	it('should display cost information when price_open is true', () => {
		const mockChat: LlmChat = {
			message_id: 9,
			by: 'Claude-3-Opus',
			text: 'This message has price information',
			input_cost: 0.05,
			output_cost: 0.1,
			price_open: true,
			copied: false,
			loading: false,
			components: [
				{
					type: 'text',
					content: 'This message has price information'
				} as Component
			]
		};

		const { container } = render(LlmChatComponent, {
			props: {
				chatIndex: 0,
				chat: mockChat,
				openImageViewer: mockOpenImageViewer
			}
		});

		expect(container.textContent).toContain('$0.05');
		expect(container.textContent).toContain('$0.10');
	});

	it('should toggle price information when price button is clicked', async () => {
		const mockChat: LlmChat = {
			message_id: 10,
			by: 'Claude-3-Opus',
			text: 'Click the price button',
			input_cost: 0.05,
			output_cost: 0.1,
			price_open: false,
			copied: false,
			loading: false,
			components: [
				{
					type: 'text',
					content: 'Click the price button'
				} as Component
			]
		};

		const { container } = render(LlmChatComponent, {
			props: {
				chatIndex: 0,
				chat: mockChat,
				openImageViewer: mockOpenImageViewer
			}
		});

		// Price information should not be visible initially
		expect(container.textContent).not.toContain('$0.05');

		// Find and click the price button - using the selector from ChatToolbar.svelte
		const priceButton = container.querySelector('.toolbar-item:nth-child(2)');
		expect(priceButton).not.toBeNull();

		if (priceButton) {
			await fireEvent.click(priceButton);
			// Price information should be visible after clicking
			expect(container.textContent).toContain('$0.05');
			expect(container.textContent).toContain('$0.10');
		}
	});
});
