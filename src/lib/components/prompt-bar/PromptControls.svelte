<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ApiProvider } from '@prisma/client';
	import BrainIcon from '../icons/BrainIcon.svelte';
	import HoverTag from '../HoverTag.svelte';
	import { chosenModel, isContextWindowAuto } from '$lib/stores';
	import ArrowIcon from '$lib/components/icons/Arrow.svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';

	// Props
	export let reasoningOn: boolean = false;
	export let modelSupportsReasoning: boolean = false;
	export let modelExtendedThinking: boolean = false;
	export let chosenCompany: ApiProvider;
	export let placeholderVisible: boolean = true;

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		submit: void;
		fileChange: { target: { files: FileList } };
		toggleReasoning: void;
		toggleContextWindow: void;
	}>();

	// File input element
	let fileInput: HTMLInputElement;

	// Handle file input change
	function handleFileChange(event: Event) {
		event.preventDefault();
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			dispatch('fileChange', { target: { files: target.files } });
			// Reset the input value so the same file can be uploaded again
			// target.value = '';
		}
	}

	// Handle toggle reasoning
	function handleToggleReasoning() {
		dispatch('toggleReasoning');
	}

	// Handle submit
	function handleSubmit() {
		dispatch('submit');
	}
</script>

<div class="prompt-controls">
	<div class="left-controls">
		<button
			class="plus-icon button"
			tabindex="0"
			on:click={() => {
				fileInput.click();
			}}
			on:keydown={(e) => {
				if (e.key === 'Enter') {
					fileInput.click();
				}
			}}
		>
			<PlusIcon color="var(--text-color-light)" strokeWidth={1.8} />
			<input
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.txt,.py,.js,.html,.css,.json,.md,.svelte,.tsx,.jsx,.ts,.java,.c,.cpp,.cs,.go,.rb,.php,.swift,.kt"
				style="display: none;"
				on:change={handleFileChange}
				multiple={chosenCompany !== 'google'}
			/>
			<HoverTag text="Add images, PDFs, or code files" position="top" />
		</button>

		{#if modelSupportsReasoning || modelExtendedThinking}
			<button
				class:selected={reasoningOn || (modelSupportsReasoning && !modelExtendedThinking)}
				class="reason-button"
				tabindex="0"
				on:click={handleToggleReasoning}
				on:keydown|stopPropagation={(e) => {
					if (e.key === 'Enter') {
						if (modelExtendedThinking) reasoningOn = !reasoningOn;
					}
				}}
			>
				<div class="brain-icon">
					<BrainIcon
						color={reasoningOn || (modelSupportsReasoning && !modelExtendedThinking)
							? '#16a1f9'
							: 'var(--text-color-light)'}
					/>
				</div>
				<p>Reason</p>
				<HoverTag
					text={$chosenModel.reasons
						? 'Thinks before responding'
						: "Selected model doesn't support reasoning"}
					position="top"
				/>
			</button>
		{/if}

		<button
			class:selected={!$isContextWindowAuto}
			class="reason-button"
			tabindex="0"
			on:click={() => isContextWindowAuto.set(!$isContextWindowAuto)}
		>
			<div class="brain-icon">
				<ContextWindowIcon
					color={!$isContextWindowAuto ? '#16a1f9' : 'var(--text-color-light)'}
				/>
			</div>
			<p>Custom</p>
			<HoverTag text={'Customise your context window'} position="top" />
		</button>
	</div>

	<button
		class="button submit-container"
		disabled={placeholderVisible}
		tabindex="0"
		on:click={handleSubmit}
		on:keydown|stopPropagation={(e) => {
			if (e.key === 'Enter') {
				handleSubmit();
			}
		}}
	>
		<ArrowIcon color="var(--bg-color)" />
	</button>
</div>

<style lang="scss">
	.prompt-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 15px 15px 15px;
	}

	.left-controls {
		display: flex;
		margin: auto;
		width: 100%;
	}

	.plus-icon {
		margin: auto 0;
		background: transparent;
		border: 1px solid var(--text-color-light-opacity-extreme) !important;
		width: 32px !important;
		height: 32px !important;
		padding: 6px;
		box-sizing: border-box;

		&:hover {
			background: var(--bg-color-light-alt);
		}
	}

	.selected {
		border-color: #16a1f9 !important;
		background-color: rgba(22, 161, 249, 0.1);

		p {
			color: #16a1f9 !important;
		}
	}

	.reason-button {
		position: relative;
		display: flex;
		gap: 5px;
		margin-left: 5px;
		border: 1px solid var(--text-color-light-opacity-extreme);
		background-color: transparent;
		// width: auto;
		border-radius: 99999px;
		height: 36px !important;
		padding: 8px 10px;
		box-sizing: border-box;
		cursor: pointer;

		&:hover {
			background: var(--bg-color-light-alt);
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

	.button {
		position: relative;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		padding: 5px;
		box-sizing: border-box;
		cursor: pointer;
		transition: background 0.1s ease;
		border: none;
	}

	.submit-container {
		background: var(--text-color);

		&:hover {
			background: var(--text-color-hover);
		}
	}
</style>
