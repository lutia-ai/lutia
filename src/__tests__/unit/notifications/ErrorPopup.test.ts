/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ErrorPopup from '../../../lib/components/notifications/ErrorPopup.svelte';

// Mock Svelte transition functions
vi.mock('svelte/transition', () => ({
    fade: () => ({
        duration: 0,
        css: () => ''
    })
}));

describe('ErrorPopup Component', () => {
    // Mock timers for setTimeout testing
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Test initial rendering without message
    it('should not set visible to true when no message is provided', () => {
        const { component } = render(ErrorPopup);
        // Access internal state
        const visible = (component as any).$$.ctx.find((v: any) => typeof v === 'boolean');
        expect(visible).toBe(false);
    });

    // Test setVisibility method
    it('should set visible to true when setVisibility is called with a message', () => {
        const { component } = render(ErrorPopup);
        
        // Get the setVisibility method and call it
        const instance = component as unknown as { setVisibility: Function };
        instance.setVisibility('Test error message');
        
        // Access internal state 
        const visible = (component as any).$$.ctx.find((v: any) => typeof v === 'boolean');
        expect(visible).toBe(true);
        
        // Check message update
        const message = (component as any).$$.ctx.find((v: any) => typeof v === 'string' && v.length > 0);
        expect(message).toBe('Test error message');
    });

    // Test rendering with submessage
    it('should update subMessage when provided to setVisibility', () => {
        const { component } = render(ErrorPopup);
        
        // Get the setVisibility method and call it with a submessage
        const instance = component as unknown as { setVisibility: Function };
        instance.setVisibility('Main error', 'Additional details');
        
        // Check subMessage update
        const ctx = (component as any).$$.ctx;
        const subMessage = ctx.find((v: any) => v === 'Additional details');
        expect(subMessage).toBe('Additional details');
    });

    // Test success color
    it('should update color when specified as success', () => {
        const { component } = render(ErrorPopup);
        
        // Get the setVisibility method and call it with success color
        const instance = component as unknown as { setVisibility: Function };
        instance.setVisibility('Success message', null, 5000, 'success');
        
        // Check color update
        const ctx = (component as any).$$.ctx;
        const color = ctx.find((v: any) => v === 'success');
        expect(color).toBe('success');
    });

    // Test error color (default)
    it('should use error color by default', () => {
        const { component } = render(ErrorPopup);
        
        // Get the setVisibility method and call it
        const instance = component as unknown as { setVisibility: Function };
        instance.setVisibility('Error message');
        
        // Check color update
        const ctx = (component as any).$$.ctx;
        const color = ctx.find((v: any) => v === 'error');
        expect(color).toBe('error');
    });

    // Test auto-hide functionality
    it('should set visible to false after specified duration', async () => {
        const { component } = render(ErrorPopup);
        
        // Call setVisibility with a duration
        const instance = component as unknown as { setVisibility: Function };
        instance.setVisibility('Temporary message', null, 2000);
        
        // Should initially be visible
        let visible = (component as any).$$.ctx.find((v: any) => typeof v === 'boolean');
        expect(visible).toBe(true);
        
        // Fast-forward time by 2000ms
        vi.advanceTimersByTime(2000);
        
        // Should now be hidden
        visible = (component as any).$$.ctx.find((v: any) => typeof v === 'boolean');
        expect(visible).toBe(false);
    });
}); 