<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import HoverTag from '$lib/components/HoverTag.svelte';
	import type { ApiProvider } from '@prisma/client';

	// Props
	export let chosenCompany: ApiProvider;
	export let fileTypes: string =
		'image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.txt,.py,.js,.html,.css,.json,.md,.svelte,.tsx,.jsx,.ts,.java,.c,.cpp,.cs,.go,.rb,.php,.swift,.kt';

	// File input reference
	let fileInput: HTMLInputElement;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Handle click on the button to open file dialog
	function handleClick() {
		fileInput.click();
	}

	// Handle key press (Enter) to open file dialog
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			fileInput.click();
		}
	}

	// Handle file selection and dispatch change event
	function handleChange(event: Event) {
		dispatch('fileChange', event);
	}
</script>

<div
	class="plus-icon button"
	role="button"
	tabindex="0"
	on:click={handleClick}
	on:keydown|stopPropagation={handleKeydown}
>
	<PlusIcon color="var(--text-color-light)" strokeWidth={1.8} />
	<input
		bind:this={fileInput}
		type="file"
		accept={fileTypes}
		style="display: none;"
		on:change={handleChange}
		multiple={chosenCompany !== 'google'}
	/>
	<HoverTag text="Add images, PDFs, or code files" position="top" />
</div>

<style lang="scss">
	.plus-icon {
		margin: auto 0;
		border: 1px solid var(--text-color-light-opacity-extreme);
		width: 32px !important;
		height: 32px !important;
		padding: 6px;
		box-sizing: border-box;
		cursor: pointer;

		&:hover {
			background: var(--bg-color-light-alt);
		}
	}

	.button {
		position: relative;
		border-radius: 50%;
		padding: 5px;
		box-sizing: border-box;
		transition: background 0.1s ease;
	}
</style>
