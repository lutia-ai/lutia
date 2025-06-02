<script lang="ts">
	import type { WebSearchData } from '$lib/types/types';
	import { slide } from 'svelte/transition';

	export let searchResults: WebSearchData[] = [];

	// State for expand/collapse functionality
	let isExpanded = false;
	const initialDisplayCount = 4;

	// Flatten all results from all search data - with defensive checking
	$: allResults =
		searchResults && Array.isArray(searchResults)
			? searchResults.flatMap((searchData) => searchData?.results || [])
			: [];
	$: initialResults = allResults.slice(0, initialDisplayCount);
	$: additionalResults = allResults.slice(initialDisplayCount);
	$: hasMoreResults = allResults.length > initialDisplayCount;

	/**
	 * Toggle expanded state
	 */
	function toggleExpanded(): void {
		isExpanded = !isExpanded;
	}

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
	 * Get domain name from URL for display
	 */
	function getDomainName(url: string): string {
		try {
			const domain = new URL(url).hostname;
			return domain.replace('www.', '');
		} catch {
			return 'Unknown source';
		}
	}

	/**
	 * Truncate text to specified length
	 */
	function truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	/**
	 * Format page age for display
	 */
	function formatPageAge(pageAge: string | null): string {
		if (!pageAge) return 'Today';
		return pageAge;
	}

	/**
	 * Open URL in new tab
	 */
	function openUrl(url: string): void {
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	/**
	 * Handle keydown events for card interaction
	 */
	function handleCardKeydown(event: KeyboardEvent, url: string): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openUrl(url);
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
</script>

{#if searchResults && searchResults.length > 0 && allResults.length > 0}
	<div class="web-search-results">
		<div class="search-header">
			{#if hasMoreResults}
				<button
					class="header-button"
					on:click={toggleExpanded}
					aria-label={isExpanded ? 'Show fewer sources' : 'Show more sources'}
					type="button"
				>
					<div class="header-content">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
							/>
						</svg>
						<span>Sources</span>
						<svg
							class="expand-arrow"
							class:expanded={isExpanded}
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
						</svg>
					</div>
				</button>
			{:else}
				<div class="header-content">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
						/>
					</svg>
					<span>Sources</span>
				</div>
			{/if}
		</div>

		<div class="search-grid">
			{#each initialResults as result}
				{#if result && result.url && result.title}
					<div
						class="search-card"
						role="button"
						tabindex="0"
						on:click={() => openUrl(result.url)}
						on:keydown={(e) => handleCardKeydown(e, result.url)}
					>
						<div class="card-content">
							<div class="source-header">
								<div class="source-info">
									<img
										src={getFaviconUrl(result.url)}
										alt={getDomainName(result.url)}
										class="favicon"
										loading="lazy"
										on:error={handleImageError}
									/>
									<span class="source-name">{getDomainName(result.url)}</span>
								</div>
								<span class="publish-time">{formatPageAge(result.page_age)}</span>
							</div>

							<h3 class="article-title">{truncateText(result.title, 100)}</h3>
						</div>
					</div>
				{/if}
			{/each}
		</div>

		{#if isExpanded && additionalResults.length > 0}
			<div
				class="additional-results-container"
				transition:slide={{ duration: 400, delay: 100 }}
			>
				<div class="search-grid">
					{#each additionalResults as result}
						{#if result && result.url && result.title}
							<div
								class="search-card"
								role="button"
								tabindex="0"
								on:click={() => openUrl(result.url)}
								on:keydown={(e) => handleCardKeydown(e, result.url)}
							>
								<div class="card-content">
									<div class="source-header">
										<div class="source-info">
											<img
												src={getFaviconUrl(result.url)}
												alt={getDomainName(result.url)}
												class="favicon"
												loading="lazy"
												on:error={handleImageError}
											/>
											<span class="source-name"
												>{getDomainName(result.url)}</span
											>
										</div>
										<span class="publish-time"
											>{formatPageAge(result.page_age)}</span
										>
									</div>

									<h3 class="article-title">{truncateText(result.title, 100)}</h3>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.web-search-results {
		margin-top: 20px;
		margin-bottom: 20px;

		.search-header {
			display: flex;
			align-items: center;
			justify-content: flex-start;
			margin-bottom: 16px;

			.header-button {
				background: none;
				border: none;
				cursor: pointer;
				padding: 8px 12px;
				border-radius: 8px;
				transition: all 0.2s ease;

				&:hover {
					background: var(--bg-color-light);
				}
			}

			.header-content {
				display: flex;
				align-items: center;
				gap: 8px;
				color: var(--text-color-light);
				font-size: 14px;
				font-weight: 500;

				svg {
					opacity: 0.7;
				}

				.expand-arrow {
					opacity: 0.7;
					transform: rotate(0deg);
					transition: all 0.2s ease;

					&.expanded {
						transform: rotate(180deg);
					}
				}
			}
		}

		.search-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
			gap: 16px;
		}

		.search-card {
			background: var(--bg-color);
			border: 1px solid var(--bg-color-light);
			border-radius: 8px;
			padding: 16px;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: var(--bg-color-light);
				border-color: var(--text-color-light-opacity);
				transform: translateY(-1px);
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			}

			.card-content {
				.source-header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					margin-bottom: 12px;

					.source-info {
						display: flex;
						align-items: center;
						gap: 8px;

						.favicon {
							width: 16px;
							height: 16px;
							border-radius: 2px;
							flex-shrink: 0;
						}

						.source-name {
							font-size: 13px;
							color: var(--text-color-light);
							font-weight: 500;
						}
					}

					.publish-time {
						font-size: 12px;
						color: var(--text-color-light-opacity);
						font-weight: 400;
					}
				}

				.article-title {
					font-size: 14px;
					font-weight: 400;
					color: var(--text-color);
					margin: 0;
					line-height: 1.4;
					display: -webkit-box;
					-webkit-line-clamp: 3;
					line-clamp: 3;
					-webkit-box-orient: vertical;
					overflow: hidden;
				}
			}
		}

		.additional-results-container {
			margin-top: 16px;

			.search-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
				gap: 16px;
			}
		}
	}

	@media (max-width: 768px) {
		.web-search-results {
			margin-top: 16px;

			.search-grid {
				grid-template-columns: 1fr;
				gap: 12px;
			}

			.search-card {
				padding: 12px;
			}
		}
	}
</style>
