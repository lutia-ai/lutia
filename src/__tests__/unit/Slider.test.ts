/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Slider from '../../lib/components/Slider.svelte';

describe('Slider Component', () => {
	// Test default values
	it('renders with default values', () => {
		const { container } = render(Slider);
		const sliderInput = container.querySelector('input[type="range"]') as HTMLInputElement;

		// Check properties instead of attributes for range input
		expect(sliderInput.min).toBe('0');
		expect(sliderInput.max).toBe('100');
		expect(sliderInput.step).toBe('1');
		// For value, we need to check the property
		expect(sliderInput.value).toBe('50');

		// Test the style variable for slider fill
		const sliderContainer = container.querySelector('.slider');
		expect(sliderContainer).toHaveStyle('--percentage: 50%');
	});

	// Test with custom props
	it('renders with custom props', () => {
		const { container } = render(Slider, {
			props: {
				min: 10,
				max: 200,
				step: 5,
				value: 75,
				name: 'test-slider',
				disabled: true
			}
		});

		const sliderInput = container.querySelector('input[type="range"]') as HTMLInputElement;

		expect(sliderInput.min).toBe('10');
		expect(sliderInput.max).toBe('200');
		expect(sliderInput.step).toBe('5');
		expect(sliderInput.value).toBe('75');
		expect(sliderInput.name).toBe('test-slider');
		expect(sliderInput.disabled).toBe(true);

		// Test the style variable for slider fill (75 out of 190 range = ~34.21%)
		const sliderContainer = container.querySelector('.slider');

		// Calculate the expected percentage
		const expectedPercentage = ((75 - 10) / (200 - 10)) * 100;
		expect(sliderContainer).toHaveStyle(`--percentage: ${expectedPercentage}%`);
	});

	// Test value change events
	it('fires events when value changes', async () => {
		const mockInputFn = vi.fn();
		const mockChangeFn = vi.fn();
		const mockCallbackFn = vi.fn();

		const { container } = render(Slider, {
			props: {
				onChange: mockCallbackFn
			}
		});

		const sliderInput = container.querySelector('input[type="range"]');

		if (sliderInput) {
			// Listen for Svelte events
			sliderInput.addEventListener('input', mockInputFn);
			sliderInput.addEventListener('change', mockChangeFn);

			// Simulate input event (dragging)
			await fireEvent.input(sliderInput, { target: { value: '75' } });

			// Check that events were fired
			expect(mockInputFn).toHaveBeenCalled();
			expect(mockCallbackFn).toHaveBeenCalledWith(75);

			// Simulate change event (release after dragging)
			await fireEvent.change(sliderInput, { target: { value: '80' } });

			expect(mockChangeFn).toHaveBeenCalled();
			expect(mockCallbackFn).toHaveBeenCalledWith(80);
		}
	});

	// Test Svelte event dispatching
	it('dispatches Svelte events with correct value', async () => {
		const mockInputListener = vi.fn();
		const mockChangeListener = vi.fn();

		// Create a wrapper component to catch events
		const { component, container } = render(Slider, {
			props: { value: 30 }
		});

		// Add listeners for Svelte custom events
		component.$on('input', mockInputListener);
		component.$on('change', mockChangeListener);

		const slider = container.querySelector('input[type="range"]');

		if (slider) {
			// Trigger input event
			await fireEvent.input(slider, { target: { value: '40' } });

			// Check that input event was dispatched with correct value
			expect(mockInputListener).toHaveBeenCalledTimes(1);
			expect(mockInputListener.mock.calls[0][0].detail).toEqual({ value: 40 });

			// Trigger change event
			await fireEvent.change(slider, { target: { value: '45' } });

			// Check that change event was dispatched with correct value
			expect(mockChangeListener).toHaveBeenCalledTimes(1);
			expect(mockChangeListener.mock.calls[0][0].detail).toEqual({ value: 45 });
		}
	});
});
