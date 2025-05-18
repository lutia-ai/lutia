// Import jest-dom matchers for enhanced DOM assertions
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { readable } from 'svelte/store';
import type { Navigation, Page } from '@sveltejs/kit';

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
		css: vi.fn(),
		tick: vi.fn()
	})),
	slide: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn(),
		tick: vi.fn()
	})),
	fly: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn(),
		tick: vi.fn()
	})),
	scale: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn(),
		tick: vi.fn()
	}))
}));

vi.mock('svelte/animate', () => ({
	flip: vi.fn().mockImplementation(() => ({
		duration: 0,
		css: vi.fn()
	}))
}));

// Mock the $app/environment module
vi.mock('$app/environment', () => ({
	browser: false,
	dev: true,
	building: false,
	version: 'any'
}));

// Mock the $app/navigation module
vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	beforeNavigate: vi.fn(),
	disableScrollHandling: vi.fn(),
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn()
}));

// Mock the $app/stores module with readable stores
vi.mock('$app/stores', () => {
	const getStores = () => {
		const navigating = readable<Navigation | null>(null);
		const page = readable<Page>({
			url: new URL('http://localhost'),
			params: {},
			route: {
				id: null
			},
			status: 200,
			error: null,
			data: {},
			form: undefined,
			state: {}
		});
		const updated = {
			subscribe: readable(false).subscribe,
			check: async () => false
		};

		return { navigating, page, updated };
	};

	const page = {
		subscribe(fn: Function) {
			return getStores().page.subscribe(fn as any);
		}
	};

	const navigating = {
		subscribe(fn: Function) {
			return getStores().navigating.subscribe(fn as any);
		}
	};

	const updated = {
		subscribe(fn: Function) {
			return getStores().updated.subscribe(fn as any);
		},
		check: async () => false
	};

	return {
		getStores,
		navigating,
		page,
		updated
	};
});
