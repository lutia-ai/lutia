/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PromptControls from '$lib/components/prompt-bar/PromptControls.svelte';
import { chosenModel, isContextWindowAuto, reasoningOn, webSearchOn } from '$lib/stores';
import { ApiModel } from '@prisma/client';
import type { Model } from '$lib/types/types';

// Mock the stores
vi.mock('$lib/stores', () => ({
	chosenModel: {
		subscribe: vi.fn(),
		set: vi.fn()
	},
	isContextWindowAuto: {
		subscribe: vi.fn(),
		set: vi.fn()
	},
	reasoningOn: {
		subscribe: vi.fn(),
		set: vi.fn()
	},
	webSearchOn: {
		subscribe: vi.fn(),
		set: vi.fn()
	}
}));

// Mock model for testing
const mockModel: Model = {
	name: ApiModel.GPT_4o,
	param: 'gpt-4o',
	legacy: false,
	input_price: 2.5,
	output_price: 10,
	context_window: 128000,
	handlesImages: true,
	maxImages: 5,
	generatesImages: false,
	reasons: false,
	extendedThinking: false,
	description: 'Versatile, high-intelligence flagship model',
	max_input_per_request: 10000,
	web_search: false
};

describe('PromptControls', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock the chosenModel store subscribe method
		const mockChosenModelSubscribe = vi.fn((callback: (value: any) => void) => {
			callback({ reasons: true }); // Default value
			return () => {}; // Return unsubscribe function
		});

		// Mock the isContextWindowAuto store subscribe method
		const mockIsContextWindowAutoSubscribe = vi.fn((callback: (value: boolean) => void) => {
			callback(true); // Default value
			return () => {}; // Return unsubscribe function
		});

		// Mock the reasoningOn store subscribe method
		const mockReasoningOnSubscribe = vi.fn((callback: (value: boolean) => void) => {
			callback(true); // Default value for testing selected state
			return () => {}; // Return unsubscribe function
		});

		// Mock the webSearchOn store subscribe method
		const mockWebSearchOnSubscribe = vi.fn((callback: (value: boolean) => void) => {
			callback(false); // Default value
			return () => {}; // Return unsubscribe function
		});

		(chosenModel.subscribe as any).mockImplementation(mockChosenModelSubscribe);
		(isContextWindowAuto.subscribe as any).mockImplementation(mockIsContextWindowAutoSubscribe);
		(reasoningOn.subscribe as any).mockImplementation(mockReasoningOnSubscribe);
		(webSearchOn.subscribe as any).mockImplementation(mockWebSearchOnSubscribe);
	});

	/**
	 * Test component rendering with default props
	 */
	it('should render correctly with default props', () => {
		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Verify the plus button is rendered
		const plusButton = container.querySelector('.plus-icon');
		expect(plusButton).toBeDefined();

		// Verify the submit button is rendered
		const submitButton = container.querySelector('.submit-container');
		expect(submitButton).toBeDefined();

		// Verify file input exists and has proper attributes
		const fileInput = container.querySelector('input[type="file"]');
		expect(fileInput).toBeDefined();
		expect(fileInput).toHaveAttribute('accept');
		expect(fileInput).toHaveAttribute('multiple');
	});

	/**
	 * Test reasoning button
	 */
	it('should render reasoning button when modelSupportsReasoning is true', () => {
		const reasoningModel = { ...mockModel, reasons: true };
		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Verify the reasoning button is rendered
		const reasoningButton = container.querySelectorAll('.reason-button')[0];
		expect(reasoningButton).toBeDefined();
		expect(reasoningButton.textContent).toContain('Reason');
	});

	it('should render reasoning button when modelExtendedThinking is true', () => {
		const extendedThinkingModel = { ...mockModel, extendedThinking: true };
		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Verify the reasoning button is rendered
		const reasoningButton = container.querySelectorAll('.reason-button')[0];
		expect(reasoningButton).toBeDefined();
		expect(reasoningButton.textContent).toContain('Reason');
	});

	it('should not render reasoning button when neither supports reasoning', () => {
		// Mock the chosenModel store to return a model that doesn't support reasoning
		(chosenModel.subscribe as any).mockImplementation((callback: (value: any) => void) => {
			callback({ reasons: false, extendedThinking: false });
			return () => {};
		});

		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Verify there's only the context window button
		const reasoningButtons = container.querySelectorAll('.reason-button');
		expect(reasoningButtons.length).toBe(1);
		expect(reasoningButtons[0].textContent).toContain('Custom');
	});

	it('should apply selected class when reasoningOn is true', () => {
		const reasoningModel = { ...mockModel, reasons: true };
		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Verify the reasoning button has the selected class
		const reasoningButton = container.querySelectorAll('.reason-button')[0];
		expect(reasoningButton.classList.contains('selected')).toBe(true);
	});

	/**
	 * Test context window button
	 */
	it('should render context window button', () => {
		// Mock the chosenModel store to return a model that doesn't support reasoning
		(chosenModel.subscribe as any).mockImplementation((callback: (value: any) => void) => {
			callback({ reasons: false, extendedThinking: false });
			return () => {};
		});

		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Verify the context window button is rendered
		const contextWindowButton = container.querySelectorAll('.reason-button')[0];
		expect(contextWindowButton).toBeDefined();
		expect(contextWindowButton.textContent).toContain('Custom');
	});

	it('should apply selected class when isContextWindowAuto is false', () => {
		// Mock isContextWindowAuto to return false
		(isContextWindowAuto.subscribe as any).mockImplementation(
			(callback: (value: boolean) => void) => {
				callback(false); // Set to false
				return () => {};
			}
		);

		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Verify the context window button has the selected class
		const contextWindowButton = container.querySelectorAll('.reason-button')[0];
		expect(contextWindowButton.classList.contains('selected')).toBe(true);
	});

	/**
	 * Test submit button
	 */
	it('should disable submit button when placeholderVisible is true', () => {
		const { container } = render(PromptControls, {
			props: {
				placeholderVisible: true
			}
		});

		// Verify the submit button is disabled
		const submitButton = container.querySelector('.submit-container');
		expect(submitButton).toHaveAttribute('disabled');
	});

	it('should enable submit button when placeholderVisible is false', () => {
		const { container } = render(PromptControls, {
			props: {
				placeholderVisible: false
			}
		});

		// Verify the submit button is not disabled
		const submitButton = container.querySelector('.submit-container');
		expect(submitButton).not.toHaveAttribute('disabled');
	});

	/**
	 * Test event dispatching
	 */
	it('should dispatch submit event when submit button is clicked', async () => {
		const { component, container } = render(PromptControls, {
			props: {
				placeholderVisible: false
			}
		});

		const mockSubmit = vi.fn();
		component.$on('submit', mockSubmit);

		const submitButton = container.querySelector('.submit-container');
		await fireEvent.click(submitButton as Element);

		expect(mockSubmit).toHaveBeenCalledTimes(1);
	});

	it('should dispatch toggleReasoning event when reasoning button is clicked', async () => {
		const reasoningModel = { ...mockModel, reasons: true };
		const { container } = render(PromptControls, {
			props: {
			}
		});

		const reasoningButton = container.querySelectorAll('.reason-button')[0];
		await fireEvent.click(reasoningButton as Element);

		// Verify reasoningOn.set was called with the opposite of the current value
		expect(reasoningOn.set).toHaveBeenCalledWith(false); // Should toggle from true to false
	});

	it('should toggle context window auto setting when custom button is clicked', async () => {
		// Mock the chosenModel store to return a model that doesn't support reasoning
		(chosenModel.subscribe as any).mockImplementation((callback: (value: any) => void) => {
			callback({ reasons: false, extendedThinking: false });
			return () => {};
		});

		// Mock isContextWindowAuto to return true initially
		(isContextWindowAuto.subscribe as any).mockImplementation((callback: (value: boolean) => void) => {
			callback(true);
			return () => {};
		});

		const { container } = render(PromptControls, {
			props: {
			}
		});

		const contextWindowButton = container.querySelectorAll('.reason-button')[0];
		await fireEvent.click(contextWindowButton as Element);

		// Verify isContextWindowAuto.set was called with the opposite of the current value
		expect(isContextWindowAuto.set).toHaveBeenCalledWith(false);
	});

	it('should open file dialog when plus button is clicked', async () => {
		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Mock the file input click method
		const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
		fileInput.click = vi.fn();

		const plusButton = container.querySelector('.plus-icon');
		await fireEvent.click(plusButton as Element);

		expect(fileInput.click).toHaveBeenCalledTimes(1);
	});

	it('should dispatch fileChange event when files are selected', async () => {
		const { component, container } = render(PromptControls, {
			props: {
			}
		});

		const mockFileChange = vi.fn();
		component.$on('fileChange', mockFileChange);

		const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

		// Mock file list
		const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
		const mockFileList = {
			0: mockFile,
			length: 1,
			item: (index: number) => (index === 0 ? mockFile : null),
			[Symbol.iterator]: function* (this: any) {
				for (let i = 0; i < this.length; i++) {
					yield this.item(i);
				}
			}
		} as unknown as FileList;

		// Simulate file selection
		Object.defineProperty(fileInput, 'files', {
			value: mockFileList,
			writable: false
		});

		await fireEvent.change(fileInput);

		expect(mockFileChange).toHaveBeenCalledTimes(1);
		expect(mockFileChange).toHaveBeenCalledWith(
			expect.objectContaining({
				detail: expect.objectContaining({
					target: expect.objectContaining({
						files: mockFileList
					})
				})
			})
		);
	});

	it('should open file dialog on Enter key on plus button', async () => {
		const { container } = render(PromptControls, {
			props: {
			}
		});

		// Mock the file input click method
		const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
		fileInput.click = vi.fn();

		const plusButton = container.querySelector('.plus-icon');
		await fireEvent.keyDown(plusButton as Element, { key: 'Enter' });

		expect(fileInput.click).toHaveBeenCalledTimes(1);
	});

	it('should dispatch submit event on Enter key on submit button', async () => {
		const { component, container } = render(PromptControls, {
			props: {
				placeholderVisible: false
			}
		});

		const mockSubmit = vi.fn();
		component.$on('submit', mockSubmit);

		const submitButton = container.querySelector('.submit-container');
		await fireEvent.keyDown(submitButton as Element, { key: 'Enter' });

		expect(mockSubmit).toHaveBeenCalledTimes(1);
	});
});
