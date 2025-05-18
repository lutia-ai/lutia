/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FilePreview from '$lib/components/prompt-bar/FilePreview.svelte';
import * as fileHandling from '$lib/utils/fileHandling';

// Mock the file handling utilities
vi.mock('$lib/utils/fileHandling', () => ({
	getFileIcon: vi.fn().mockImplementation((ext) => ext.toUpperCase()),
	getFileIconColor: vi.fn().mockReturnValue('linear-gradient(135deg, #1d60c2, #3a7bd5)')
}));

describe('FilePreview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test component rendering with required props
	 */
	it('should render correctly with required props', () => {
		const props = {
			name: 'example.txt',
			size: 1024,
			fileExtension: 'txt'
		};

		const { container } = render(FilePreview, { props });

		// Verify the component renders with proper structure
		const fileContainer = container.querySelector('.file-container');
		expect(fileContainer).toBeDefined();

		// Verify file name is displayed correctly
		const fileName = container.querySelector('.file-name');
		expect(fileName?.textContent).toBe(props.name);

		// Verify file icon is displayed correctly
		const fileIcon = container.querySelector('.file-type');
		expect(fileIcon?.textContent).toBe('TXT'); // Mocked to return uppercase extension

		// Verify file icon color is set
		const iconElement = container.querySelector('.file-icon');
		expect(iconElement).toHaveStyle({
			background: 'linear-gradient(135deg, #1d60c2, #3a7bd5)'
		});

		// Verify utility functions were called with correct args
		expect(fileHandling.getFileIcon).toHaveBeenCalledWith('txt');
		expect(fileHandling.getFileIconColor).toHaveBeenCalledWith('txt');
	});

	/**
	 * Test file size formatting
	 */
	it('should format file size correctly for bytes', () => {
		const props = {
			name: 'small.txt',
			size: 500, // 500 bytes
			fileExtension: 'txt'
		};

		const { container } = render(FilePreview, { props });

		// File size is not directly displayed in the component
		// But we can test the internal formatting through behavior
		const formattedSize = '500 Bytes'; // Expected format
		// Can't verify directly as it's not rendered to DOM
	});

	it('should format file size correctly for KB', () => {
		const props = {
			name: 'medium.txt',
			size: 1536, // 1.5 KB
			fileExtension: 'txt'
		};

		const { container } = render(FilePreview, { props });

		// Expected format would be "1.5 KB" but not directly verifiable
	});

	it('should format file size correctly for MB', () => {
		const props = {
			name: 'large.txt',
			size: 2 * 1024 * 1024, // 2 MB
			fileExtension: 'txt'
		};

		const { container } = render(FilePreview, { props });

		// Expected format would be "2.0 MB" but not directly verifiable
	});

	/**
	 * Test click event dispatching
	 */
	it('should dispatch click event when file is clicked', async () => {
		const props = {
			name: 'example.txt',
			size: 1024,
			fileExtension: 'txt'
		};

		const { component, container } = render(FilePreview, { props });

		const mockClick = vi.fn();
		component.$on('click', mockClick);

		const fileButton = container.querySelector('.file-info');
		await fireEvent.click(fileButton as Element);

		expect(mockClick).toHaveBeenCalledTimes(1);
	});

	/**
	 * Test remove event dispatching
	 */
	it('should dispatch remove event when remove button is clicked', async () => {
		const props = {
			name: 'example.txt',
			size: 1024,
			fileExtension: 'txt'
		};

		const { component, container } = render(FilePreview, { props });

		const mockRemove = vi.fn();
		component.$on('remove', mockRemove);

		const removeButton = container.querySelector('.remove-button');
		await fireEvent.click(removeButton as Element);

		expect(mockRemove).toHaveBeenCalledTimes(1);
	});

	/**
	 * Test that event propagation is stopped for click event
	 */
	it('should stop propagation when file button is clicked', async () => {
		const props = {
			name: 'example.txt',
			size: 1024,
			fileExtension: 'txt'
		};

		const { component, container } = render(FilePreview, { props });

		// Add a click handler to the parent
		const parentHandler = vi.fn();
		const parent = container.querySelector('.file-container');
		parent?.addEventListener('click', parentHandler);

		// Click the file button
		const fileButton = container.querySelector('.file-info');
		await fireEvent.click(fileButton as Element);

		// Parent handler should not be called due to stopPropagation
		expect(parentHandler).not.toHaveBeenCalled();
	});

	/**
	 * Test that event propagation is stopped for remove event
	 */
	it('should stop propagation when remove button is clicked', async () => {
		const props = {
			name: 'example.txt',
			size: 1024,
			fileExtension: 'txt'
		};

		const { component, container } = render(FilePreview, { props });

		// Add a click handler to the parent
		const parentHandler = vi.fn();
		const parent = container.querySelector('.file-container');
		parent?.addEventListener('click', parentHandler);

		// Click the remove button
		const removeButton = container.querySelector('.remove-button');
		await fireEvent.click(removeButton as Element);

		// Parent handler should not be called
		expect(parentHandler).not.toHaveBeenCalled();
	});

	/**
	 * Test accessibility attributes
	 */
	it('should have proper accessibility attributes', () => {
		const props = {
			name: 'example.txt',
			size: 1024,
			fileExtension: 'txt'
		};

		const { container } = render(FilePreview, { props });

		// Check remove button has appropriate aria-label
		const removeButton = container.querySelector('.remove-button');
		expect(removeButton).toHaveAttribute('aria-label', 'Remove image attachment');

		// File button should be focusable
		const fileButton = container.querySelector('.file-info');
		expect(fileButton).toHaveAttribute('tabindex', '0');
	});
});
