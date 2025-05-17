/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PromptControls from '$lib/components/prompt-bar/PromptControls.svelte';
import { chosenModel, isContextWindowAuto } from '$lib/stores';
import { ApiProvider } from '@prisma/client';

// Mock the stores
vi.mock('$lib/stores', () => ({
    chosenModel: {
        subscribe: vi.fn(),
        set: vi.fn()
    },
    isContextWindowAuto: {
        subscribe: vi.fn(),
        set: vi.fn()
    }
}));

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
        
        (chosenModel.subscribe as any).mockImplementation(mockChosenModelSubscribe);
        (isContextWindowAuto.subscribe as any).mockImplementation(mockIsContextWindowAutoSubscribe);
    });
    
    /**
     * Test component rendering with default props
     */
    it('should render correctly with default props', () => {
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI
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
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI,
                modelSupportsReasoning: true
            }
        });
        
        // Verify the reasoning button is rendered
        const reasoningButton = container.querySelectorAll('.reason-button')[0];
        expect(reasoningButton).toBeDefined();
        expect(reasoningButton.textContent).toContain('Reason');
    });
    
    it('should render reasoning button when modelExtendedThinking is true', () => {
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI,
                modelExtendedThinking: true
            }
        });
        
        // Verify the reasoning button is rendered
        const reasoningButton = container.querySelectorAll('.reason-button')[0];
        expect(reasoningButton).toBeDefined();
        expect(reasoningButton.textContent).toContain('Reason');
    });
    
    it('should not render reasoning button when neither supports reasoning', () => {
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI,
                modelSupportsReasoning: false,
                modelExtendedThinking: false
            }
        });
        
        // Verify there's only the context window button (the second reason-button)
        const reasoningButtons = container.querySelectorAll('.reason-button');
        expect(reasoningButtons.length).toBe(1);
        expect(reasoningButtons[0].textContent).toContain('Custom');
    });
    
    it('should apply selected class when reasoningOn is true', () => {
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI,
                modelSupportsReasoning: true,
                reasoningOn: true
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
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI
            }
        });
        
        // Verify the context window button is rendered
        const contextWindowButton = container.querySelectorAll('.reason-button')[0];
        expect(contextWindowButton).toBeDefined();
        expect(contextWindowButton.textContent).toContain('Custom');
    });
    
    it('should apply selected class when isContextWindowAuto is false', () => {
        // Mock isContextWindowAuto to return false
        (isContextWindowAuto.subscribe as any).mockImplementation((callback: (value: boolean) => void) => {
            callback(false); // Set to false
            return () => {};
        });
        
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI
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
                chosenCompany: ApiProvider.openAI,
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
                chosenCompany: ApiProvider.openAI,
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
                chosenCompany: ApiProvider.openAI,
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
        const { component, container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI,
                modelSupportsReasoning: true
            }
        });
        
        const mockToggleReasoning = vi.fn();
        component.$on('toggleReasoning', mockToggleReasoning);
        
        const reasoningButton = container.querySelectorAll('.reason-button')[0];
        await fireEvent.click(reasoningButton as Element);
        
        expect(mockToggleReasoning).toHaveBeenCalledTimes(1);
    });
    
    it('should toggle context window auto setting when custom button is clicked', async () => {
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI
            }
        });
        
        const contextWindowButton = container.querySelectorAll('.reason-button')[0];
        await fireEvent.click(contextWindowButton as Element);
        
        // Verify isContextWindowAuto.set was called with the opposite of the current value
        expect(isContextWindowAuto.set).toHaveBeenCalledWith(false);
    });
    
    /**
     * Test file input handling
     */
    it('should open file dialog when plus button is clicked', async () => {
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI
            }
        });
        
        const plusButton = container.querySelector('.plus-icon');
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Mock the click method
        const clickMock = vi.fn();
        Object.defineProperty(fileInput, 'click', {
            value: clickMock
        });
        
        await fireEvent.click(plusButton as Element);
        
        expect(clickMock).toHaveBeenCalledTimes(1);
    });
    
    it('should dispatch fileChange event when files are selected', async () => {
        const { component, container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI
            }
        });
        
        const mockFileChange = vi.fn();
        component.$on('fileChange', mockFileChange);
        
        const fileInput = container.querySelector('input[type="file"]');
        
        // Create a mock file list
        const file = new File(['file content'], 'test.txt', { type: 'text/plain' });
        Object.defineProperty(fileInput, 'files', {
            value: [file]
        });
        
        await fireEvent.change(fileInput as Element);
        
        expect(mockFileChange).toHaveBeenCalledTimes(1);
        expect(mockFileChange).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    target: {
                        files: [file]
                    }
                }
            })
        );
    });
    
    /**
     * Test keyboard accessibility
     */
    it('should open file dialog on Enter key on plus button', async () => {
        const { container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI
            }
        });
        
        const plusButton = container.querySelector('.plus-icon');
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Mock the click method
        const clickMock = vi.fn();
        Object.defineProperty(fileInput, 'click', {
            value: clickMock
        });
        
        await fireEvent.keyDown(plusButton as Element, { key: 'Enter' });
        
        expect(clickMock).toHaveBeenCalledTimes(1);
    });
    
    it('should dispatch submit event on Enter key on submit button', async () => {
        const { component, container } = render(PromptControls, {
            props: {
                chosenCompany: ApiProvider.openAI,
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