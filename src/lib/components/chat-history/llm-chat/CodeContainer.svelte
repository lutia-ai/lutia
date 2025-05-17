<script lang="ts">
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import DropdownIcon from '$lib/components/icons/DropdownIcon.svelte';
	import CopyIcon from '$lib/components/icons/CopyIcon.svelte';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import { darkMode } from '$lib/stores.ts';
	import {
		copyToClipboard,
		updateChatHistoryToCopiedState
	} from '$lib/components/chat-history/utils/copying';
	import { changeTabWidth } from '$lib/components/chat-history/utils/codeContainerUtils';

	export let code: string = '';
	export let language: string = '';
	export let tabWidth: number | undefined = undefined;
	export let chatIndex: number | undefined = undefined;
	export let componentIndex: number | undefined = undefined;

	let tabWidthOpen = false;
	let copied = false;

	function handleCopy() {
		copyToClipboard(code ? code : '');
		copied = true;

		if (chatIndex !== undefined && componentIndex !== undefined) {
			updateChatHistoryToCopiedState(chatIndex, componentIndex);
		} else {
			// Reset the copied state after a delay if not using chat history
			setTimeout(() => {
				copied = false;
			}, 2000);
		}
	}
</script>

<div class="code-container">
	<div class="code-header">
		<p>{language}</p>

		<div class="right-side-container">
			{#if tabWidth}
				<div
					class="tab-width-container"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => (tabWidthOpen = true)}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							tabWidthOpen = true;
						}
					}}
				>
					<div class="dropdown-icon">
						<DropdownIcon color="rgba(255,255,255,0.65)" />
					</div>
					<p>Tab width: {tabWidth}</p>
					{#if tabWidthOpen}
						<div class="tab-width-open-container">
							{#each [2, 4, 6, 8] as width}
								<div
									role="button"
									tabindex="0"
									on:click|stopPropagation={() => {
										code = changeTabWidth(code, width);
										tabWidth = width;
										tabWidthOpen = false;
									}}
									on:keydown|stopPropagation={(e) => {
										if (e.key === 'Enter') {
											code = changeTabWidth(code, width);
											tabWidth = width;
										}
									}}
								>
									<p>Tab width: {width}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			<div
				class="copy-code-container"
				role="button"
				tabindex="0"
				on:click={() => handleCopy()}
				on:keydown|stopPropagation={(e) => {
					if (e.key === 'Enter') {
						handleCopy();
					}
				}}
			>
				{#if copied}
					<div class="tick-container">
						<TickIcon color="rgba(255,255,255,0.65)" />
					</div>
				{:else}
					<div class="copy-icon-container">
						<CopyIcon color="rgba(255,255,255,0.65)" />
					</div>
				{/if}
				<p>{copied ? 'copied' : 'copy'}</p>
			</div>
		</div>
	</div>
	<div class="code-content">
		<HighlightAuto code={code.trim()} let:highlighted>
			<LineNumbers
				{highlighted}
				--line-number-color={$darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
				--border-color="rgba(255, 255, 255, 0.1)"
				--padding-left="1em"
				--padding-right="1em"
				--
				style="max-width: 100%; font-size: 13px; line-height: 19px;"
			/>
		</HighlightAuto>
	</div>
</div>

<style lang="scss">
	.code-container > div {
		/* Scrollbar styling for the nested div */
		&::-webkit-scrollbar {
			width: 8px;
		}

		&::-webkit-scrollbar-track {
			background-color: transparent !important;
		}

		&::-webkit-scrollbar-thumb {
			background-color: rgba(0, 0, 0, 0.2);
			border-radius: 4px;
		}

		scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
	}

	.code-container {
		// padding-bottom: 10px;
		border-radius: 10px;
		margin: 20px 0;
		border-width: 0.5px;
		border-color: var(--bg-color-light);
		border-style: solid;

		.code-header {
			display: flex;
			padding: 10px 20px;
			background: rgba(46, 56, 66, 255);
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;

			.right-side-container {
				display: flex;
				margin-left: auto;

				.tab-width-container {
					position: relative;
					display: flex;
					gap: 5px;
					cursor: pointer;

					.dropdown-icon {
						width: 15px;
						height: 15px;
						transform: translateY(1px);
						margin: auto 0;
					}

					.tab-width-open-container {
						position: absolute;
						top: 180%;
						width: 100%;
						display: flex;
						gap: 10px;
						flex-direction: column;
						background: rgba(46, 56, 66, 1);
						z-index: 100;
						border-radius: 5px;
						padding: 5px;

						p {
							margin: auto;
							width: 100%;
							text-align: center;
							padding: 5px;
							box-sizing: border-box;
							border-radius: 5px;

							&:hover {
								background: rgba(55, 66, 76, 1);
							}
						}
					}
				}

				.copy-code-container {
					display: flex;
					margin-left: 30px;
					gap: 5px;
					cursor: pointer;

					.tick-container {
						width: 15px;
						height: 15px;
						border: 1px solid rgba(255, 255, 255, 0.65);
						border-radius: 50%;
						box-sizing: border-box;
					}

					.copy-icon-container {
						height: 15px;
						width: 15px;
						margin: auto 0;
					}

					p {
						margin: auto 0;
					}
				}
			}

			p {
				margin: auto 0;
				line-height: 15px !important;
				color: rgba(255, 255, 255, 0.65);
				font-weight: 300;
				font-size: 12px;
			}
		}

		.code-content {
			overflow: hidden;
			border-bottom-left-radius: 10px;
			border-bottom-right-radius: 10px;

			:global(table) {
				overflow: visible; /* This will apply only to tables within .code-content */
			}
		}
	}
</style>
