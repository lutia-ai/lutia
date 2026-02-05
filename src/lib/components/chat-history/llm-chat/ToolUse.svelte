<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import type { WebSearchData } from '$lib/services/llm/tool-types';
	import WebSearchResults from '../web-search-results/WebSearchResults.svelte';
	import SpinningGlobeIcon from '$lib/components/icons/SpinningGlobeIcon.svelte';

	export let toolName: string = 'web_search';
	export let isActive: boolean = false;
	export let webSearchResults: WebSearchData[] = [];

	// Collapsible state for web search results
	let isExpanded: boolean = false;

	/**
	 * Get tool configuration based on tool name and active state
	 */
	function getToolConfig(name: string, active: boolean) {
		const configs: Record<
			string,
			{ icon: string; color: string; activeLabel: string; completedLabel: string }
		> = {
			web_search: {
				icon: 'search',
				color: 'var(--text-color-light)',
				activeLabel: 'Searching the web...',
				completedLabel: 'Searched the web'
			},
			code_execution: {
				icon: 'code',
				color: 'var(--accent-color)',
				activeLabel: 'Executing code...',
				completedLabel: 'Executed code'
			},
			file_analysis: {
				icon: 'file',
				color: 'var(--secondary-color)',
				activeLabel: 'Analyzing file...',
				completedLabel: 'Analyzed file'
			},
			file_search: {
				icon: 'search',
				color: 'var(--text-color-light)',
				activeLabel: 'Searching files...',
				completedLabel: 'Searched files'
			},
			codebase_search: {
				icon: 'search',
				color: 'var(--text-color-light)',
				activeLabel: 'Searching codebase...',
				completedLabel: 'Searched codebase'
			},
			default: {
				icon: 'tool',
				color: 'var(--text-color-light)',
				activeLabel: `Using ${name}...`,
				completedLabel: `Used ${name}`
			}
		};

		const config = configs[name] || configs.default;
		return {
			...config,
			label: active ? config.activeLabel : config.completedLabel
		};
	}

	$: toolConfig = getToolConfig(toolName, isActive);

	// Check if web search has results to show
	$: hasWebSearchResults =
		toolName === 'web_search' &&
		webSearchResults &&
		webSearchResults.length > 0 &&
		webSearchResults.some((result) => result.results && result.results.length > 0);

	// Get flattened results for favicon display
	$: allResults =
		webSearchResults && Array.isArray(webSearchResults)
			? webSearchResults.flatMap((searchData) => searchData?.results || [])
			: [];
	$: displayResults = allResults.slice(0, 3);
	$: totalResults = allResults.length;

	/**
	 * Get favicon URL for a domain
	 */
	function getFaviconUrl(url: string): string {
		try {
			const domain = new URL(url).hostname;
			return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
		} catch {
			return '/favicon.ico'; // fallback
		}
	}

	/**
	 * Handle image error
	 */
	function handleImageError(event: Event): void {
		const target = event.currentTarget;
		if (target instanceof HTMLImageElement) {
			target.style.display = 'none';
		}
	}

	/**
	 * Toggle expanded state for web search results
	 */
	function toggleExpanded(): void {
		if (hasWebSearchResults && !isActive) {
			isExpanded = !isExpanded;
		}
	}

	/**
	 * Handle keydown events for accessibility
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if ((event.key === 'Enter' || event.key === ' ') && hasWebSearchResults && !isActive) {
			event.preventDefault();
			toggleExpanded();
		}
	}

	/**
	 * Get appropriate SVG icon for tool type
	 */
	function getToolIcon(iconType: string) {
		const icons: Record<string, any> = {
			search: SpinningGlobeIcon,
			code: `<path d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z" />`,
			file: `<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />`,
			tool: `<path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.7,20.3C23.1,19.9 23.1,19.3 22.7,19Z" />`
		};

		return icons[iconType] || icons.tool;
	}
</script>

<div class="tool-use-container" transition:fade={{ duration: 300 }}>
	<div
		class="tool-header"
		class:clickable={hasWebSearchResults && !isActive}
		role={hasWebSearchResults && !isActive ? 'button' : 'group'}
		tabindex="-1"
		on:click={toggleExpanded}
		on:keydown={handleKeydown}
	>
		<div class="tool-icon" style="color: {toolConfig.color}">
			{#if toolName === 'web_search'}
				<div style="width: 18px; height: 18px;">
					<SpinningGlobeIcon color={toolConfig.color} />
				</div>
			{:else}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					{@html getToolIcon(toolConfig.icon)}
				</svg>
			{/if}
		</div>
		<span class="tool-content" class:active={isActive}>
			{toolConfig.label}
		</span>
		{#if toolName === 'web_search' && hasWebSearchResults}
			<div class="article-icons-container">
				<div class="overlapping-articles">
					{#each displayResults as result, index}
						{#if result && result.url}
							<div class="article-icon article-{index + 1}">
								<img
									src={getFaviconUrl(result.url)}
									alt="Article favicon"
									class="favicon"
									loading="lazy"
									on:error={handleImageError}
								/>
							</div>
						{/if}
					{/each}
				</div>
				{#if totalResults > 3}
					<span class="article-count">
						{totalResults} results
					</span>
				{/if}
			</div>
		{/if}
	</div>

	{#if isExpanded && hasWebSearchResults && !isActive}
		<div class="web-search-results-container" transition:slide={{ duration: 400, delay: 100 }}>
			<WebSearchResults searchResults={webSearchResults} />
		</div>
	{/if}
</div>

<style lang="scss">
	.tool-use-container {
		display: flex;
		flex-direction: column;
		margin: 0 0 16px 0;

		.tool-header {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 4px 0px;
			color: var(--text-color-light);
			font-weight: 300;
			opacity: 0.65;
			transition: all 0.2s ease;

			&.clickable {
				cursor: pointer;
				border-radius: 6px;
				padding: 8px 12px;
				margin: -4px -8px;

				&:hover {
					opacity: 1;
				}
			}

			.tool-icon {
				display: flex;
				align-items: center;
				opacity: 0.8;

				svg {
					transition: all 0.3s ease;
				}
			}

			.tool-content {
				color: var(--text-color);
				transition: all 0.3s ease;

				&.active {
					background: linear-gradient(
						90deg,
						var(--text-color-light-opacity) 0%,
						var(--text-color) 50%,
						var(--text-color-light-opacity) 100%
					);
					background-size: 200% 100%;
					background-clip: text;
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					animation: shimmer 3s ease-in-out infinite;
				}
			}

			.tool-metadata {
				margin-left: auto;
				font-size: 12px;
				color: var(--text-color-light);
				font-style: italic;

				.search-query {
					opacity: 0.7;
				}
			}

			.article-icons-container {
				display: flex;
				align-items: center;
				margin-left: auto;

				.overlapping-articles {
					position: relative;
					display: flex;
					align-items: center;
					height: 16px;
					width: 36px;

					.article-icon {
						position: absolute;
						width: 14px;
						height: 14px;
						border-radius: 4px;
						display: flex;
						align-items: center;
						justify-content: center;
						color: var(--text-color-light);
						box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
						overflow: hidden;

						.favicon {
							width: inherit;
							height: inherit;
							border-radius: 4px;
							object-fit: cover;
						}

						&.article-1 {
							left: 0;
							z-index: 3;
						}

						&.article-2 {
							left: 8px;
							z-index: 2;
							opacity: 0.9;
						}

						&.article-3 {
							left: 16px;
							z-index: 1;
							opacity: 0.8;
						}
					}
				}

				.article-count {
					font-size: 11px;
					color: var(--text-color-light);
					font-weight: 500;
					opacity: 0.8;
				}
			}
		}
	}

	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.8;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.05);
		}
	}

	.spinning {
		animation: spin 2s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
