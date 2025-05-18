/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	calculateTabWidth,
	changeTabWidth,
	closeAllTabWidths
} from '$lib/components/chat-history/utils/codeContainerUtils';
import { chatHistory } from '$lib/stores';
import { isLlmChatComponent, isCodeComponent } from '$lib/types/typeGuards';
import type { ChatComponent } from '$lib/types/types';
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

describe('Code Container Utility Functions', () => {
	let mockUpdateFn: any;

	beforeEach(() => {
		vi.clearAllMocks();

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
					price_open: true,
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
							copied: false,
							tabWidthOpen: true
						}
					]
				}
			];

			const result = callback(fakeHistory);
			mockUpdateFn(result);
			return result;
		});
	});

	describe('calculateTabWidth', () => {
		it('returns 0 for code with no indentation', () => {
			const code = 'const x = 1;\nconst y = 2;\nconsole.log(x + y);';
			const tabWidth = calculateTabWidth(code);
			expect(tabWidth).toBe(0);
		});

		it('calculates tab width from first indented line', () => {
			const code = 'function test() {\n    const x = 1;\n    console.log(x);\n}';
			const tabWidth = calculateTabWidth(code);
			expect(tabWidth).toBe(4);
		});

		it('handles code with different indentation levels', () => {
			const code = 'function test() {\n  const x = 1;\n    console.log(x);\n}';
			const tabWidth = calculateTabWidth(code);
			// Should return the first non-zero indentation found (2 spaces)
			expect(tabWidth).toBe(2);
		});
	});

	describe('changeTabWidth', () => {
		it('keeps non-indented lines unchanged', () => {
			const code = 'const x = 1;\nconst y = 2;\nconsole.log(x + y);';
			const result = changeTabWidth(code, 2);
			expect(result).toBe(code);
		});

		it('adjusts indentation to specified width', () => {
			const code = 'function test() {\n  const x = 1;\n  console.log(x);\n}';
			const result = changeTabWidth(code, 4);

			// Original code has 2-space indents, should be converted to 4-space indents
			expect(result).toBe('function test() {\n    const x = 1;\n    console.log(x);\n}');
		});

		it('handles multiple indentation levels', () => {
			const code = 'function test() {\n  if (true) {\n    console.log("nested");\n  }\n}';
			const result = changeTabWidth(code, 4);

			// First level is 2 spaces, second level is 4 spaces
			// Should become 4 spaces for first level, 8 spaces for second level
			expect(result).toBe(
				'function test() {\n    if (true) {\n        console.log("nested");\n    }\n}'
			);
		});

		it('uses default tab width if not specified', () => {
			const code = 'function test() {\n  const x = 1;\n}';
			const result = changeTabWidth(code); // Default is 4
			expect(result).toBe('function test() {\n    const x = 1;\n}');
		});
	});

	describe('closeAllTabWidths', () => {
		it('closes all tab width controls in chat history', () => {
			closeAllTabWidths();

			// Should have been called once
			expect(chatHistory.update).toHaveBeenCalledTimes(1);

			// All price_open flags should be set to false
			const result = mockUpdateFn.mock.calls[0][0];
			expect(result[1].price_open).toBe(false);

			// All tabWidthOpen flags in code components should be set to false
			expect(result[1].components[1].tabWidthOpen).toBe(false);
		});

		it('handles chat history with no code components', () => {
			// Setup chat history update with no code components
			(chatHistory.update as any).mockImplementation((callback: Updater<ChatComponent[]>) => {
				const fakeHistory: ChatComponent[] = [
					{
						message_id: 1,
						by: 'claude37Sonnet',
						text: 'Text only message',
						input_cost: 0.001,
						output_cost: 0.002,
						price_open: true,
						loading: false,
						copied: false,
						components: [
							{
								type: 'text',
								content: 'Text only content'
							}
						]
					}
				];

				const result = callback(fakeHistory);
				mockUpdateFn(result);
				return result;
			});

			closeAllTabWidths();

			// Should set price_open to false even without code components
			const result = mockUpdateFn.mock.calls[0][0];
			expect(result[0].price_open).toBe(false);
		});
	});
});
