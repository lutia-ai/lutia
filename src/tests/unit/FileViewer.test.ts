/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import FileViewer from '$lib/components/FileViewer.svelte';
import { bodyScrollLocked, darkMode } from '$lib/stores';

// Mock svelte-highlight to prevent errors
vi.mock('svelte-highlight', () => ({
	HighlightAuto: vi.fn(),
	LineNumbers: vi.fn()
}));

// Mock the darkMode store
vi.mock('$lib/stores', async () => {
	const actual = await vi.importActual('$lib/stores');
	return {
		...actual,
		darkMode: { subscribe: vi.fn() }
	};
});

describe('FileViewer Component', () => {
	// Sample props
	const basicProps = {
		content: 'This is a sample text file content.',
		filename: 'sample.txt',
		show: true
	};

	const codeProps = {
		content: 'function example() {\n  return true;\n}',
		filename: 'example.js',
		show: true
	};

	// Create a target DOM element for testing-library/svelte
	let target: HTMLElement;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Mock createObjectURL and revokeObjectURL
		global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mockurl');
		global.URL.revokeObjectURL = vi.fn();

		// Set darkMode value for testing
		darkMode.subscribe = vi.fn().mockImplementation((callback) => {
			callback(false);
			return () => {};
		});

		// Reset body scroll locked store
		bodyScrollLocked.set(false);

		// Create a mock for document.createElement
		document.createElement = vi.fn().mockImplementation((tag) => {
			if (tag === 'a') {
				return {
					href: '',
					download: '',
					click: vi.fn(),
					setAttribute: vi.fn()
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

	it.todo('should render when show is true');

	it.todo('should not render when show is false');

	it.todo('should display text content correctly');

	it.todo('should detect language from filename extension');

	it.todo('should lock body scrolling when shown');

	it.todo('should unlock body scrolling when hidden');

	it.todo('should close when clicking the close button');

	it.todo('should close when pressing Escape key');

	it.todo('should calculate file size and line count correctly');

	it.todo('should identify language based on file extension');
});
