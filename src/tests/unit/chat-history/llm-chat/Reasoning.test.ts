/**
 * @vitest-environment jsdom
 */

// Mock the utility functions first
vi.mock('$lib/components/chat-history/utils/chatHistory', () => ({
	processLinks: vi.fn().mockImplementation((html) => html),
	sanitizeLLmContent: vi.fn().mockImplementation((content) => content)
}));

vi.mock('$lib/utils/marked-extensions.ts', () => ({
	default: vi.fn().mockImplementation((text) => text)
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Reasoning from '$lib/components/chat-history/llm-chat/Reasoning.svelte';

// Get references to mocked functions after imports
const sanitizeLLmContentMock = vi.mocked(
	(await import('$lib/components/chat-history/utils/chatHistory')).sanitizeLLmContent
);
const processLinksMock = vi.mocked(
	(await import('$lib/components/chat-history/utils/chatHistory')).processLinks
);
const markedMock = vi.mocked((await import('$lib/utils/marked-extensions.ts')).default);

describe('Reasoning Component', () => {
	// Sample reasoning text
	const basicReasoning = "This is a reasoning text that explains the AI's thought process.";

	beforeEach(() => {
		vi.clearAllMocks();
		sanitizeLLmContentMock.mockClear();
		processLinksMock.mockClear();
		markedMock.mockClear();
	});

	it('renders reasoning content correctly', () => {
		const { container } = render(Reasoning, {
			props: {
				reasoning: basicReasoning
			}
		});

		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer).not.toBeNull();

		// Check that the header is present
		const header = reasoningContainer?.querySelector('.reasoning-header');
		expect(header).not.toBeNull();

		// Check that the title is present
		const title = header?.querySelector('.reasoning-title');
		expect(title).not.toBeNull();
		expect(title?.textContent).toBe('Reasoning');

		// Check that the content is included
		const content = reasoningContainer?.querySelector('.reasoning-content');
		expect(content).not.toBeNull();
		expect(content?.textContent).toContain(basicReasoning);
	});

	it('applies proper styling to reasoning container', () => {
		const { container } = render(Reasoning, {
			props: {
				reasoning: basicReasoning
			}
		});

		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer).not.toBeNull();

		// Check computed styles match the expected values from the component
		const computedStyle = window.getComputedStyle(reasoningContainer!);
		expect(computedStyle.display).toBe('block'); // In JSDOM, flex becomes block
	});

	it('processes reasoning content through utility functions', () => {
		render(Reasoning, {
			props: {
				reasoning: basicReasoning
			}
		});

		// Verify the mocked utilities were called
		expect(sanitizeLLmContentMock).toHaveBeenCalledWith(basicReasoning);
		expect(markedMock).toHaveBeenCalled();
		expect(processLinksMock).toHaveBeenCalled();
	});

	it('handles empty reasoning content gracefully', () => {
		const { container } = render(Reasoning, {
			props: {
				reasoning: ''
			}
		});

		// Should still render the container but with no content
		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer).not.toBeNull();

		// Should have the header with title
		const title = reasoningContainer?.querySelector('.reasoning-title');
		expect(title?.textContent).toBe('Reasoning');

		// Should NOT have content area when no content
		const content = reasoningContainer?.querySelector('.reasoning-content');
		expect(content).toBeNull();
	});

	it('has a title with Reasoning label', () => {
		const { container } = render(Reasoning, {
			props: {
				reasoning: basicReasoning
			}
		});

		const title = container.querySelector('.reasoning-title');
		expect(title).not.toBeNull();
		expect(title?.textContent).toBe('Reasoning');
	});

	it('shows loading state with shimmer effect', () => {
		const { container } = render(Reasoning, {
			props: {
				reasoning: 'Some reasoning content',
				isLoading: true
			}
		});

		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer).not.toBeNull();

		const title = container.querySelector('.reasoning-title');
		expect(title).not.toBeNull();
		expect(title?.classList.contains('shimmer')).toBe(true);
		expect(title?.textContent).toBe('Reasoning');

		// Content should be shown during loading for streaming effect
		const content = container.querySelector('.reasoning-content');
		expect(content).not.toBeNull();
	});

	it('shows expand arrow for long content', () => {
		const longReasoning = 'A'.repeat(350); // Longer than CONDENSED_LENGTH (330)

		const { container } = render(Reasoning, {
			props: {
				reasoning: longReasoning,
				isLoading: false
			}
		});

		const expandArrow = container.querySelector('.expand-arrow');
		expect(expandArrow).not.toBeNull();

		// Should be expandable
		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer?.classList.contains('expandable')).toBe(true);
	});

	it('does not show expand arrow for short content', () => {
		const shortReasoning = 'Short reasoning text';

		const { container } = render(Reasoning, {
			props: {
				reasoning: shortReasoning,
				isLoading: false
			}
		});

		const expandArrow = container.querySelector('.expand-arrow');
		expect(expandArrow).toBeNull();

		// Should not be expandable
		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer?.classList.contains('expandable')).toBe(false);
	});

	it('toggles expand state when header is clicked for long content', async () => {
		const longReasoning = 'A'.repeat(350); // Longer than CONDENSED_LENGTH (330)

		const { container } = render(Reasoning, {
			props: {
				reasoning: longReasoning,
				isLoading: false
			}
		});

		const reasoningContainer = container.querySelector('.reasoning-container');
		const expandArrow = container.querySelector('.expand-arrow');

		// Initially not expanded
		expect(expandArrow).not.toBeNull();
		expect(expandArrow?.classList.contains('expanded')).toBe(false);

		// Click to expand
		await fireEvent.click(reasoningContainer!);
		expect(expandArrow?.classList.contains('expanded')).toBe(true);

		// Click to collapse
		await fireEvent.click(reasoningContainer!);
		expect(expandArrow?.classList.contains('expanded')).toBe(false);
	});

	it('does not show expand arrow during streaming', () => {
		const streamingReasoning = 'A'.repeat(350); // Longer than CONDENSED_LENGTH (330)

		const { container } = render(Reasoning, {
			props: {
				reasoning: streamingReasoning,
				isLoading: true
			}
		});

		// During loading, no expand arrow should be shown
		const expandArrow = container.querySelector('.expand-arrow');
		expect(expandArrow).toBeNull();

		// Should not be expandable during loading (no manual expansion while streaming)
		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer?.classList.contains('expandable')).toBe(false);

		// Content should be shown and fully expanded during streaming
		const content = container.querySelector('.reasoning-content');
		expect(content).not.toBeNull();
		expect(content?.classList.contains('expanded')).toBe(true);
	});

	it('auto-collapses when loading finishes for long content', async () => {
		const longReasoning = 'A'.repeat(350); // Longer than CONDENSED_LENGTH (330)

		const { component, container } = render(Reasoning, {
			props: {
				reasoning: longReasoning,
				isLoading: true
			}
		});

		// During loading, content should be expanded
		let content = container.querySelector('.reasoning-content');
		expect(content).not.toBeNull();
		expect(content?.classList.contains('expanded')).toBe(true);

		// No expand arrow during loading
		let expandArrow = container.querySelector('.expand-arrow');
		expect(expandArrow).toBeNull();

		// Simulate loading finishing
		await component.$set({ isLoading: false });

		// After loading finishes, should auto-collapse
		content = container.querySelector('.reasoning-content');
		expect(content).not.toBeNull();
		expect(content?.classList.contains('condensed')).toBe(true);

		// Should now show expand arrow
		expandArrow = container.querySelector('.expand-arrow');
		expect(expandArrow).not.toBeNull();

		// Should be expandable
		const reasoningContainer = container.querySelector('.reasoning-container');
		expect(reasoningContainer?.classList.contains('expandable')).toBe(true);
	});
});
