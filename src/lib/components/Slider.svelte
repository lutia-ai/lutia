<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let min: number = 0;
	export let max: number = 100;
	export let step: number = 1;
	export let value: number = 50;
	export let name: string = '';
	export let disabled: boolean = false;

	// Optional callback for value changes
	export let onChange: ((value: number) => void) | undefined = undefined;

	// Create Svelte event dispatcher
	const dispatch = createEventDispatcher<{
		change: { value: number };
		input: { value: number };
	}>();

	const handleChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		value = parseFloat(target.value);

		// Call the optional callback
		if (onChange) {
			onChange(value);
		}

		// Dispatch Svelte event
		dispatch('change', { value });
	};

	const handleInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		value = parseFloat(target.value);

		// Call the optional callback
		if (onChange) {
			onChange(value);
		}

		// Dispatch Svelte event
		dispatch('input', { value });
	};

	$: percentage = ((value - min) / (max - min)) * 100;
</script>

<div class="slider-container">
	<input
		type="range"
		{min}
		{max}
		{step}
		{name}
		{disabled}
		{value}
		on:input={handleInput}
		on:change={handleChange}
		class="slider"
		style="--percentage: {percentage}%"
	/>
</div>

<style>
	.slider-container {
		width: 100%;
		/* padding: 10px 0; */
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: #e0e0e0;
		outline: none;
		background: linear-gradient(
			to right,
			#16a1f9 0%,
			#16a1f9 var(--percentage),
			#e0e0e0 var(--percentage),
			#e0e0e0 100%
		);
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: white;
		border: 2px solid #16a1f9;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.slider::-moz-range-thumb {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: white;
		border: 2px solid #16a1f9;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.slider::-webkit-slider-thumb:hover {
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
		transform: scale(1.05);
	}

	.slider::-moz-range-thumb:hover {
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
		transform: scale(1.05);
	}

	.slider:disabled {
		opacity: 0.5;
	}

	.slider:disabled::-webkit-slider-thumb {
		cursor: not-allowed;
	}

	.slider:disabled::-moz-range-thumb {
		cursor: not-allowed;
	}
</style>
