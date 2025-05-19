<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { type ApiProvider } from '@prisma/client';
	import type { FileAttachment, Image, Model, UserWithSettings } from '$lib/types/types';
	import {
		chatHistory,
		numberPrevMessages,
		chosenCompany,
		isContextWindowAuto,
		chosenModel,
		fullPrompt,
		isDragging,
		isSidebarOpen,
		isLargeScreen,
		mobileSidebarOpen
	} from '$lib/stores.ts';
	import { modelDictionary } from '$lib/models/modelDictionary';
	import {
		sanitizeHtml,
		generateFullPrompt
	} from '$lib/components/prompt-bar/utils/promptFunctions';
	import { selectCompany, selectModel } from '$lib/models/modelSelectionUtils';
	import { processFileSelect } from '$lib/utils/fileHandling';

	// Import utility functions
	import {
		formatPastedText,
		filterModels,
		getTextBeforeLastMention,
		calculateTokensAndPrice
	} from './utils/promptBarUtils';

	// Import components
	import AttachmentPreview from './AttachmentPreview.svelte';
	import ModelSearch from './ModelSearch.svelte';
	import PromptInput from './PromptInput.svelte';
	import TokenCounter from './TokenCounter.svelte';
	import PromptControls from './PromptControls.svelte';

	// Props
	export let user: UserWithSettings;

	// Local state
	let prompt: string = '';
	let imagePreview: Image[] = [];
	let fileAttachments: FileAttachment[] = [];
	let showModelSearch: boolean = false;
	let searchQuery: string = '';
	let filteredModels: { company: ApiProvider; model: Model; formattedName: string }[] = [];
	let selectedModelIndex: number | null = 0;
	let reasoningOn: boolean = false;
	let placeholderVisible: boolean = true;
	let input_tokens: number = 0;
	let input_price: number = 0;
	let promptBarHeight: number = 0;
	let promptInput: PromptInput;
	let wrapperElement: HTMLDivElement;
	let promptBarWrapperElement: HTMLDivElement;
	let promptBarWrapperWidth: string = '';

	// Event dispatcher
	const dispatch = createEventDispatcher();

    $: console.log('isContextWindowAuto', $isContextWindowAuto);

	// Reactive statements

	// Generates the fullPrompt and counts input tokens when the prompt changes
	$: if (
		prompt ||
		prompt === '' ||
		$numberPrevMessages ||
		imagePreview ||
		fileAttachments ||
		$isContextWindowAuto
	) {
		if (mounted) {
			fullPrompt.set(sanitizeHtml(prompt));
			if ($numberPrevMessages > 0) {
				fullPrompt.set(
					generateFullPrompt(
						prompt,
						$chatHistory,
						$numberPrevMessages,
						$chosenModel,
						false,
						$isContextWindowAuto
					)
				);
				if (
					Array.isArray($fullPrompt) &&
					$fullPrompt.length === 1 &&
					$fullPrompt[0].content.length === 0
				) {
					fullPrompt.set(prompt);
				}
			}

			// For token counting, create a temporary prompt that includes file attachments
			if (fileAttachments.length > 0) {
				// const tokenCountPrompt = preparePromptWithAttachments($fullPrompt, fileAttachments);
				// handleCountTokens(tokenCountPrompt);
			} else {
				calculateTokensAndPrice(
					$fullPrompt,
					imagePreview,
					$chosenModel,
					$chosenCompany
				).then((result) => {
					input_tokens = result.tokens;
					input_price = result.price;
				});
			}
		}
	}

	// Update promptBarHeight when needed
	$: if (wrapperElement) {
		promptBarHeight = wrapperElement.offsetHeight;
		dispatch('resize', { height: promptBarHeight });
	}

	// Update promptBarHeight when the wrapper changes
	$: if (promptBarWrapperElement) {
		const height = promptBarWrapperElement.offsetHeight;
		dispatch('resize', { height });
	}

	// Update placeholder visibility
	$: placeholderVisible = !prompt || prompt === '<br>' || prompt === '';

	// Compute prompt bar wrapper width
	$: promptBarWrapperWidth =
		$isSidebarOpen && !$mobileSidebarOpen && $isLargeScreen ? 'calc(100% - 310px)' : '';

	// Function to handle input changes (for @ mentions)
	function handleInput(event: CustomEvent<Event>) {
		const target = (event.detail.target as HTMLDivElement) || event.detail.currentTarget;
		const content = target.textContent || '';

		// Function to check if @ is valid
		const isValidAtPosition = (str: string, atIndex: number): boolean => {
			if (atIndex === 0) return true; // @ at start
			return true;
		};

		// Find all @ positions and check if any are valid
		const atIndices = [...content.matchAll(/@/g)].map((match) => match.index!);
		const hasValidAt = atIndices.some((index) => isValidAtPosition(content, index));

		if (hasValidAt) {
			showModelSearch = true;
			// Get the text after the last valid @
			const lastValidAtIndex = atIndices
				.filter((index) => isValidAtPosition(content, index))
				.pop();

			if (lastValidAtIndex !== undefined) {
				const afterAt = content.slice(lastValidAtIndex + 1);
				searchQuery = afterAt.trim().toLowerCase();

				// Filter models based on search query
				filteredModels = filterModels(modelDictionary, searchQuery);

				if (filteredModels.length === 0) {
					showModelSearch = false;
				}
			}
		} else {
			showModelSearch = false;
		}

		if (wrapperElement) {
			promptBarHeight = wrapperElement.offsetHeight;
			dispatch('resize', { height: promptBarHeight });
		}
	}

	// Function to handle model selection
	function handleSelectModel({ detail }: CustomEvent<{ company: ApiProvider; model: Model }>) {
		selectCompany(detail.company);
		selectModel(detail.model);
		showModelSearch = false;

		// Keep everything before the last @
		prompt = getTextBeforeLastMention(prompt);

		// Focus the input and set cursor to end
		if (promptInput) {
			promptInput.focus();
		}
	}

	// Handle mouse enter/leave for model search
	function handleMouseEnter({ detail }: CustomEvent<{ index: number }>) {
		selectedModelIndex = detail.index;
	}

	function handleMouseLeave() {
		selectedModelIndex = null;
	}

	// Handle key navigation in model search
	function handleKeyDown(event: CustomEvent<KeyboardEvent>) {
		const e = event.detail;
		if (showModelSearch) {
			if (e.key === 'Enter') {
				e.preventDefault();
				if (selectedModelIndex !== null && filteredModels[selectedModelIndex]) {
					handleSelectModel({
						detail: {
							company: filteredModels[selectedModelIndex].company,
							model: filteredModels[selectedModelIndex].model
						}
					} as CustomEvent);
				}
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedModelIndex =
					selectedModelIndex === null || selectedModelIndex === filteredModels.length - 1
						? 0
						: selectedModelIndex + 1;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedModelIndex =
					selectedModelIndex === null || selectedModelIndex === 0
						? filteredModels.length - 1
						: selectedModelIndex - 1;
			} else if (e.key === 'Escape') {
				e.preventDefault();
				showModelSearch = false;
			}
		} else if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	// Function for handling pastes
	function handlePaste(event: CustomEvent<ClipboardEvent>) {
		const e = event.detail;
		e.preventDefault();
		if (!e.clipboardData) return;

		const formattedText = formatPastedText(e.clipboardData.getData('text/plain'));

		if (formattedText) {
			document.execCommand('insertHTML', false, formattedText);
			// TODO: implement cursor view scrolling if needed
		}
	}

	// Attachment handling
	function handleDrop(e: CustomEvent<Event>) {
		isDragging.set(false);
		processFileSelect(
			e.detail,
			(newPreviews, newAttachments) => {
				imagePreview = [...imagePreview, ...newPreviews];
				fileAttachments = [...fileAttachments, ...newAttachments];
			},
			(title, message, duration, type) => {
				dispatch('notification', { title, message, duration, type });
			}
		);
	}

	// Functions for drag state
	function handleDragEnter() {
		isDragging.set(true);
	}

	function handleDragLeave() {
		isDragging.set(false);
	}

	// Functions to handle file actions
	function handleRemoveImage({ detail }: CustomEvent<{ index: number }>) {
		imagePreview = imagePreview.filter((_, i) => i !== detail.index);
	}

	function handleRemoveFile({ detail }: CustomEvent<{ index: number }>) {
		fileAttachments = fileAttachments.filter((_, i) => i !== detail.index);
	}

	function handleViewImage({ detail }: CustomEvent<{ src: string; alt: string }>) {
		dispatch('viewImage', detail);
	}

	function handleViewFile({ detail }: CustomEvent<{ content: string; filename: string }>) {
		dispatch('viewFile', detail);
	}

	function handleFileChange(e: CustomEvent<{ target: { files: FileList } }>) {
		isDragging.set(false);
		console.log('File change event received in PromptBar', e.detail.target.files);
		processFileSelect(
			e.detail,
			(newPreviews, newAttachments) => {
				console.log('New previews:', newPreviews);
				console.log('New attachments:', newAttachments);
				imagePreview = [...imagePreview, ...newPreviews];
				fileAttachments = [...fileAttachments, ...newAttachments];
			},
			(title, message, duration, type) => {
				dispatch('notification', { title, message, duration, type });
			}
		);
	}

	// Control functions

	function handleToggleReasoning() {
		reasoningOn = !reasoningOn;
	}

	// Submit function
	async function handleSubmit() {
		if (prompt.length === 0 || prompt === '<br>') {
			return;
		}

		// Create detail object with all needed data
		const submitData = {
			prompt: prompt.trim(),
			images: $chosenModel.handlesImages ? imagePreview : [],
			fileAttachments,
			reasoningOn
		};

		// Dispatch submit event to parent
		dispatch('submit', submitData);

		// Clear the prompt and attachments
		prompt = '';
		imagePreview = $chosenModel.handlesImages ? [] : imagePreview;
		fileAttachments = [];

		// Reset token counts
		({ tokens: input_tokens, price: input_price } = await calculateTokensAndPrice(
			prompt,
			imagePreview,
			$chosenModel,
			$chosenCompany
		));
	}

	// Handle clicks on prompt input
	function handlePromptClick() {
		if (prompt.startsWith('@')) {
			showModelSearch = true;
		}
	}

    // Set up
	let mounted = false;
    onMount(() => {
        mounted = true;
    });
</script>

<div
	class="prompt-bar-wrapper"
	class:shifted={$isSidebarOpen && $isLargeScreen}
	class:mobile-shifted={$mobileSidebarOpen}
	style="width: {promptBarWrapperWidth};"
	bind:this={promptBarWrapperElement}
>
	<div
		class="prompt-bar"
		class:price-visible={$isContextWindowAuto || user.user_settings?.prompt_pricing_visible}
		bind:this={wrapperElement}
	>
		{#if imagePreview.length > 0 || fileAttachments.length > 0 || $isDragging}
			<AttachmentPreview
				imageAttachments={imagePreview}
				{fileAttachments}
				modelHandlesImages={$chosenModel.handlesImages}
				on:drop={handleDrop}
				on:dragEnter={handleDragEnter}
				on:dragLeave={handleDragLeave}
				on:removeImage={handleRemoveImage}
				on:removeFile={handleRemoveFile}
				on:viewImage={handleViewImage}
				on:viewFile={handleViewFile}
			/>
		{/if}

		{#if showModelSearch && filteredModels.length > 0}
			<ModelSearch
				{filteredModels}
				{selectedModelIndex}
				show={showModelSearch}
				on:selectModel={handleSelectModel}
				on:mouseEnter={handleMouseEnter}
				on:mouseLeave={handleMouseLeave}
			/>
		{/if}

		<PromptInput
			bind:prompt
			{placeholderVisible}
			bind:this={promptInput}
			on:input={handleInput}
			on:click={handlePromptClick}
			on:keydown={handleKeyDown}
			on:paste={handlePaste}
		/>

		<PromptControls
			{reasoningOn}
			modelSupportsReasoning={$chosenModel.reasons}
			modelExtendedThinking={$chosenModel.extendedThinking}
			chosenCompany={$chosenCompany}
			{placeholderVisible}
			on:submit={handleSubmit}
			on:fileChange={handleFileChange}
			on:toggleReasoning={handleToggleReasoning}
		/>

		{#if !$isContextWindowAuto && (user.user_settings?.prompt_pricing_visible || !$isContextWindowAuto)}
			<TokenCounter
				tokens={input_tokens}
				cost={input_price}
				contextWindowSize={$numberPrevMessages}
				isVisible={true}
				paymentTier={user.payment_tier}
			/>
		{/if}
	</div>
</div>

<style lang="scss">
	.prompt-bar-wrapper {
		position: fixed;
		left: 50%;
		bottom: 0%;
		transform: translateX(calc(-50% + 30px));
		width: 100%;
		min-width: 340px;
		background: var(--bg-color);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		padding: 0 50px;
		transition:
			transform 0.3s ease,
			width 0.3s ease,
			padding 0.3s ease;

		&.shifted {
			transform: translateX(calc(-50% + 180px));
		}

		&.mobile-shifted {
			transform: translateX(calc(-50% + 20px));
			padding: 0 30px 0 50px;
		}
	}

	.prompt-bar {
		position: relative;
		margin: auto auto 35px auto;
		width: 100%;
		max-width: 900px;
		height: max-content;
		box-sizing: border-box;
		background: var(--bg-color-prompt-bar);
		border: 1px solid rgba(0, 0, 0, 0.1);
		box-shadow:
			0 0 #0000,
			0 0 #0000,
			0 9px 9px 0px rgba(0, 0, 0, 0.01),
			0 2px 5px 0px rgba(0, 0, 0, 0.06);
		border-radius: 30px;
		display: flex;
		flex-direction: column;
		gap: 5px;
		transition: margin 0.3s ease;
	}

	.price-visible {
		margin-bottom: 20px !important;
	}

	@media (max-width: 810px) {
		.prompt-bar-wrapper {
			transform: translateX(-50%);
			padding: 0 10px;
			transition: all 0.6s ease-in-out;

			&.shifted {
				transform: translateX(-50%);
			}
		}

		.prompt-bar {
			margin-left: 0;
		}
	}
</style>
