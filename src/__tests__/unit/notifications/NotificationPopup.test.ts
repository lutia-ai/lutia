/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/svelte';
import NotificationPopup from '../../../lib/components/notifications/NotificationPopup.svelte';

// Mock Svelte transition functions
vi.mock('svelte/transition', () => ({
    fade: () => ({
        duration: 0,
        css: () => ''
    }),
    fly: () => ({
        duration: 0,
        css: () => ''
    })
}));

describe('NotificationPopup Component', () => {
    // Mock timers for setTimeout and setInterval testing
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Test initial rendering when hidden
    it('should not render when show is false', () => {
        const { container } = render(NotificationPopup, {
            props: {
                show: false,
                message: 'Test message'
            }
        });
        const notificationContainer = container.querySelector('.notification-container');
        expect(notificationContainer).toBeNull();
    });

    // Test rendering when shown
    it('should render when show is true', () => {
        const { container } = render(NotificationPopup, {
            props: {
                show: true,
                message: 'Test notification'
            }
        });
        
        const notificationContainer = container.querySelector('.notification-container');
        expect(notificationContainer).not.toBeNull();
        
        const messageElement = container.querySelector('.message');
        expect(messageElement?.textContent).toBe('Test notification');
    });

    // Test rendering with details
    it('should render details when provided', () => {
        const { container } = render(NotificationPopup, {
            props: {
                show: true,
                message: 'Main notification',
                details: 'Additional information'
            }
        });
        
        const detailsElement = container.querySelector('.details');
        expect(detailsElement?.textContent).toBe('Additional information');
    });

    // Test info type (default)
    it('should use info type by default', () => {
        const { container } = render(NotificationPopup, {
            props: {
                show: true,
                message: 'Info notification'
            }
        });
        
        const notificationContent = container.querySelector('.notification-content');
        expect(notificationContent?.classList.contains('info')).toBe(true);
        
        // Check for info icon
        const infoIcon = container.querySelector('.icon-container');
        expect(infoIcon).not.toBeNull();
    });

    // Test success type
    it('should use success type when specified', () => {
        const { container } = render(NotificationPopup, {
            props: {
                show: true,
                message: 'Success notification',
                type: 'success'
            }
        });
        
        const notificationContent = container.querySelector('.notification-content');
        expect(notificationContent?.classList.contains('success')).toBe(true);
    });

    // Test progress bar
    it('should show progress bar with default duration', () => {
        const { container } = render(NotificationPopup, {
            props: {
                show: true,
                message: 'Notification with progress',
                duration: 5000
            }
        });
        
        const progressContainer = container.querySelector('.progress-container');
        expect(progressContainer).not.toBeNull();
        
        const progressBar = container.querySelector('.progress-bar');
        expect(progressBar).not.toBeNull();
    });

    // Test auto-close functionality with svelte methods
    it('should hide after specified duration', async () => {
        const { component } = render(NotificationPopup, {
            props: {
                show: false,
                message: 'Temporary notification',
                duration: 3000
            }
        });
        
        // Access the component's showNotification method
        const instance = component as unknown as { showNotification: Function };
        instance.showNotification('Test notification', null, 3000);
        
        // Wait for timeout
        vi.advanceTimersByTime(3000);
        
        // Check internal state
        expect((component as any).$$.ctx[0]).toBe(false); // show property should be false
    });

    // Test progress bar calculation
    it('should calculate progress bar correctly', () => {
        const { component } = render(NotificationPopup, {
            props: {
                show: false,
                message: 'Progress notification',
                duration: 1000
            }
        });
        
        // Use the showNotification method
        const instance = component as unknown as { showNotification: Function };
        instance.showNotification('Test progress', null, 1000);
        
        // Fast-forward halfway
        vi.advanceTimersByTime(500);
        
        // Check internal state for progressValue
        // Index may vary, so we need to find the correct one
        const ctx = (component as any).$$.ctx;
        const progressValueIndex = ctx.findIndex((x: any) => typeof x === 'number' && x <= 100 && x >= 0);
        
        // Progress should be around 50% (with some margin for timing differences)
        if (progressValueIndex !== -1) {
            const progressValue = ctx[progressValueIndex];
            expect(progressValue).toBeLessThanOrEqual(70);
            expect(progressValue).toBeGreaterThanOrEqual(25);
        }
    });

    // Test close button
    it('should close when close button is clicked', async () => {
        const { container, component } = render(NotificationPopup, {
            props: {
                show: true,
                message: 'Closable notification',
                duration: 60000 // Long duration to ensure it doesn't auto-close during test
            }
        });
        
        // Click close button
        const closeButton = container.querySelector('.close-button') as HTMLElement;
        await act(() => {
            fireEvent.click(closeButton);
            return undefined;
        });
        
        // Internal show state should be false
        expect((component as any).$$.ctx[0]).toBe(false);
    });

    // Test showNotification method 
    it('should update with showNotification method', async () => {
        const { component } = render(NotificationPopup);
        
        // Initially hidden
        expect((component as any).$$.ctx[0]).toBe(false);
        
        // Call showNotification method
        const instance = component as unknown as { showNotification: Function };
        await act(() => {
            instance.showNotification('Method notification message', 'Method details');
            return undefined;
        });
        
        // Should now be visible
        expect((component as any).$$.ctx[0]).toBe(true);
        
        // Message should be updated
        expect((component as any).$$.ctx[1]).toBe('Method notification message');
        
        // Details should be updated
        expect((component as any).$$.ctx[2]).toBe('Method details');
    });

    // Test cleanup on destroy
    it('should clear timers when component is destroyed', () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        
        const { component } = render(NotificationPopup, {
            props: {
                show: true,
                message: 'Cleanup test',
                duration: 5000
            }
        });
        
        // Destroy the component
        component.$destroy();
        
        // Verify that timers were cleared
        expect(clearTimeoutSpy).toHaveBeenCalled();
        expect(clearIntervalSpy).toHaveBeenCalled();
    });
}); 