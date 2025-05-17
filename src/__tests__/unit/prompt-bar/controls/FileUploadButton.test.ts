/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FileUploadButton from '$lib/components/prompt-bar/controls/FileUploadButton.svelte';
import type { ApiProvider } from '@prisma/client';

describe('FileUploadButton', () => {
    /**
     * Test component rendering with required props
     */
    it('should render correctly with required props', () => {
        const { getByRole } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'openAI' as ApiProvider 
            }
        });
        
        // Verify it's accessible as a button
        const button = getByRole('button');
        expect(button).toBeDefined();
        expect(button.classList.contains('plus-icon')).toBe(true);
        
        // Check that the file input exists and is hidden
        const fileInput = button.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).toBeDefined();
        expect(fileInput.style.display).toBe('none');
    });
    
    /**
     * Test that clicking the button triggers the file input click
     */
    it('should trigger file input click when button is clicked', async () => {
        const { getByRole } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'openAI' as ApiProvider 
            }
        });
        
        const button = getByRole('button');
        const fileInput = button.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Mock the click method of the file input
        const mockClick = vi.fn();
        fileInput.click = mockClick;
        
        // Click the button
        await fireEvent.click(button);
        
        // Verify that the file input's click method was called
        expect(mockClick).toHaveBeenCalledTimes(1);
    });
    
    /**
     * Test keyboard accessibility (Enter key should trigger file input click)
     */
    it('should trigger file input click on Enter key', async () => {
        const { getByRole } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'openAI' as ApiProvider 
            }
        });
        
        const button = getByRole('button');
        const fileInput = button.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Mock the click method of the file input
        const mockClick = vi.fn();
        fileInput.click = mockClick;
        
        // Press Enter on the button
        await fireEvent.keyDown(button, { key: 'Enter' });
        
        // Verify that the file input's click method was called
        expect(mockClick).toHaveBeenCalledTimes(1);
    });
    
    /**
     * Test that other keys don't trigger the file input click
     */
    it('should not trigger file input click on other keys', async () => {
        const { getByRole } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'openAI' as ApiProvider 
            }
        });
        
        const button = getByRole('button');
        const fileInput = button.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Mock the click method of the file input
        const mockClick = vi.fn();
        fileInput.click = mockClick;
        
        // Press Space on the button
        await fireEvent.keyDown(button, { key: 'Space' });
        
        // Verify that the file input's click method was not called
        expect(mockClick).not.toHaveBeenCalled();
    });
    
    /**
     * Test that file selection triggers the fileChange event
     */
    it('should dispatch fileChange event when files are selected', async () => {
        const { getByRole, component } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'openAI' as ApiProvider 
            }
        });
        
        const mockFileChange = vi.fn();
        component.$on('fileChange', mockFileChange);
        
        const button = getByRole('button');
        const fileInput = button.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Create a mock change event
        const mockEvent = new Event('change');
        await fireEvent(fileInput, mockEvent);
        
        // Verify that the fileChange event was dispatched
        expect(mockFileChange).toHaveBeenCalledTimes(1);
    });
    
    /**
     * Test that the multiple attribute is set correctly based on chosenCompany
     */
    it('should set multiple attribute to false when chosenCompany is google', () => {
        const { getByRole } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'google' as ApiProvider 
            }
        });
        
        const button = getByRole('button');
        const fileInput = button.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Verify that the multiple attribute is false for Google
        expect(fileInput.multiple).toBe(false);
    });
    
    /**
     * Test that the multiple attribute is set correctly for non-Google providers
     */
    it('should set multiple attribute to true when chosenCompany is not google', () => {
        const { getByRole } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'openAI' as ApiProvider 
            }
        });
        
        const button = getByRole('button');
        const fileInput = button.querySelector('input[type="file"]') as HTMLInputElement;
        
        // Verify that the multiple attribute is true for non-Google providers
        expect(fileInput.multiple).toBe(true);
    });
    
    /**
     * Test that HoverTag component is present
     */
    it('should include a hover tag tooltip', () => {
        const { container } = render(FileUploadButton, {
            props: { 
                chosenCompany: 'openAI' as ApiProvider 
            }
        });
        
        // Check for HoverTag component with specific text
        expect(container.innerHTML).toContain('Add images, PDFs, or code files');
    });
}); 