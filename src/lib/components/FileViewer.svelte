<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import { bodyScrollLocked, darkMode } from '$lib/stores';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';

	export let content: string;
	export let filename: string = 'file.txt';
	export let show: boolean = false;
	export let language: string = ''; // For syntax highlighting

	// Function to close the file viewer
	function closeViewer() {
		show = false;
	}

	// Function to download the file content
	// function downloadFile() {
	// 	const blob = new Blob([content], { type: 'text/plain' });
	// 	const url = URL.createObjectURL(blob);
	// 	const link = document.createElement('a');
	// 	link.href = url;
	// 	link.download = filename;
	// 	document.body.appendChild(link);
	// 	link.click();
	// 	document.body.removeChild(link);
	// 	URL.revokeObjectURL(url);
	// }

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

	// Get file size in KB
	$: fileSize = content ? (new Blob([content]).size / 1024).toFixed(2) : 0;

	// Get line count
	$: lineCount = content ? content.split('\n').length : 0;

	// Get file extension for automatic language detection
	$: fileExtension = filename.split('.').pop()?.toLowerCase() || '';

	// Determine language class for syntax highlighting
	$: detectedLanguage = language || getLanguageFromExtension(fileExtension);

	// Function to detect language from file extension
	function getLanguageFromExtension(ext: string): string {
		const languageMap: Record<string, string> = {
			js: 'javascript',
			ts: 'typescript',
			jsx: 'jsx',
			tsx: 'tsx',
			py: 'python',
			rb: 'ruby',
			java: 'java',
			c: 'c',
			cpp: 'cpp',
			cs: 'csharp',
			go: 'go',
			rs: 'rust',
			php: 'php',
			html: 'html',
			css: 'css',
			scss: 'scss',
			json: 'json',
			md: 'markdown',
			xml: 'xml',
			yaml: 'yaml',
			yml: 'yaml',
			sql: 'sql',
			sh: 'bash',
			bash: 'bash',
			zsh: 'bash',
			svelte: 'svelte',
			swift: 'swift',
			kt: 'kotlin',
			dart: 'dart',
			ex: 'elixir',
			exs: 'elixir'
		};

		return languageMap[ext] || 'plaintext';
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<div
		class="file-viewer-overlay"
		on:click={closeViewer}
		on:keydown={(e) => e.key === 'Enter' && closeViewer()}
		role="button"
		tabindex="0"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="file-viewer-content"
			aria-label="File preview"
			transition:scale={{ duration: 300, start: 0.9 }}
		>
			<div
				class="non-clickable-container"
				role="button"
				tabindex="0"
				on:click|stopPropagation
				on:keydown={() => {}}
			>
				<div class="file-header">
					<div class="file-info">
						<span class="filename">{filename}</span>
						<span class="file-meta">{fileSize} KB • {lineCount} lines</span>
					</div>
					<div class="file-viewer-controls">
						<!-- <button
							class="button download-button"
							on:click|stopPropagation={downloadFile}
							title="Download file"
						>
							<DownloadIcon color="var(--text-color)" />
						</button> -->
						<button
							class="button close-button"
							on:click|stopPropagation={closeViewer}
							title="Close"
						>
							<CrossIcon color="var(--text-color)" />
						</button>
					</div>
				</div>

				<div class="file-content">
					{#if detectedLanguage !== 'plaintext'}
						<div class="code-content">
							<HighlightAuto code={content} let:highlighted>
								<LineNumbers
									{highlighted}
									--line-number-color={$darkMode
										? 'rgba(255, 255, 255, 0.3)'
										: 'rgba(0, 0, 0, 0.3)'}
									--border-color="rgba(255, 255, 255, 0.1)"
									--padding-left="1em"
									--padding-right="1em"
									style="width: 100%; font-size: 13px; line-height: 19px; overflow: visible;"
								/>
							</HighlightAuto>
						</div>
					{:else}
						<div class="plaintext-content">
							<pre
								style="width: 95%; white-space: pre-wrap; word-break: break-word;"><code
									>{content}</code
								></pre>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	:global(table) {
		border-radius: 0px !important;
	}

	.file-viewer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999999 !important;
		isolation: isolate;
	}

	.file-viewer-content {
		position: relative;
		width: 90vw;
		max-width: 1000px;
		min-height: 200px;
		max-height: 90vh;
		background: var(--bg-color, white);
		border-radius: 8px;
		overflow: hidden;
		color: var(--text-color, black);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		isolation: isolate;
	}

	.non-clickable-container {
		height: 100%;
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		position: relative;
		z-index: 1000000 !important;
	}

	.file-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color, #e0e0e0);
		background: var(--bg-color-light, #f5f5f5);
		flex-shrink: 0;
	}

	.file-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.filename {
		font-weight: 600;
		font-size: 16px;
	}

	.file-meta {
		font-size: 12px;
		color: var(--text-muted, #666);
	}

	.file-content {
		flex: 1;
		overflow: auto;
		padding: 0;
		font-family: 'Courier New', Courier, monospace;
		font-size: 14px;
		line-height: 1.5;
		background: var(--bg-color-code, #2e3842);
		min-height: 100px;
	}

	.code-content {
		height: 100%;
		width: 100%;
		display: flex;
	}

	:global(.file-content pre) {
		margin: 0;
		width: 100%;
		border-top-left-radius: 0px !important;
		border-top-right-radius: 0px !important;
	}

	.plaintext-content {
		padding: 16px;
		background: var(--bg-color-code, #2e3842);
		color: var(--text-color, white);
		height: 100%;
	}

	pre {
		margin: 0;
		padding: 16px;
		white-space: pre-wrap;
	}

	code {
		font-family: 'Courier New', Courier, monospace;
	}

	.file-viewer-controls {
		display: flex;
		gap: 8px;
	}

	.button {
		background: transparent;
		border: none;
		border-radius: 4px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.2s;

		&:hover {
			background: var(--hover-color, rgba(0, 0, 0, 0.1));
		}
	}
</style>
