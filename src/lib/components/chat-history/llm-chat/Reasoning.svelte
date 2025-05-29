<script lang="ts">
	import {
		processLinks,
		sanitizeLLmContent
	} from '$lib/components/chat-history/utils/chatHistory';
	import marked from '$lib/utils/marked-extensions.ts';

	export let reasoning: string;
	export let isLoading: boolean = false;
	export let onAutoCollapse: ((isManualToggle?: boolean) => void) | undefined = undefined;

	let isExpanded: boolean = false;
	let previousIsLoading: boolean = isLoading;
	const CONDENSED_LENGTH: number = 330; // Character limit for condensed view

	// Watch for when loading finishes to auto-collapse
	$: if (!isLoading && reasoning.length > CONDENSED_LENGTH) {
		const wasLoading = previousIsLoading;
		isExpanded = false;

		// If this was an auto-collapse (loading just finished), trigger scroll
		if (wasLoading && onAutoCollapse) {
			// Delay scroll to allow slide transition to start
			setTimeout(() => {
				onAutoCollapse();
			}, 150); // Half of the slide transition duration
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
			}, 0); // Half of the slide transition duration
		}
	}

	/**
	 * Checks if the content should show expand/collapse option
	 * This includes both streaming content that's reached the limit and completed content that's long
	 * @param content - The reasoning content
	 * @param loading - Whether content is still loading
	 * @returns True if content is longer than condensed length
	 */
	function shouldShowToggle(content: string): boolean {
		return content.length > CONDENSED_LENGTH;
	}

	$: processedContent = processLinks(marked(sanitizeLLmContent(reasoning)));
	$: condensedContent =
		typeof processedContent === 'string'
			? processedContent.substring(0, CONDENSED_LENGTH) + '...'
			: processedContent;
	$: showToggle = !isLoading && shouldShowToggle(reasoning);
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

	{#if reasoning.length > 0}
		<div
			class="reasoning-content"
			class:expanded={isLoading || isExpanded}
			class:condensed={!isLoading && !isExpanded && reasoning.length > CONDENSED_LENGTH}
		>
			{@html isExpanded || isLoading ? processedContent : condensedContent}
		</div>
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

		&.expanded {
			max-height: 2000px; // Large enough to accommodate most content
		}

		&.condensed {
			max-height: 150px; // Approximate height for condensed content
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
