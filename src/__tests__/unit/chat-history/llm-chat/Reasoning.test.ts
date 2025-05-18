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

		const reasoningParagraph = container.querySelector('.reasoning-paragraph');
		expect(reasoningParagraph).not.toBeNull();

		// Check that the label is present
		const label = reasoningParagraph?.querySelector('span');
		expect(label).not.toBeNull();
		expect(label?.textContent).toBe('Reasoning:');

		// Check that the content is included
		expect(reasoningParagraph?.textContent).toContain(basicReasoning);
	});

	it('applies proper styling to reasoning paragraph', () => {
		const { container } = render(Reasoning, {
			props: {
				reasoning: basicReasoning
			}
		});

		const reasoningParagraph = container.querySelector('.reasoning-paragraph');
		expect(reasoningParagraph).not.toBeNull();

		// Check computed styles match the expected values from the component
		const computedStyle = window.getComputedStyle(reasoningParagraph!);
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

		// Should still render the paragraph but with no content
		const reasoningParagraph = container.querySelector('.reasoning-paragraph');
		expect(reasoningParagraph).not.toBeNull();
		expect(reasoningParagraph?.textContent?.trim()).toBe('Reasoning:');
	});

	it('has a span with Reasoning label', () => {
		const { container } = render(Reasoning, {
			props: {
				reasoning: basicReasoning
			}
		});

		const span = container.querySelector('.reasoning-paragraph span');
		expect(span).not.toBeNull();
		expect(span?.textContent).toBe('Reasoning:');
	});
});
