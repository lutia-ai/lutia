<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import HoverTag from '$lib/components/HoverTag.svelte';

	// Props
	export let isAuto: boolean = true;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Handle toggle click
	function handleToggle() {
		dispatch('toggle');
	}

	// Handle key press
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			dispatch('toggle');
		}
	}
</script>

<div
	class="{!isAuto ? 'selected' : ''} reason-button"
	role="button"
	tabindex="0"
	on:click={handleToggle}
	on:keydown|stopPropagation={handleKeydown}
>
	<div class="brain-icon">
		<ContextWindowIcon color={!isAuto ? '#16a1f9' : 'var(--text-color-light)'} />
	</div>
	<p>Custom</p>
	<HoverTag text={'Customise your context window'} position="top" />
</div>

<style lang="scss">
	.reason-button {
		position: relative;
		display: flex;
		gap: 5px;
		margin-left: 5px;
		border: 1px solid var(--text-color-light-opacity-extreme);
		border-radius: 99999px;
		height: 36px !important;
		padding: 8px 10px;
		box-sizing: border-box;
		cursor: pointer;

		&:hover {
			background: var(--bg-color-light-alt);
		}

		&.selected {
			border-color: #16a1f9 !important;
			background-color: rgba(22, 161, 249, 0.1);

			p {
				color: #16a1f9 !important;
			}
		}

		.brain-icon {
			padding: 0;
			margin: 0;
			max-width: 18px;
			box-sizing: border-box;
		}

		p {
			padding: 0;
			margin: auto;
			font-size: 14px;
			color: var(--text-color-light);
			font-family:
				ui-sans-serif,
				-apple-system,
				system-ui,
				Segoe UI,
				Helvetica,
				Apple Color Emoji,
				Arial,
				sans-serif,
				Segoe UI Emoji,
				Segoe UI Symbol;
		}
	}
</style>
