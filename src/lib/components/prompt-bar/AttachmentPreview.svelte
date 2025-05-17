<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { FileAttachment, Image } from '$lib/types/types';
	import { getFileIcon } from '$lib/utils/fileHandling';
	import ImageThumbnail from '$lib/components/prompt-bar/ImageThumbnail.svelte';
	import FilePreview from '$lib/components/prompt-bar/FilePreview.svelte';
	import { isDragging } from '$lib/stores';
	import ImageIcon from '$lib/components/icons/ImageIcon.svelte';

	// Props
	export let imageAttachments: Image[] = [];
	export let fileAttachments: FileAttachment[] = [];
	export let modelHandlesImages: boolean = false;

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		drop: DragEvent;
		dragEnter: void;
		dragLeave: void;
		removeImage: { index: number };
		removeFile: { index: number };
		viewImage: { src: string; alt: string };
		viewFile: { content: string; filename: string };
	}>();

	// Reactive
	$: hasAttachments = imageAttachments.length > 0 || fileAttachments.length > 0;

	// Event handlers
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dispatch('drop', e);
	}

	function handleDragEnter() {
		dispatch('dragEnter');
	}

	function handleDragLeave() {
		dispatch('dragLeave');
	}

	function handleRemoveImage(index: number) {
		dispatch('removeImage', { index });
	}

	function handleRemoveFile(index: number) {
		dispatch('removeFile', { index });
	}

	function handleViewImage(src: string, alt: string) {
		dispatch('viewImage', { src, alt });
	}

	function handleViewFile(content: string, filename: string) {
		dispatch('viewFile', { content, filename });
	}
</script>

<div
	class="attachment-preview"
	class:has-attachments={hasAttachments}
	class:is-dragging={$isDragging}
	on:dragover={handleDragOver}
	on:drop={handleDrop}
	on:dragenter={handleDragEnter}
	on:dragleave={handleDragLeave}
	role="region"
>
	<div class="attachments-container">
		{#if $isDragging}
			<div class="image-drop-container">
				<div class="image-icon">
					<ImageIcon color="var(--text-color)" />
				</div>
				<div class="text-container">
					<h1>Drop files here</h1>
					<p>Images, PDFs, and text files are supported</p>
				</div>
			</div>
		{/if}
		{#if modelHandlesImages && imageAttachments.length > 0}
			<div class="attachment-group images" style="opacity: {$isDragging ? 0 : 1};">
				<h3>Images</h3>
				<div class="attachment-items">
					{#each imageAttachments as image, index}
						<ImageThumbnail
							src={image.data}
							alt={'Image attachment'}
							on:click={() => handleViewImage(image.data, 'Image attachment')}
							on:remove={() => handleRemoveImage(index)}
						/>
					{/each}
				</div>
			</div>
		{/if}

		{#if fileAttachments.length > 0}
			<div class="attachment-group files">
				<h3>Files</h3>
				<div class="attachment-items">
					{#each fileAttachments as file, index}
						<FilePreview
							name={file.filename}
							size={file.size}
							fileExtension={file.file_extension}
							on:click={() => handleViewFile(file.data, file.filename)}
							on:remove={() => handleRemoveFile(index)}
						/>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.attachment-preview {
		width: 100%;
		min-height: 120px;
		padding: 0;
		border-radius: 20px 20px 0 0;
		background: var(--bg-color-attachment);
		transition: all 0.2s ease;
		box-sizing: border-box;

		&.is-dragging {
			padding: 20px;
			padding-bottom: 0px;
			border: 2px dashed var(--border-color-dragging);
			background: var(--bg-color-dragging);
		}

		&.has-attachments {
			padding: 15px;
			padding-bottom: 0px;
			border-bottom: 1px solid var(--border-color-light);
		}
	}

	.image-drop-container {
		position: absolute;
		height: 100%;
		min-height: 110px;
		width: 100%;
		border: 2px dashed rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		display: flex;
		box-sizing: border-box;
		gap: 20px;
		background: var(--bg-color-light);
		transition: all 0.3s ease;
		animation: pulse 2s infinite;
		z-index: 100;
		pointer-events: none;

		@keyframes pulse {
			0% {
				border-color: rgba(255, 255, 255, 0.2);
			}
			50% {
				border-color: rgba(29, 96, 194, 0.4);
			}
			100% {
				border-color: rgba(255, 255, 255, 0.2);
			}
		}

		.image-icon {
			margin: auto 0 auto auto;
			width: 40px;
			height: 40px;
			opacity: 0.7;
		}

		.text-container {
			margin: auto auto auto 0;
			gap: 5px;
			display: flex;
			flex-direction: column;
			h1 {
				font-size: 18px;
				font-weight: 600;
				color: var(--text-color);
				margin: 0px;
			}
			p {
				font-size: 14px;
				font-weight: 300;
				color: var(--text-color-light);
				margin: 0px;
			}
		}
	}

	.attachments-container {
		position: relative;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 15px;

		.attachment-group {
			h3 {
				font-size: 0.9rem;
				margin: 0 0 8px 0;
				font-weight: 600;
				color: var(--text-color-secondary);
			}

			.attachment-items {
				display: flex;
				flex-wrap: wrap;
				gap: 12px;
			}
		}
	}
</style>
