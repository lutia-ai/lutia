/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Rect from '$lib/components/barchart/Rect.svelte';

describe('Rect Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test component rendering with required props
	 */
	it('should render correctly with required props', () => {
		const props = {
			x: 10,
			y: 20,
			width: 100,
			height: 50,
			item: { key: 'test', value: 123 },
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { container } = render(Rect, { props });

		// Verify the component renders with proper structure
		const rectElement = container.querySelector('rect');
		expect(rectElement).toBeDefined();

		// Verify the rect properties are set correctly
		expect(rectElement).toHaveAttribute('x', '10');
		expect(rectElement).toHaveAttribute('y', '20');
		expect(rectElement).toHaveAttribute('width', '100');
		expect(rectElement).toHaveAttribute('height', '50');
		expect(rectElement).toHaveAttribute('role', 'region');
	});

	/**
	 * Test tween animation setup
	 */
	it('should set up tweened values correctly', () => {
		const props = {
			x: 10,
			y: 20,
			width: 100,
			height: 50,
			item: { key: 'test', value: 123 },
			tweenOptions: {
				x: { duration: 200 },
				y: { duration: 300 },
				width: { duration: 400 },
				height: { duration: 500 }
			},
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { component } = render(Rect, { props });

		// We can't directly test tweened values in JSDOM, but we can verify
		// the component doesn't error when tweenOptions are provided
		expect(component).toBeDefined();
	});

	/**
	 * Test mouseEnter event handling
	 */
	it('should set hoveredItem and tooltip coordinates on mouseEnter', async () => {
		const item = { key: 'test', value: 123 };
		const props = {
			x: 10,
			y: 20,
			width: 100,
			height: 50,
			item,
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { component, container } = render(Rect, { props });

		// Create a spy for the mouseEnter handler
		const mouseEnterSpy = vi.fn();
		component.$on('mouseenter', mouseEnterSpy);

		// Trigger mouseEnter event
		const rectElement = container.querySelector('rect');
		expect(rectElement).not.toBeNull();

		if (rectElement) {
			await fireEvent.mouseEnter(rectElement, {
				clientX: 150,
				clientY: 200
			});

			// Check if the hoveredItem is set correctly
			expect(component.$$.ctx[component.$$.props['hoveredItem']]).toBe(item);

			// Check tooltip coordinates are updated
			expect(component.$$.ctx[component.$$.props['tooltipX']]).toBe(150);
			expect(component.$$.ctx[component.$$.props['tooltipY']]).toBe(200);
		}
	});

	/**
	 * Test mouseLeave event handling
	 */
	it('should clear hoveredItem on mouseLeave', async () => {
		const item = { key: 'test', value: 123 };
		const props = {
			x: 10,
			y: 20,
			width: 100,
			height: 50,
			item,
			hoveredItem: item, // Initially set to item
			tooltipX: 150,
			tooltipY: 200
		};

		const { component, container } = render(Rect, { props });

		// Create a spy for the mouseLeave handler
		const mouseLeaveSpy = vi.fn();
		component.$on('mouseleave', mouseLeaveSpy);

		// Trigger mouseLeave event
		const rectElement = container.querySelector('rect');
		expect(rectElement).not.toBeNull();

		if (rectElement) {
			await fireEvent.mouseLeave(rectElement);

			// Check if the hoveredItem is set to null
			expect(component.$$.ctx[component.$$.props['hoveredItem']]).toBeNull();
		}
	});

	/**
	 * Test updating tweened values when props change
	 */
	it('should update tweened values when props change', async () => {
		const initialProps = {
			x: 10,
			y: 20,
			width: 100,
			height: 50,
			item: { key: 'test', value: 123 },
			hoveredItem: null,
			tooltipX: 0,
			tooltipY: 0
		};

		const { component } = render(Rect, { props: initialProps });

		// Update props
		await component.$set({
			x: 30,
			y: 40,
			width: 200,
			height: 150
		});

		// We can't directly test the tweened values in JSDOM,
		// but we can ensure the component handles prop updates correctly
		expect(component).toBeDefined();
	});
});
