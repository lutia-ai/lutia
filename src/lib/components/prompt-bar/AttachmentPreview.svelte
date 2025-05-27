<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { FileAttachment, Image, Model } from '$lib/types/types';
	import ImageThumbnail from '$lib/components/prompt-bar/ImageThumbnail.svelte';
	import FilePreview from '$lib/components/prompt-bar/FilePreview.svelte';
	import { isDragging } from '$lib/stores';
	import ImageIcon from '$lib/components/icons/ImageIcon.svelte';

	// Props
	export let imageAttachments: Image[] = [];
	export let fileAttachments: FileAttachment[] = [];
	export let currentModel: Model;

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		drop: DragEvent;
		dragEnter: void;
		dragLeave: void;
		removeImage: { index: number };
		removeFile: { index: number };
		viewImage: { src: string; alt: string };
		viewFile: { content: string; filename: string };
		notification: {
			title: string;
			message: string;
			duration: number;
			type: 'info' | 'success' | 'error';
		};
		imagesRemoved: { removedImages: Image[] };
	}>();

	// Reactive
	$: hasAttachments = imageAttachments.length > 0 || fileAttachments.length > 0;

	// Reactive logic to handle image limit changes
	$: if (currentModel && imageAttachments.length > currentModel.maxImages) {
		const excessCount = imageAttachments.length - currentModel.maxImages;
		const removedImages = imageAttachments.slice(currentModel.maxImages);

		// Remove excess images
		imageAttachments = imageAttachments.slice(0, currentModel.maxImages);

		// Dispatch notification event
		const imageWord = excessCount === 1 ? 'image' : 'images';
		dispatch('notification', {
			title: `${excessCount} ${imageWord} removed`,
			message: `The current model only supports ${currentModel.maxImages} image${currentModel.maxImages === 1 ? '' : 's'} per request`,
			duration: 4000,
			type: 'info'
		});

		// Also dispatch event for parent to handle if needed
		dispatch('imagesRemoved', { removedImages });
	}

	// Event handlers
	/**
	 * Handles drag over events by preventing default behavior
	 * @param e The drag event
	 */
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	/**
	 * Handles drop events and dispatches to parent
	 * @param e The drop event
	 */
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dispatch('drop', e);
	}

	/**
	 * Handles drag enter events and dispatches to parent
	 */
	function handleDragEnter() {
		dispatch('dragEnter');
	}

	/**
	 * Handles drag leave events and dispatches to parent
	 */
	function handleDragLeave() {
		dispatch('dragLeave');
	}

	/**
	 * Handles removing an image at the specified index
	 * @param index The index of the image to remove
	 */
	function handleRemoveImage(index: number) {
		dispatch('removeImage', { index });
	}

	/**
	 * Handles removing a file at the specified index
	 * @param index The index of the file to remove
	 */
	function handleRemoveFile(index: number) {
		dispatch('removeFile', { index });
	}

	/**
	 * Handles viewing an image in full screen
	 * @param src The image source URL
	 * @param alt The image alt text
	 */
	function handleViewImage(src: string, alt: string) {
		dispatch('viewImage', { src, alt });
	}

	/**
	 * Handles viewing a file's content
	 * @param content The file content
	 * @param filename The file name
	 */
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
			<div
				class="image-drop-container"
				class:max-images-exceeded={imageAttachments.length >= currentModel.maxImages}
			>
				{#if imageAttachments.length < currentModel.maxImages}
					<div class="image-icon">
						<ImageIcon color="var(--text-color)" />
					</div>
					<div class="text-container">
						<h1>Drop files here</h1>
						<p>Images, PDFs, and text files are supported</p>
					</div>
				{:else}
					<div class="image-icon">
						<ImageIcon color="rgba(255, 0, 0, 0.75)" />
					</div>
					<div class="text-container">
						<h1>Max images exceeded</h1>
						<p>
							The current model accepts {currentModel.maxImages} image{currentModel.maxImages ===
							1
								? ''
								: 's'} per request
						</p>
					</div>
				{/if}
			</div>
		{/if}
		{#if currentModel.handlesImages && imageAttachments.length > 0}
			<div class="attachment-group images" style="opacity: {$isDragging ? 0 : 1};">
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
				<div class="attachment-items">
					{#each fileAttachments as file, index}
						<FilePreview
							name={file.filename}
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

	.max-images-exceeded {
		background: rgba(255, 0, 0, 0.05);

		.text-container {
			h1,
			p {
				color: rgba(255, 0, 0, 0.75);
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
