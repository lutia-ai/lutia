<script lang="ts">
	import { fade } from 'svelte/transition';

	export let toolName: string = 'web_search';
	export let toolData: any = undefined;
	export let content: string = 'Searching the web';
	export let isActive: boolean = false;

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

	/**
	 * Get appropriate SVG icon for tool type
	 */
	function getToolIcon(iconType: string) {
		const icons: Record<string, string> = {
			search: `<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />`,
			code: `<path d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z" />`,
			file: `<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />`,
			tool: `<path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.7,20.3C23.1,19.9 23.1,19.3 22.7,19Z" />`
		};

		return icons[iconType] || icons.tool;
	}
</script>

<div class="tool-use-container" transition:fade={{ duration: 300 }}>
	<div class="tool-icon" style="color: {toolConfig.color}">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			{@html getToolIcon(toolConfig.icon)}
		</svg>
	</div>
	<span class="tool-content" class:active={isActive}>
		{content || toolConfig.label}
	</span>
	{#if toolData && toolName === 'web_search'}
		<div class="tool-metadata">
			<span class="search-query">{toolData.query || ''}</span>
		</div>
	{/if}
</div>

<style lang="scss">
	.tool-use-container {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px 0;
		padding: 4px 0px;
		color: var(--text-color-light);
		// font-size: 20px;
		font-weight: 300;
		opacity: 0.65;

		.tool-icon {
			display: flex;
			align-items: center;
			opacity: 0.8;

			svg {
				transition: all 0.3s ease;
			}
		}

		.tool-content {
			// font-size: 14px;
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
</style>
