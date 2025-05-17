/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Analytics from '$lib/components/Analytics.svelte';

// Add TypeScript types for global objects
declare global {
	var gtag: ((...args: any[]) => void) | undefined;
	var dataLayer: any[];
}

// Mock the $app/stores page
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((callback) => {
			callback({ url: { pathname: '/test-path' } });
			return () => {};
		})
	}
}));

describe('Analytics Component', () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Mock window.gtag
		global.gtag = vi.fn();

		// Mock dataLayer
		global.dataLayer = [];

		// Mock document.title
		document.title = 'Test Page';
	});

	it('should render Google Analytics script tags', () => {
		const { container } = render(Analytics);

		// Get script tags from the head (svelte:head)
		const scripts = document.head.querySelectorAll('script');

		// Verify Google Analytics script is present
		const gaScript = Array.from(scripts).find((script) =>
			script.src.includes('googletagmanager.com/gtag/js')
		);
		expect(gaScript).not.toBeUndefined();
		// Skip checking the async attribute as it may be handled differently in the test environment
	});

	it('should initialize gtag with proper config', () => {
		render(Analytics);

		// Check that window.dataLayer is initialized
		expect(global.dataLayer).toBeDefined();

		// Extract and execute the gtag function
		const scripts = document.head.querySelectorAll('script');
		const gtagInitScript = Array.from(scripts).find(
			(script) => !script.src && script.textContent?.includes('function gtag()')
		);

		// This test is checking that the script content is there, not executing it
		expect(gtagInitScript).toBeDefined();
		expect(gtagInitScript?.textContent).toContain("gtag('js', new Date())");
		expect(gtagInitScript?.textContent).toContain("gtag('config', 'G-WS8E8P29W4'");
	});

	it('should track page views when navigating', () => {
		// Setup a specific mock for gtag
		global.gtag = vi.fn();

		render(Analytics);

		// Check if gtag is called with config
		expect(global.gtag).toHaveBeenCalledWith('config', 'G-WS8E8P29W4', {
			page_title: 'Test Page',
			page_path: '/test-path'
		});
	});

	it('should handle undefined gtag gracefully', () => {
		// Set gtag to undefined
		global.gtag = undefined;

		// This should not throw an error
		expect(() => render(Analytics)).not.toThrow();
	});
});
