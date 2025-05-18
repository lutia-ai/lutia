/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	copyToClipboard,
	updateChatHistoryToCopiedState
} from '$lib/components/chat-history/utils/copying';
import { chatHistory } from '$lib/stores';
import type { ChatComponent, LlmChat } from '$lib/types/types';
import { isLlmChatComponent, isCodeComponent } from '$lib/types/typeGuards';
import type { Updater } from 'svelte/store';

// Mock the stores
vi.mock('$lib/stores', () => {
	return {
		chatHistory: {
			subscribe: vi.fn(),
			set: vi.fn(),
			update: vi.fn()
		}
	};
});

// Mock the type guards
vi.mock('$lib/types/typeGuards', () => {
	return {
		isLlmChatComponent: vi.fn().mockImplementation((chat) => chat.by !== 'user'),
		isCodeComponent: vi.fn().mockImplementation((component) => component.type === 'code')
	};
});

describe('Copying Utility Functions', () => {
	let originalClipboard: any;
	let mockUpdateFn: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		// Save original clipboard API
		originalClipboard = navigator.clipboard;

		// Mock clipboard API
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: vi.fn().mockResolvedValue(undefined)
			},
			configurable: true
		});

		// Setup chat history update mock
		mockUpdateFn = vi.fn();
		(chatHistory.update as any).mockImplementation((callback: Updater<ChatComponent[]>) => {
			const fakeHistory: ChatComponent[] = [
				{
					message_id: 1,
					by: 'user',
					text: 'Hello'
				},
				{
					message_id: 2,
					by: 'claude37Sonnet',
					text: 'Hello from Claude',
					input_cost: 0.001,
					output_cost: 0.002,
					price_open: false,
					loading: false,
					copied: false,
					components: [
						{
							type: 'text',
							content: 'Hello from Claude'
						},
						{
							type: 'code',
							language: 'javascript',
							code: 'console.log("Hello")',
							copied: false
						}
					]
				}
			];

			const result = callback(fakeHistory);
			mockUpdateFn(result);
			return result;
		});
	});

	afterEach(() => {
		// Restore original clipboard
		Object.defineProperty(navigator, 'clipboard', {
			value: originalClipboard,
			configurable: true
		});

		vi.useRealTimers();
	});

	describe('copyToClipboard', () => {
		it('copies text to clipboard using clipboard API when available', async () => {
			await copyToClipboard('Test text');
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test text');
		});

		it('handles clipboard API errors gracefully', async () => {
			// Mock clipboard API failure
			Object.defineProperty(navigator, 'clipboard', {
				value: {
					writeText: vi.fn().mockRejectedValue(new Error('Clipboard error'))
				},
				configurable: true
			});

			// Mock console.error to prevent test output pollution
			const originalConsoleError = console.error;
			console.error = vi.fn();

			try {
				await expect(copyToClipboard('Test text')).rejects.toThrow('Clipboard error');
				expect(console.error).toHaveBeenCalled();
			} finally {
				console.error = originalConsoleError;
			}
		});

		it('falls back to document.execCommand when clipboard API is not available', async () => {
			// Remove clipboard API
			Object.defineProperty(navigator, 'clipboard', {
				value: undefined,
				configurable: true
			});

			// Mock document.execCommand
			document.execCommand = vi.fn().mockReturnValue(true);

			// Mock DOM operations
			const mockAppendChild = vi.fn();
			const mockRemoveChild = vi.fn();
			const mockTextArea = {
				value: '',
				select: vi.fn()
			};

			document.body.appendChild = mockAppendChild;
			document.body.removeChild = mockRemoveChild;
			document.createElement = vi.fn().mockReturnValue(mockTextArea);

			await copyToClipboard('Test text');

			expect(document.createElement).toHaveBeenCalledWith('textarea');
			expect(mockTextArea.value).toBe('Test text');
			expect(mockAppendChild).toHaveBeenCalled();
			expect(mockTextArea.select).toHaveBeenCalled();
			expect(document.execCommand).toHaveBeenCalledWith('copy');
			expect(mockRemoveChild).toHaveBeenCalled();
		});

		it('handles execCommand errors gracefully', async () => {
			// Remove clipboard API
			Object.defineProperty(navigator, 'clipboard', {
				value: undefined,
				configurable: true
			});

			// Mock document.execCommand to throw error
			document.execCommand = vi.fn().mockImplementation(() => {
				throw new Error('execCommand error');
			});

			// Mock DOM operations
			document.body.appendChild = vi.fn();
			document.body.removeChild = vi.fn();
			document.createElement = vi.fn().mockReturnValue({
				value: '',
				select: vi.fn()
			});

			// Mock console.error to prevent test output pollution
			const originalConsoleError = console.error;
			console.error = vi.fn();

			try {
				await expect(copyToClipboard('Test text')).rejects.toThrow('execCommand error');
				expect(console.error).toHaveBeenCalled();
				expect(document.body.removeChild).toHaveBeenCalled(); // Should still clean up
			} finally {
				console.error = originalConsoleError;
			}
		});
	});

	describe('updateChatHistoryToCopiedState', () => {
		it('updates a message to copied state and resets after timeout', () => {
			updateChatHistoryToCopiedState(1, 0);

			// Check that update was called once immediately
			expect(chatHistory.update).toHaveBeenCalledTimes(1);

			// First update should set copied to true for the chat
			const firstUpdateResult = mockUpdateFn.mock.calls[0][0];
			expect(firstUpdateResult[1].copied).toBe(true);

			// Fast-forward time to trigger timeout
			vi.advanceTimersByTime(3000);

			// Should have been called again after timeout
			expect(chatHistory.update).toHaveBeenCalledTimes(2);

			// Second update should reset copied to false
			const secondUpdateResult = mockUpdateFn.mock.calls[1][0];
			expect(secondUpdateResult[1].copied).toBe(false);
		});

		it('updates a code component to copied state and resets after timeout', () => {
			updateChatHistoryToCopiedState(1, 1);

			// First update should set copied to true for the code component
			const firstUpdateResult = mockUpdateFn.mock.calls[0][0];
			expect(firstUpdateResult[1].components[1].copied).toBe(true);

			// Fast-forward time to trigger timeout
			vi.advanceTimersByTime(3000);

			// Second update should reset copied to false
			const secondUpdateResult = mockUpdateFn.mock.calls[1][0];
			expect(secondUpdateResult[1].components[1].copied).toBe(false);
		});
	});
});
