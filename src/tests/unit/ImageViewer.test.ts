/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import ImageViewer from '$lib/components/ImageViewer.svelte';
import { bodyScrollLocked } from '$lib/stores';

// Add TypeScript types for global objects
declare global {
	var gtag: ((...args: any[]) => void) | undefined;
	var dataLayer: any[];
}

// Mock the bodyScrollLocked store
vi.mock('$lib/stores', async () => {
	const actual = await vi.importActual('$lib/stores');
	return {
		...actual,
		bodyScrollLocked: {
			subscribe: vi.fn(),
			set: vi.fn()
		}
	};
});

describe('ImageViewer Component', () => {
	// Sample props
	const basicProps = {
		src: 'https://example.com/image.jpg',
		alt: 'Test Image',
		show: true
	};

	// Create a target DOM element for testing-library/svelte
	let target: HTMLElement;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Reset body scroll locked store
		bodyScrollLocked.set(false);

		// Create a mock for document.createElement
		document.createElement = vi.fn().mockImplementation((tag) => {
			if (tag === 'a') {
				return {
					href: '',
					download: '',
					click: vi.fn()
				};
			}
			return {};
		});

		// Mock document.body.appendChild and removeChild
		document.body.appendChild = vi.fn();
		document.body.removeChild = vi.fn();

		// Create target element for testing-library
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (target && target.parentNode) {
			target.parentNode.removeChild(target);
		}
	});

	// Basic tests using todo format
	it.todo('should render when show is true');
	it.todo('should not render when show is false');
	it.todo('should lock body scrolling when shown');
	it.todo('should unlock body scrolling when hidden');
	it.todo('should close when clicking the overlay');
	it.todo('should not close when clicking the image content');
	it.todo('should close when clicking the close button');
	it.todo('should close when pressing Escape key');
	it.todo('should download the image when clicking the download button');
	it.todo('should use a default alt text when none is provided');
	it.todo('should restore body scrolling on component destruction');
});
