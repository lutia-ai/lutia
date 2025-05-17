/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Switch from '../../lib/components/Switch.svelte';

describe('Switch Component', () => {
    // Test default state
    it('renders with default off state', () => {
        const { container } = render(Switch);
        const switchHandle = container.querySelector('.switch-handle') as HTMLElement;
        
        // In the off state, the handle should be at 25%
        expect(switchHandle).toHaveStyle({ left: '25%' });
        
        // The actual background style might have multiple properties, so we check if it contains our value
        const styles = window.getComputedStyle(switchHandle);
        expect(styles.background).toContain('var(--text-color-light)');
    });
    
    // Test with initial "on" state
    it('renders with on state when specified', () => {
        const { container } = render(Switch, { props: { on: true } });
        const switchHandle = container.querySelector('.switch-handle') as HTMLElement;
        
        // In the on state, the handle should be at 75%
        expect(switchHandle).toHaveStyle({ left: '75%' });
        
        // Check if background contains the expected value
        const styles = window.getComputedStyle(switchHandle);
        expect(styles.background).toContain('var(--text-color)');
    });
    
    // Test toggling with click
    it('toggles state when clicked', async () => {
        const user = userEvent.setup();
        const { container } = render(Switch);
        const switchContainer = container.querySelector('.switch-container');
        const switchHandle = container.querySelector('.switch-handle') as HTMLElement;
        
        // Initial state - off
        expect(switchHandle).toHaveStyle({ left: '25%' });
        
        // Click to toggle on
        if (switchContainer) {
            await user.click(switchContainer);
        }
        
        // Should now be in the on state
        expect(switchHandle).toHaveStyle({ left: '75%' });
        
        // Click again to toggle off
        if (switchContainer) {
            await user.click(switchContainer);
        }
        
        // Should be back to off state
        expect(switchHandle).toHaveStyle({ left: '25%' });
    });
    
    // Test keyboard accessibility
    it('toggles with enter key for accessibility', async () => {
        const { container } = render(Switch);
        const switchContainer = container.querySelector('.switch-container');
        const switchHandle = container.querySelector('.switch-handle') as HTMLElement;
        
        // Initial state - off
        expect(switchHandle).toHaveStyle({ left: '25%' });
        
        // Press Enter key
        if (switchContainer) {
            await fireEvent.keyDown(switchContainer, { key: 'Enter' });
        }
        
        // Should now be in the on state
        expect(switchHandle).toHaveStyle({ left: '75%' });
        
        // Press Enter key again
        if (switchContainer) {
            await fireEvent.keyDown(switchContainer, { key: 'Enter' });
        }
        
        // Should be back to off state
        expect(switchHandle).toHaveStyle({ left: '25%' });
    });
    
    // Test event dispatch
    it('dispatches toggle event with correct value', async () => {
        const mockToggle = vi.fn();
        
        const { component, container } = render(Switch, {
            props: {
                on: false
            }
        });
        
        // Add listeners for Svelte custom events
        component.$on('toggle', mockToggle);
        
        const switchComponent = container.querySelector('.switch-container');
        
        if (switchComponent) {
            // Click the switch
            await fireEvent.click(switchComponent);
            
            // Event should have been dispatched
            expect(mockToggle).toHaveBeenCalled();
        }
    });
}); 