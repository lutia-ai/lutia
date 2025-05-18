/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

// Simplified mocks
vi.mock('$lib/stores', () => ({
	darkMode: {
		subscribe: (cb: (value: boolean) => void) => {
			cb(false);
			return () => {};
		}
	}
}));

vi.mock('$lib/components/chat-history/utils/copying', () => ({
	copyToClipboard: vi.fn(),
	updateChatHistoryToCopiedState: vi.fn()
}));

vi.mock('$lib/components/chat-history/utils/codeContainerUtils', () => ({
	changeTabWidth: vi.fn((code) => code)
}));

// Import after mocks
import { describe, it, expect, beforeEach } from 'vitest';
import CodeContainer from '$lib/components/chat-history/llm-chat/CodeContainer.svelte';
import {
	copyToClipboard,
	updateChatHistoryToCopiedState
} from '$lib/components/chat-history/utils/copying';
import { changeTabWidth } from '$lib/components/chat-history/utils/codeContainerUtils';

describe('CodeContainer Component', () => {
	const mockCode = 'function test() {\n  console.log("hello world");\n}';
	const mockLanguage = 'javascript';

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock clipboard API
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined)
			}
		});
	});

	it('should show tab width options when tab width is provided', async () => {
		const { container } = render(CodeContainer, {
			props: {
				code: mockCode,
				language: mockLanguage,
				tabWidth: 4
			}
		});

		// Use testing-library queries rather than manual DOM selection
		expect(container.textContent).toContain('Tab width: 4');
	});

	it('should display the correct language in header', () => {
		const { container } = render(CodeContainer, {
			props: {
				code: mockCode,
				language: mockLanguage
			}
		});

		expect(container.textContent).toContain(mockLanguage);
	});

	it('should call copyToClipboard when copy button is clicked', async () => {
		const { container } = render(CodeContainer, {
			props: {
				code: mockCode,
				language: mockLanguage
			}
		});

		// Find and click the copy button
		const copyButton = container.querySelector('.copy-code-container');
		expect(copyButton).not.toBeNull();

		if (copyButton) {
			await fireEvent.click(copyButton);
			expect(copyToClipboard).toHaveBeenCalledWith(mockCode);
		}
	});

	it('should call updateChatHistoryToCopiedState when copy button is clicked with chat indices', async () => {
		const { container } = render(CodeContainer, {
			props: {
				code: mockCode,
				language: mockLanguage,
				chatIndex: 1,
				componentIndex: 2
			}
		});

		const copyButton = container.querySelector('.copy-code-container');
		expect(copyButton).not.toBeNull();

		if (copyButton) {
			await fireEvent.click(copyButton);
			expect(updateChatHistoryToCopiedState).toHaveBeenCalledWith(1, 2);
		}
	});

	it('should show copied text after clicking copy button', async () => {
		const { container } = render(CodeContainer, {
			props: {
				code: mockCode,
				language: mockLanguage
			}
		});

		const copyButton = container.querySelector('.copy-code-container');
		expect(copyButton).not.toBeNull();

		if (copyButton) {
			await fireEvent.click(copyButton);
			expect(container.textContent).toContain('copied');
		}
	});

	it('should change tab width when tab width option is selected', async () => {
		const { container } = render(CodeContainer, {
			props: {
				code: mockCode,
				language: mockLanguage,
				tabWidth: 4
			}
		});

		// Open tab width dropdown
		const tabWidthContainer = container.querySelector('.tab-width-container');
		expect(tabWidthContainer).not.toBeNull();

		if (tabWidthContainer) {
			await fireEvent.click(tabWidthContainer);

			// Find and click the 2-space tab width option
			const tabWidthOptions = container.querySelectorAll('.tab-width-open-container div');
			expect(tabWidthOptions.length).toBeGreaterThan(0);

			await fireEvent.click(tabWidthOptions[0]); // Click on the 2-space option

			expect(changeTabWidth).toHaveBeenCalledWith(mockCode, 2);
		}
	});
});
