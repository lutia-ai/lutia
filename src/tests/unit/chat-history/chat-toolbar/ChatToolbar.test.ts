/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ChatToolbar from '$lib/components/chat-history/chat-toolbar/ChatToolbar.svelte';
import { chatHistory } from '$lib/stores';
import type { LlmChat } from '$lib/types/types';

// Mock the needed dependencies
vi.mock('$lib/models/modelUtils', () => ({
	formatModelEnumToReadable: vi.fn((model) => {
		if (model === 'claude37Sonnet') return 'Claude 3.7 Sonnet';
		return model;
	})
}));

vi.mock('$lib/components/chat-history/utils/copying', () => ({
	copyToClipboard: vi.fn().mockResolvedValue(undefined),
	updateChatHistoryToCopiedState: vi.fn()
}));

vi.mock('$lib/components/chat-history/utils/regenerateMessage', () => ({
	regenerateMessage: vi.fn().mockResolvedValue(undefined)
}));

// Mock the stores
vi.mock('$lib/stores', () => ({
	chatHistory: {
		subscribe: vi.fn(),
		update: vi.fn()
	}
}));

describe('ChatToolbar Component', () => {
	// Sample LlmChat props
	const mockChat: LlmChat = {
		message_id: 123,
		by: 'claude37Sonnet',
		text: 'Hello, this is a test response',
		input_cost: 0.0025,
		output_cost: 0.0035,
		price_open: false,
		loading: false,
		copied: false,
		components: [
			{
				type: 'text',
				content: 'Hello, this is a test response'
			}
		]
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders with proper model name formatting', () => {
		const { getByText } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: mockChat
			}
		});

		// The model name should be formatted properly in the refresh button
		const modelNameElement = getByText('Claude 3.7 Sonnet');
		expect(modelNameElement).toBeInTheDocument();
	});

	it('handles copy button click', async () => {
		const { component, getByRole } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: mockChat
			}
		});

		// Find the copy button - there are multiple buttons, so we need to find the right one
		const copyButton = getByRole('button', { name: /copy/i });

		// Click the copy button
		await fireEvent.click(copyButton);

		// Check that the copy functions were called with the right args
		const { copyToClipboard, updateChatHistoryToCopiedState } = await import(
			'$lib/components/chat-history/utils/copying'
		);
		expect(copyToClipboard).toHaveBeenCalledWith(mockChat.text);
		expect(updateChatHistoryToCopiedState).toHaveBeenCalledWith(0, 0);
	});

	it('handles view cost button click', async () => {
		const user = userEvent.setup();

		// Create a mutable copy of the mockChat
		const testChat = { ...mockChat };

		const { getByRole, getByText, rerender } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: testChat
			}
		});

		// Find the cost button
		const costButton = getByRole('button', { name: /view cost/i });

		// Click the cost button
		await user.click(costButton);

		// price_open should be set to true
		expect(testChat.price_open).toBe(true);

		// Rerender to see the PriceLabel
		rerender({ chatIndex: 0, chat: testChat });

		// The PriceLabel component should now be visible with input cost
		expect(getByText('Input:')).toBeInTheDocument();
	});

	it('handles regenerate button click', async () => {
		const { getByRole } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: mockChat
			}
		});

		// Find the regenerate button
		const regenerateButton = getByRole('button', { name: /regenerate response/i });

		// Click the regenerate button
		await fireEvent.click(regenerateButton);

		// Check that regenerateMessage was called with the right message ID
		const { regenerateMessage } = await import(
			'$lib/components/chat-history/utils/regenerateMessage'
		);
		expect(regenerateMessage).toHaveBeenCalledWith(123);
	});

	it('renders copied state when chat.copied is true', () => {
		const copiedChat = { ...mockChat, copied: true };

		const { getByText } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: copiedChat
			}
		});

		// Should show "copied" instead of "copy"
		expect(getByText('copied')).toBeInTheDocument();
	});
});
