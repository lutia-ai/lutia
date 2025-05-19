<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import { bodyScrollLocked } from '$lib/stores';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import DownloadIcon from '$lib/components/icons/DownloadIcon.svelte';

	export let src: string;
	export let alt: string = 'Image';
	export let show: boolean = false;

	// Function to close the image viewer
	function closeViewer() {
		show = false;
	}

	// Function to download the image
	function downloadImage() {
		const link = document.createElement('a');
		link.href = src;
		link.download = alt || 'image';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Close on escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeViewer();
		}
	}

	// Watch for changes to the show property and update the bodyScrollLocked store
	$: {
		if (typeof document !== 'undefined') {
			bodyScrollLocked.set(show);
		}
	}

	// Ensure body scrolling is restored when component is destroyed
	onDestroy(() => {
		if (typeof document !== 'undefined' && show) {
			bodyScrollLocked.set(false);
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<div
		class="image-viewer-overlay"
		on:click={closeViewer}
		on:keydown={(e) => e.key === 'Enter' && closeViewer()}
		role="button"
		tabindex="0"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="image-viewer-content"
			aria-label="Image preview"
			transition:scale={{ duration: 300, start: 0.9 }}
		>
			<div
				class="non-clickable-container"
				role="button"
				tabindex="0"
				on:click|stopPropagation
				on:keydown={() => {}}
			/>
			<img {src} {alt} />

			<div class="image-viewer-controls">
				<button class="button download-button" on:click={downloadImage}>
					<DownloadIcon color="white" />
				</button>
				<button class="button close-button" on:click={closeViewer}>
					<CrossIcon color="white" />
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.image-viewer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999999 !important;
		isolation: isolate;
	}

	.image-viewer-content {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		border-radius: 5px;
		overflow: hidden;
		isolation: isolate;
	}

	img {
		display: block;
		max-width: 100%;
		max-height: 90vh;
		object-fit: contain;
	}

	.image-viewer-controls {
		position: absolute;
		top: 10px;
		right: 10px;
		display: flex;
		gap: 10px;
		z-index: 10000000 !important;
	}

	.button {
		background: rgba(0, 0, 0, 0.5);
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.2s;

		&:hover {
			background: rgba(0, 0, 0, 0.7);
		}
	}

	.non-clickable-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1000000 !important;
		border-radius: none;
		background: none;
	}
</style>
