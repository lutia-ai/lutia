/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ReasoningToggle from '$lib/components/prompt-bar/controls/ReasoningToggle.svelte';

describe('ReasoningToggle', () => {
    /**
     * Test component rendering with default props
     */
    it('should render correctly with default props', () => {
        const { getByText, getByRole } = render(ReasoningToggle);
        
        // Verify the component renders with 'Reason' text
        expect(getByText('Reason')).toBeDefined();
        
        // Verify it's accessible as a button
        const button = getByRole('button');
        expect(button).toBeDefined();
        
        // With default props, the component should not have 'selected' class
        expect(button.classList.contains('selected')).toBe(false);
    });
    
    /**
     * Test rendering with various prop combinations
     */
    it('should be selected when model inherently supports reasoning', () => {
        const { getByRole } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: true,
                modelExtendedThinking: false
            } 
        });
        
        const button = getByRole('button');
        expect(button.classList.contains('selected')).toBe(true);
    });
    
    it('should be selected when reasoning is on and model supports extended thinking', () => {
        const { getByRole } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: true, 
                modelSupportsReasoning: false,
                modelExtendedThinking: true
            } 
        });
        
        const button = getByRole('button');
        expect(button.classList.contains('selected')).toBe(true);
    });
    
    it('should not be selected when reasoning is off and model does not support reasoning', () => {
        const { getByRole } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: false,
                modelExtendedThinking: false
            } 
        });
        
        const button = getByRole('button');
        expect(button.classList.contains('selected')).toBe(false);
    });
    
    /**
     * Test click behavior based on modelExtendedThinking prop
     */
    it('should dispatch toggle event when clicked if modelExtendedThinking is true', async () => {
        const { getByRole, component } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: false,
                modelExtendedThinking: true
            } 
        });
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.click(button);
        
        expect(mockToggle).toHaveBeenCalledTimes(1);
    });
    
    it('should not dispatch toggle event when clicked if modelExtendedThinking is false', async () => {
        const { getByRole, component } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: true,
                modelExtendedThinking: false
            } 
        });
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.click(button);
        
        expect(mockToggle).not.toHaveBeenCalled();
    });
    
    /**
     * Test keyboard accessibility based on modelExtendedThinking prop
     */
    it('should dispatch toggle event on Enter key if modelExtendedThinking is true', async () => {
        const { getByRole, component } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: false,
                modelExtendedThinking: true
            } 
        });
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.keyDown(button, { key: 'Enter' });
        
        expect(mockToggle).toHaveBeenCalledTimes(1);
    });
    
    it('should not dispatch toggle event on Enter key if modelExtendedThinking is false', async () => {
        const { getByRole, component } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: true,
                modelExtendedThinking: false
            } 
        });
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.keyDown(button, { key: 'Enter' });
        
        expect(mockToggle).not.toHaveBeenCalled();
    });
    
    /**
     * Test that other keys don't trigger the toggle event
     */
    it('should not dispatch toggle event on other keys', async () => {
        const { getByRole, component } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: false,
                modelExtendedThinking: true
            } 
        });
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.keyDown(button, { key: 'Space' });
        
        expect(mockToggle).not.toHaveBeenCalled();
    });
    
    /**
     * Test tooltip text based on modelSupportsReasoning prop
     */
    it('should show correct tooltip when model supports reasoning', () => {
        const { container } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: true,
                modelExtendedThinking: false
            } 
        });
        
        expect(container.innerHTML).toContain('Thinks before responding');
    });
    
    it('should show correct tooltip when model does not support reasoning', () => {
        const { container } = render(ReasoningToggle, { 
            props: { 
                reasoningOn: false, 
                modelSupportsReasoning: false,
                modelExtendedThinking: false
            } 
        });
        
        expect(container.innerHTML).toContain("Selected model doesn't support reasoning");
    });
}); 