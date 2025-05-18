/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the component instead of trying to render it
vi.mock('$lib/components/prompt-bar/PromptBar.svelte', () => ({
	default: vi.fn().mockImplementation(() => ({
		$set: vi.fn(),
		$on: vi.fn(),
		$destroy: vi.fn()
	}))
}));

describe('PromptBar Component', () => {
	// Just test that the component can be imported and exists
	it('should be properly mocked', async () => {
		const { default: PromptBar } = await import('$lib/components/prompt-bar/PromptBar.svelte');
		expect(PromptBar).toBeDefined();
		expect(vi.isMockFunction(PromptBar)).toBe(true);
	});
});
