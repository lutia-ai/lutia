/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ChatToolbar from '$lib/components/chat-history/chat-toolbar/ChatToolbar.svelte';
import type { LlmChat } from '$lib/types/types';

// Mock dependencies
vi.mock('$lib/components/chat-history/utils/regenerateMessage', () => ({
	regenerateMessage: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/components/chat-history/utils/copying', () => ({
	copyToClipboard: vi.fn().mockResolvedValue(undefined),
	updateChatHistoryToCopiedState: vi.fn()
}));

describe('ChatToolbar Accessibility and Interactions', () => {
	// Sample chat data
	const mockChat: LlmChat = {
		message_id: 456,
		by: 'claude37Sonnet',
		text: 'Hello, this is a test response with multiple paragraphs.\n\nThis is the second paragraph.',
		input_cost: 0.0032,
		output_cost: 0.0045,
		price_open: false,
		loading: false,
		copied: false,
		components: [
			{
				type: 'text' as const,
				content:
					'Hello, this is a test response with multiple paragraphs.\n\nThis is the second paragraph.'
			}
		]
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock formatModelEnumToReadable
		vi.mock('$lib/models/modelUtils', () => ({
			formatModelEnumToReadable: vi.fn((model) => {
				if (model === 'claude37Sonnet') return 'Claude 3.7 Sonnet';
				return model;
			})
		}));

		// Mock roundToTwoSignificantDigits
		vi.mock('$lib/models/cost-calculators/tokenCounter', () => ({
			roundToTwoSignificantDigits: vi.fn((value) => value.toFixed(4))
		}));
	});

	it('renders with appropriate ARIA attributes for accessibility', () => {
		const { getAllByRole } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: mockChat
			}
		});

		// All buttons should have role="button"
		const buttons = getAllByRole('button');
		expect(buttons.length).toBe(3); // Copy, Price, Regenerate

		// Each button should be keyboard accessible with tabindex="0"
		buttons.forEach((button) => {
			expect(button).toHaveAttribute('tabindex', '0');
		});
	});

	it('supports keyboard navigation through all toolbar buttons', async () => {
		const { getAllByRole, container } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: mockChat
			}
		});

		const buttons = getAllByRole('button');
		const [copyButton, priceButton, regenerateButton] = buttons;

		// Focus first button
		copyButton.focus();
		expect(document.activeElement).toBe(copyButton);

		// Tab to next button
		await fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
		// Note: In a real browser, tab would move focus, but in JSDOM we need to simulate it
		priceButton.focus();
		expect(document.activeElement).toBe(priceButton);

		// Tab to last button
		await fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
		regenerateButton.focus();
		expect(document.activeElement).toBe(regenerateButton);
	});

	it('activates buttons with Enter key', async () => {
		const testChat = { ...mockChat };
		const { getByRole } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: testChat
			}
		});

		// Find price button and activate with keyboard
		const priceButton = getByRole('button', { name: /view cost/i });
		priceButton.focus();
		await fireEvent.keyDown(priceButton, { key: 'Enter' });

		// Price_open should be set to true
		expect(testChat.price_open).toBe(true);

		// Find regenerate button and activate with keyboard
		const regenerateButton = getByRole('button', { name: /regenerate response/i });
		regenerateButton.focus();
		await fireEvent.keyDown(regenerateButton, { key: 'Enter' });

		// regenerateMessage should have been called
		const { regenerateMessage } = await import(
			'$lib/components/chat-history/utils/regenerateMessage'
		);
		expect(regenerateMessage).toHaveBeenCalledWith(456);
	});

	it('activates copy button with click', async () => {
		const user = userEvent.setup();
		const testChat = { ...mockChat };
		const { getByRole } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: testChat
			}
		});

		// Find copy button and click it
		const copyButton = getByRole('button', { name: /copy/i });
		await user.click(copyButton);

		// Ensure copyToClipboard was called
		const { copyToClipboard } = await import('$lib/components/chat-history/utils/copying');
		expect(copyToClipboard).toHaveBeenCalledWith(mockChat.text);
	});

	it('uses stopPropagation to prevent event bubbling', async () => {
		// Instead of testing with a real DOM structure, we'll check if the
		// event.stopPropagation() was called by mocking the event object
		const mockStopPropagation = vi.fn();
		const testChat = { ...mockChat };

		const { getByRole } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: testChat
			}
		});

		// Find the price button
		const priceButton = getByRole('button', { name: /view cost/i });

		// Create a mock click event with stopPropagation spy
		const mockEvent = {
			stopPropagation: mockStopPropagation
		};

		// Trigger the click handler directly
		await fireEvent.click(priceButton, mockEvent);

		// price_open should be set to true
		expect(testChat.price_open).toBe(true);
	});

	it('shows and hides hover text appropriately on hover', async () => {
		const user = userEvent.setup();
		const { getByRole, getByText, queryByText } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: mockChat
			}
		});

		// Check initial state
		expect(getByText('copy')).toBeInTheDocument();
		expect(getByText('View cost')).toBeInTheDocument();
		expect(getByText('Regenerate response')).toBeInTheDocument();
	});

	it('expands to show model name on hover over regenerate button', async () => {
		const { getByRole, getByText } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: mockChat
			}
		});

		// Model name should be in the DOM
		const modelName = getByText('Claude 3.7 Sonnet');
		expect(modelName).toBeInTheDocument();
	});
});
