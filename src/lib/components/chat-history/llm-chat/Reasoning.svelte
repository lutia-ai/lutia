<script lang="ts">
	import {
		processLinks,
		sanitizeLLmContent
	} from '$lib/components/chat-history/utils/chatHistory';
	import marked from '$lib/utils/marked-extensions.ts';
	import { onMount } from 'svelte';

	export let reasoning: string;
	export let isLoading: boolean = false;
	export let onAutoCollapse: ((_isManualToggle?: boolean) => void) | undefined = undefined;
	export let animationMode: 'character' | 'word' | 'none' = 'character'; // Animation mode option

	let isExpanded: boolean = false;
	let previousIsLoading: boolean = isLoading;
	let displayedText: string = '';
	let previousReasoning: string = '';
	let typewriterTimeout: ReturnType<typeof setTimeout> | null = null;
	let animationFrame: number | null = null;
	const CONDENSED_LENGTH: number = 330; // Character limit for condensed view
	const TYPEWRITER_DELAY: number = 1; // Milliseconds between characters (adjust for speed)
	const WORD_DELAY: number = 10; // Milliseconds between words (for word mode)

	/**
	 * Smoothly animates new text using a typewriter effect
	 * @param newText - The new text to animate to
	 */
	function animateToNewText(newText: string): void {
		// Clear any existing animation
		if (typewriterTimeout) {
			clearTimeout(typewriterTimeout);
			typewriterTimeout = null;
		}
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
			animationFrame = null;
		}

		// If we're not loading or animation is disabled, just set the text immediately
		if (!isLoading || animationMode === 'none') {
			displayedText = newText;
			return;
		}

		// Find the common prefix between old and new text
		let commonLength = 0;
		const minLength = Math.min(displayedText.length, newText.length);
		for (let i = 0; i < minLength; i++) {
			if (displayedText[i] === newText[i]) {
				commonLength++;
			} else {
				break;
			}
		}

		// Only animate the new part
		const newPart = newText.slice(commonLength);

		if (newPart.length === 0) return;

		if (animationMode === 'word') {
			// Word-by-word animation
			const words = newPart.split(/(\s+)/); // Split preserving whitespace
			let currentWordIndex = 0;

			function typeNextWord(): void {
				if (currentWordIndex < words.length) {
					const wordsToShow = words.slice(0, currentWordIndex + 1).join('');
					displayedText = newText.slice(0, commonLength) + wordsToShow;
					currentWordIndex++;

					animationFrame = requestAnimationFrame(() => {
						typewriterTimeout = setTimeout(typeNextWord, WORD_DELAY);
					});
				}
			}

			typeNextWord();
		} else {
			// Character-by-character animation (default)
			let currentIndex = 0;

			function typeNextCharacter(): void {
				if (currentIndex < newPart.length) {
					displayedText = newText.slice(0, commonLength + currentIndex + 1);
					currentIndex++;

					// Use requestAnimationFrame for smoother animation
					animationFrame = requestAnimationFrame(() => {
						typewriterTimeout = setTimeout(typeNextCharacter, TYPEWRITER_DELAY);
					});
				}
			}

			typeNextCharacter();
		}
	}

	// Watch for reasoning changes and animate smoothly
	$: if (reasoning !== previousReasoning) {
		animateToNewText(reasoning);
		previousReasoning = reasoning;
	}

	// Watch for when loading finishes to auto-collapse
	$: if (!isLoading && reasoning.length > CONDENSED_LENGTH) {
		const wasLoading = previousIsLoading;
		isExpanded = false;

		// Complete any pending animation immediately when loading finishes
		if (typewriterTimeout) {
			clearTimeout(typewriterTimeout);
			typewriterTimeout = null;
		}
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
			animationFrame = null;
		}
		displayedText = reasoning;

		// If this was an auto-collapse (loading just finished), trigger scroll
		if (wasLoading && onAutoCollapse) {
			// Delay scroll to allow slide transition to start
			setTimeout(() => {
				onAutoCollapse();
			}, 150);
		}
	}

	// Track loading state changes
	$: previousIsLoading = isLoading;

	/**
	 * Toggles the expanded state of the reasoning content
	 */
	function toggleExpanded(): void {
		isExpanded = !isExpanded;

		if (onAutoCollapse && !isExpanded) {
			setTimeout(() => {
				onAutoCollapse(true); // Pass true to indicate this is a manual toggle
			}, 0);
		}
	}

	/**
	 * Checks if the content should show expand/collapse option
	 * This includes both streaming content that's reached the limit and completed content that's long
	 * @param content - The reasoning content
	 * @returns True if content is longer than condensed length
	 */
	function shouldShowToggle(content: string): boolean {
		return content.length > CONDENSED_LENGTH;
	}

	// Use displayed text for processing instead of raw reasoning
	$: processedContent = processLinks(marked(sanitizeLLmContent(displayedText)));
	$: condensedContent = (() => {
		// Create condensed content from raw text to avoid cutting HTML entities
		if (typeof processedContent === 'string' && displayedText.length > CONDENSED_LENGTH) {
			const rawCondensed = displayedText.substring(0, CONDENSED_LENGTH) + '...';
			return processLinks(marked(sanitizeLLmContent(rawCondensed)));
		}
		return processedContent;
	})();
	$: showToggle = !isLoading && shouldShowToggle(reasoning);

	// Clean up on component destroy
	onMount(() => {
		// Initialize displayed text on mount
		displayedText = reasoning;
		return () => {
			if (typewriterTimeout) {
				clearTimeout(typewriterTimeout);
			}
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});
</script>

<div
	class="reasoning-container"
	class:expandable={showToggle}
	on:click={showToggle ? toggleExpanded : undefined}
	on:keydown={(e) => {
		if ((e.key === 'Enter' || e.key === ' ') && showToggle) {
			e.preventDefault();
			toggleExpanded();
		}
	}}
	role={showToggle ? 'button' : null}
	tabindex="-1"
	aria-expanded={showToggle ? isExpanded : null}
	aria-label={showToggle ? (isExpanded ? 'Collapse reasoning' : 'Expand reasoning') : null}
>
	<div class="reasoning-header">
		<span class="reasoning-title" class:shimmer={isLoading}> Reasoning </span>
		{#if showToggle && !isLoading && reasoning.length > CONDENSED_LENGTH}
			<div class="expand-arrow" class:expanded={isExpanded}>
				<svg width="12" height="8" viewBox="0 0 12 8" fill="none">
					<path
						d="M1 1L6 6L11 1"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
		{/if}
	</div>

	{#if displayedText.length > 0}
		<div
			class="reasoning-content"
			class:expanded={isLoading || isExpanded}
			class:condensed={!isLoading && !isExpanded && reasoning.length > CONDENSED_LENGTH}
			class:streaming={isLoading}
		>
			{@html isExpanded || isLoading ? processedContent : condensedContent}
		</div>
	{/if}
	{#if isLoading}
		<span class="gpt-loading-dot" />
	{/if}
</div>

<style lang="scss">
	.reasoning-container {
		margin-bottom: 35px;
		border: 1px solid var(--bg-color-light);
		padding: 10px;
		border-radius: 10px;
		background-color: var(--bg-color-light-opacity);
		width: 100%;
		box-sizing: border-box;

		&.expandable {
			cursor: pointer;
		}

		.gpt-loading-dot {
			position: relative;
			width: 15px !important;
			height: 15px !important;
			background: var(--text-color);
			transform: translateY(4px);
			border-radius: 50%;
			display: flex;
			animation: pulse-shrink 1s infinite;
		}

		@keyframes pulse-shrink {
			0% {
				background-color: var(--text-color); /* Original color at start */
				transform: translateY(4px) scale(1);
			}
			50% {
				background-color: var(--text-color-light); /* Slightly lighter color */
				transform: translateY(4px) scale(0.9); /* Slightly smaller */
			}
			100% {
				background-color: var(--text-color); /* Back to original color */
				transform: translateY(4px) scale(1); /* Back to original size */
			}
		}
	}

	.reasoning-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;

		.expand-arrow {
			opacity: 1;
			transition: all 0.2s ease;
			color: var(--text-color-light);
			transform: translateY(1px);

			&.expanded {
				transform: translateY(1px) rotate(180deg);
			}

			svg {
				display: block;
			}
		}

		.reasoning-title {
			font-size: 16px;
			font-weight: 500;
			color: var(--text-color-light);
			position: relative;

			&.shimmer {
				background: linear-gradient(
					110deg,
					var(--text-color-light) 0%,
					var(--text-color-light) 30%,
					var(--text-color) 50%,
					var(--text-color-light) 70%,
					var(--text-color-light) 100%
				);
				background-size: 250% 100%;
				background-clip: text;
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				animation: title-shimmer 2.5s ease-in-out infinite;
			}
		}
	}

	.reasoning-content {
		margin-top: 9px;
		font-weight: 300;
		line-height: 30px;
		overflow: hidden;
		transition: all 0.6s ease-in-out;
		position: relative;
		// max-height: 2000px;

		&.expanded {
			max-height: 20000px; // Large enough to accommodate most content
		}

		&.condensed {
			max-height: 250px; // Approximate height for condensed content
		}

		:global(p) {
			margin: 0 0 10px 0;
		}

		:global(code) {
			background: var(--bg-color-code);
			color: var(--text-color);
			padding: 2px 4px;
			border-radius: 3px;
			font-size: 14px;
		}

		:global(pre) {
			background: var(--bg-color-code);
			padding: 10px;
			border-radius: 5px;
			overflow-x: auto;
			margin: 10px 0;
		}
	}

	@keyframes title-shimmer {
		0% {
			background-position: -150% 0;
		}
		100% {
			background-position: 100% 0;
		}
	}

	@keyframes streaming-glow {
		0% {
			transform: translateX(-100%);
			opacity: 0;
		}
		50% {
			opacity: 0.8;
		}
		100% {
			transform: translateX(100%);
			opacity: 0;
		}
	}

	@media (max-width: 810px) {
		.reasoning-container {
			padding-left: 15px;

			.reasoning-header {
				.reasoning-title {
					font-size: 16px;
				}
			}
		}
	}
</style>
