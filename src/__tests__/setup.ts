/**
 * Setup file for Vitest
 * This is automatically loaded by Vitest because it's named `setup.ts`
 */

import { vi } from 'vitest';
import { tick } from 'svelte';

// Mock globals that might not be available in JSDOM
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

global.MutationObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

global.matchMedia = vi.fn().mockImplementation((query) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: vi.fn(),
	removeListener: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn()
}));

// Mock Svelte's animation functions
vi.mock('svelte/transition', () => ({
	fade: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn()
	})),
	slide: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn()
	})),
	fly: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn()
	})),
	scale: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn()
	}))
}));

vi.mock('svelte/animate', () => ({
	flip: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn()
	}))
}));

// Add any other global mocks here
