<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BrainIcon from '$lib/components/icons/BrainIcon.svelte';
	import HoverTag from '$lib/components/HoverTag.svelte';

	// Props
	export let reasoningOn: boolean = false;
	export let modelSupportsReasoning: boolean = false;
	export let modelExtendedThinking: boolean = false;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Handle toggle click
	function handleToggle() {
		if (modelExtendedThinking) {
			dispatch('toggle');
		}
	}

	// Handle key press
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && modelExtendedThinking) {
			dispatch('toggle');
		}
	}

	// Compute if button should be in selected state
	$: isSelected =
		(modelSupportsReasoning && !modelExtendedThinking) ||
		(reasoningOn && modelExtendedThinking);

	// Compute tooltip text
	$: tooltipText = modelSupportsReasoning
		? 'Thinks before responding'
		: "Selected model doesn't support reasoning";
</script>

<div
	class="{isSelected ? 'selected' : ''} reason-button"
	role="button"
	tabindex="0"
	on:click={handleToggle}
	on:keydown|stopPropagation={handleKeydown}
>
	<div class="brain-icon">
		<BrainIcon color={isSelected ? '#16a1f9' : 'var(--text-color-light)'} />
	</div>
	<p>Reason</p>
	<HoverTag text={tooltipText} position="top" />
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
