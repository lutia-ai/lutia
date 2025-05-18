/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ChatToolbar from '$lib/components/chat-history/chat-toolbar/ChatToolbar.svelte';
import PriceLabel from '$lib/components/chat-history/chat-toolbar/PriceLabel.svelte';
import type { LlmChat, TextComponent, Component } from '$lib/types/types';

// Mock dependencies
vi.mock('$lib/models/cost-calculators/tokenCounter', () => ({
	roundToTwoSignificantDigits: vi.fn((value) => value.toFixed(4))
}));

describe('PriceLabel Integration with ChatToolbar', () => {
	// Sample chat data with varying costs
	const mockChats: Record<string, LlmChat> = {
		standard: {
			message_id: 789,
			by: 'claude37Sonnet',
			text: 'This is a standard response',
			input_cost: 0.0032,
			output_cost: 0.0045,
			price_open: false,
			loading: false,
			copied: false,
			components: [
				{
					type: 'text' as const,
					content: 'This is a standard response'
				}
			]
		},
		expensive: {
			message_id: 790,
			by: 'GPT_4',
			text: 'This is an expensive response',
			input_cost: 0.012,
			output_cost: 0.018,
			price_open: false,
			loading: false,
			copied: false,
			components: [
				{
					type: 'text' as const,
					content: 'This is an expensive response'
				}
			]
		},
		free: {
			message_id: 791,
			by: 'Llama_3',
			text: 'This is a free response',
			input_cost: 0,
			output_cost: 0,
			price_open: false,
			loading: false,
			copied: false,
			components: [
				{
					type: 'text' as const,
					content: 'This is a free response'
				}
			]
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock formatModelEnumToReadable
		vi.mock('$lib/models/modelUtils', () => ({
			formatModelEnumToReadable: vi.fn((model: string) => {
				const modelMap: Record<string, string> = {
					claude37Sonnet: 'Claude 3.7 Sonnet',
					GPT_4: 'GPT 4',
					Llama_3: 'Llama 3'
				};
				return modelMap[model] || model;
			})
		}));
	});

	it('displays correct costs in PriceLabel independently', () => {
		const { getByText } = render(PriceLabel, {
			props: {
				inputCost: 0.0032,
				outputCost: 0.0045
			}
		});

		// Verify each cost is correctly displayed
		expect(getByText('Input:')).toBeInTheDocument();
		expect(getByText('$0.0032')).toBeInTheDocument();
		expect(getByText('Output:')).toBeInTheDocument();
		expect(getByText('$0.0045')).toBeInTheDocument();
		expect(getByText('Total:')).toBeInTheDocument();
		expect(getByText('$0.0077')).toBeInTheDocument(); // 0.0032 + 0.0045
	});

	it('handles zero costs correctly', () => {
		const { getAllByText } = render(PriceLabel, {
			props: {
				inputCost: 0,
				outputCost: 0
			}
		});

		// Verify zero costs are displayed correctly
		const zeroCosts = getAllByText('$0.0000');
		expect(zeroCosts.length).toBe(3); // Input, Output, and Total
	});

	it('integrates properly with ChatToolbar when price_open is true', () => {
		const testChat = { ...mockChats.standard, price_open: true };

		const { getByText } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: testChat
			}
		});

		// Verify that PriceLabel is displayed with correct values
		expect(getByText('Input:')).toBeInTheDocument();
		expect(getByText('$0.0032')).toBeInTheDocument();
		expect(getByText('Output:')).toBeInTheDocument();
		expect(getByText('$0.0045')).toBeInTheDocument();
		expect(getByText('Total:')).toBeInTheDocument();
		expect(getByText('$0.0077')).toBeInTheDocument();
	});

	it('toggles PriceLabel visibility when clicking cost button', async () => {
		const user = userEvent.setup();
		const testChat = { ...mockChats.standard };

		const { getByRole, queryByText, rerender } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: testChat
			}
		});

		// Initially, PriceLabel should not be visible
		expect(queryByText('Input:')).toBeNull();

		// Click the cost button
		const costButton = getByRole('button', { name: /view cost/i });
		await user.click(costButton);

		// price_open should be set to true
		expect(testChat.price_open).toBe(true);

		// Rerender to see the PriceLabel
		rerender({ chatIndex: 0, chat: testChat });

		// Now PriceLabel should be visible
		expect(queryByText('Input:')).toBeInTheDocument();
		expect(queryByText('$0.0032')).toBeInTheDocument();
	});

	it('properly formats large cost values', () => {
		const { getByText } = render(PriceLabel, {
			props: {
				inputCost: 1.2345,
				outputCost: 2.3456
			}
		});

		// Verify that large costs are formatted correctly
		expect(getByText('$1.2345')).toBeInTheDocument();
		expect(getByText('$2.3456')).toBeInTheDocument();
		expect(getByText('$3.5801')).toBeInTheDocument(); // 1.2345 + 2.3456
	});

	it('displays different models with appropriate costs', async () => {
		// Test with different model types and costs
		for (const [chatType, chatData] of Object.entries(mockChats)) {
			const testChat = { ...chatData, price_open: true };

			const { getByText, getAllByText, unmount } = render(ChatToolbar, {
				props: {
					chatIndex: 0,
					chat: testChat
				}
			});

			// Verify costs are displayed correctly
			if (chatType === 'free') {
				// Use getAllByText for $0.0000 since it appears multiple times
				const zeroCosts = getAllByText('$0.0000');
				expect(zeroCosts.length).toBe(3); // Should have 3 instances: input, output, and total
			} else if (chatType === 'expensive') {
				expect(getByText('$0.0120')).toBeInTheDocument(); // input
				expect(getByText('$0.0180')).toBeInTheDocument(); // output
				expect(getByText('$0.0300')).toBeInTheDocument(); // total
			} else {
				expect(getByText('$0.0032')).toBeInTheDocument(); // input
				expect(getByText('$0.0045')).toBeInTheDocument(); // output
				expect(getByText('$0.0077')).toBeInTheDocument(); // total
			}

			// Clean up between tests
			unmount();
		}
	});

	it('preserves PriceLabel state during hover interactions', async () => {
		const user = userEvent.setup();
		const testChat = { ...mockChats.standard, price_open: true };

		const { getByRole, getByText } = render(ChatToolbar, {
			props: {
				chatIndex: 0,
				chat: testChat
			}
		});

		// PriceLabel should be visible initially
		expect(getByText('Input:')).toBeInTheDocument();

		// Hover over the copy button
		const copyButton = getByRole('button', { name: /copy/i });
		await user.hover(copyButton);

		// PriceLabel should still be visible
		expect(getByText('Input:')).toBeInTheDocument();

		// Hover over the regenerate button
		const regenerateButton = getByRole('button', { name: /regenerate response/i });
		await user.hover(regenerateButton);

		// PriceLabel should still be visible
		expect(getByText('Input:')).toBeInTheDocument();
	});
});
