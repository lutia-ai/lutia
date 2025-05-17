/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ImageThumbnail from '$lib/components/prompt-bar/ImageThumbnail.svelte';

describe('ImageThumbnail', () => {
    /**
     * Test component rendering with required props
     */
    it('should render correctly with required props', () => {
        const props = {
            src: '/path/to/image.jpg'
        };
        
        const { container } = render(ImageThumbnail, { props });
        
        // Verify the component renders with proper structure
        const thumbnailContainer = container.querySelector('.image-thumbnail');
        expect(thumbnailContainer).toBeDefined();
        
        // Verify image src is set correctly
        const imgElement = container.querySelector('img');
        expect(imgElement).toBeDefined();
        expect(imgElement?.getAttribute('src')).toBe(props.src);
        
        // Verify default alt text
        expect(imgElement?.getAttribute('alt')).toBe('Image attachment');
    });
    
    /**
     * Test custom alt text
     */
    it('should render with custom alt text', () => {
        const props = {
            src: '/path/to/image.jpg',
            alt: 'Custom alt text'
        };
        
        const { container } = render(ImageThumbnail, { props });
        
        const imgElement = container.querySelector('img');
        expect(imgElement?.getAttribute('alt')).toBe(props.alt);
    });
    
    /**
     * Test click event dispatching
     */
    it('should dispatch click event when thumbnail is clicked', async () => {
        const props = {
            src: '/path/to/image.jpg'
        };
        
        const { component, container } = render(ImageThumbnail, { props });
        
        const mockClick = vi.fn();
        component.$on('click', mockClick);
        
        const thumbnailButton = container.querySelector('.thumbnail-button');
        await fireEvent.click(thumbnailButton as Element);
        
        expect(mockClick).toHaveBeenCalledTimes(1);
    });
    
    /**
     * Test remove event dispatching
     */
    it('should dispatch remove event when remove button is clicked', async () => {
        const props = {
            src: '/path/to/image.jpg'
        };
        
        const { component, container } = render(ImageThumbnail, { props });
        
        const mockRemove = vi.fn();
        component.$on('remove', mockRemove);
        
        const removeButton = container.querySelector('.remove-button');
        await fireEvent.click(removeButton as Element);
        
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });
    
    /**
     * Test that event propagation is stopped for remove event
     */
    it('should stop propagation when remove button is clicked', async () => {
        const props = {
            src: '/path/to/image.jpg'
        };
        
        const { component, container } = render(ImageThumbnail, { props });
        
        const mockClick = vi.fn();
        const mockRemove = vi.fn();
        component.$on('click', mockClick);
        component.$on('remove', mockRemove);
        
        // Create a mock event with a stopPropagation method
        const mockEvent = {
            stopPropagation: vi.fn()
        };
        
        // Get the remove button
        const removeButton = container.querySelector('.remove-button') as HTMLElement;
        
        // Manually call the handleRemove function by dispatching a click event
        await fireEvent.click(removeButton, mockEvent);
        
        // Verify remove event was dispatched
        expect(mockRemove).toHaveBeenCalled();
        
        // Verify click event was not dispatched
        expect(mockClick).not.toHaveBeenCalled();
    });
    
    /**
     * Test accessibility attributes
     */
    it('should have proper accessibility attributes', () => {
        const props = {
            src: '/path/to/image.jpg'
        };
        
        const { container } = render(ImageThumbnail, { props });
        
        // Check thumbnail button has appropriate aria-label
        const thumbnailButton = container.querySelector('.thumbnail-button');
        expect(thumbnailButton).toHaveAttribute('aria-label', 'View image attachment');
        
        // Check remove button has appropriate aria-label
        const removeButton = container.querySelector('.remove-button');
        expect(removeButton).toHaveAttribute('aria-label', 'Remove image attachment');
    });
}); 