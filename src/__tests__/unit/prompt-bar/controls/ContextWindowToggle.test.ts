/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ContextWindowToggle from '$lib/components/prompt-bar/controls/ContextWindowToggle.svelte';

describe('ContextWindowToggle', () => {
    /**
     * Test component rendering with default props
     */
    it('should render correctly with default props', () => {
        const { getByText, getByRole } = render(ContextWindowToggle);
        
        // Verify the component renders with 'Custom' text
        expect(getByText('Custom')).toBeDefined();
        
        // Verify it's accessible as a button
        const button = getByRole('button');
        expect(button).toBeDefined();
        
        // With default props, the component should not have 'selected' class
        expect(button.classList.contains('selected')).toBe(false);
    });
    
    /**
     * Test rendering when isAuto is false
     */
    it('should render with selected style when isAuto is false', () => {
        const { getByRole } = render(ContextWindowToggle, { props: { isAuto: false } });
        
        const button = getByRole('button');
        expect(button.classList.contains('selected')).toBe(true);
    });
    
    /**
     * Test that clicking dispatches the toggle event
     */
    it('should dispatch toggle event when clicked', async () => {
        const { getByRole, component } = render(ContextWindowToggle);
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.click(button);
        
        expect(mockToggle).toHaveBeenCalledTimes(1);
    });
    
    /**
     * Test keyboard accessibility (Enter key should trigger toggle)
     */
    it('should dispatch toggle event on Enter key', async () => {
        const { getByRole, component } = render(ContextWindowToggle);
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.keyDown(button, { key: 'Enter' });
        
        expect(mockToggle).toHaveBeenCalledTimes(1);
    });
    
    /**
     * Test that other keys don't trigger the toggle event
     */
    it('should not dispatch toggle event on other keys', async () => {
        const { getByRole, component } = render(ContextWindowToggle);
        
        const mockToggle = vi.fn();
        component.$on('toggle', mockToggle);
        
        const button = getByRole('button');
        await fireEvent.keyDown(button, { key: 'Space' });
        
        expect(mockToggle).not.toHaveBeenCalled();
    });
    
    /**
     * Test that HoverTag component is present
     */
    it('should include a hover tag tooltip', () => {
        const { container } = render(ContextWindowToggle);
        
        // Check for HoverTag component
        // Note: this is a lightweight test just checking for existence
        // A more thorough test would use component testing with @testing-library/svelte
        expect(container.innerHTML).toContain('Customise your context window');
    });
}); 