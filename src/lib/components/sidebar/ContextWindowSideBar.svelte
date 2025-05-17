<script lang="ts">
	import { fly } from 'svelte/transition';
	import Slider from '../Slider.svelte';
	import { chatHistory, numberPrevMessages, fullPrompt, contextWindowOpen } from '$lib/stores';
	import { marked } from 'marked';
	import {
		sanitizeLLmContent,
		processLinks
	} from '$lib/components/chat-history/utils/chatHistory';
	import { formatModelEnumToReadable } from '$lib/models/modelUtils';
	import type {
		ChatComponent,
		Attachment,
		FileAttachment,
		Image,
		Message
	} from '$lib/types/types';
	import {
		isModelAnthropic,
		isModelOpenAI,
		isModelGoogle,
		isModelXAI,
		isModelDeepSeek,
		isLlmChatComponent,
		isUserChatComponent
	} from '$lib/types/typeGuards';
	import ClaudeIcon from '$lib/images/claude.png';
	import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';
	import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
	import GrokIcon from '$lib/components/icons/GrokIcon.svelte';
	import DeepSeekIcon from '$lib/components/icons/DeepSeekIcon.svelte';
	import FileViewer from '../FileViewer.svelte';
	import ImageViewer from '../ImageViewer.svelte';
	import { getFileIcon, getFileIconColor } from '$lib/utils/fileHandling.js';

	// State for file and image viewers
	let showFileViewer = false;
	let currentFileContent = '';
	let currentFileName = '';

	let showImageViewer = false;
	let viewerImage = '';
	let viewerAlt = '';

	// Function to open image viewer
	function openImageViewer(src: string, alt: string) {
		viewerImage = src;
		viewerAlt = alt;
		showImageViewer = true;
	}

	// Function to open the file viewer
	function openFileViewer(content: string, filename: string) {
		currentFileContent = content;
		currentFileName = filename;
		showFileViewer = true;
	}

	// Determine role style classes
	function getRoleDetails(component: ChatComponent) {
		if (isUserChatComponent(component)) {
			return {
				className: 'user-message'
			};
		} else if (isLlmChatComponent(component)) {
			return {
				className: 'assistant-message'
			};
		} else {
			return {
				className: 'unknown-message'
			};
		}
	}

	// Get displayed messages from chatHistory based on numberPrevMessages
	let displayedMessages: ChatComponent[];
	$: displayedMessages = $chatHistory.slice(
		Math.max(0, $chatHistory.length - $numberPrevMessages * 2)
	);

	// Get current prompt text and attachments
	$: currentPrompt =
		typeof $fullPrompt === 'string'
			? $fullPrompt
			: Array.isArray($fullPrompt) &&
				  $fullPrompt.length > 0 &&
				  $fullPrompt[$fullPrompt.length - 1].role === 'user'
				? $fullPrompt[$fullPrompt.length - 1].content
				: '';

	// Function to get model name for a chat component
	function getModelName(component: ChatComponent): string {
		if (isLlmChatComponent(component)) {
			return component.by;
		}
		return '';
	}

	// Function to get formatted model name for display
	function getDisplayModelName(component: ChatComponent): string {
		if (isLlmChatComponent(component)) {
			return formatModelEnumToReadable(component.by);
		}
		return 'You';
	}

	// For instructions dropdown
	let isInstructionsOpen = false;
	function toggleInstructions() {
		isInstructionsOpen = !isInstructionsOpen;
	}
</script>

<div
	class="context-window-sidebar"
	in:fly={{ x: -300, duration: 300 }}
	out:fly={{ x: -300, duration: 300 }}
	on:click|stopPropagation={() => {}}
	on:keydown|stopPropagation={() => {}}
	role="button"
	tabindex="0"
>
	<div class="header">
		<div class="header-top">
			<h2>Context Window</h2>
			<button
				class="close-button"
				on:click|stopPropagation={() => contextWindowOpen.set(false)}
			>
				×
			</button>
		</div>

		<div class="header-details">
			<div class="instructions-dropdown">
				<button class="dropdown-toggle" on:click={toggleInstructions}>
					<span>{isInstructionsOpen ? 'Hide details' : 'Learn more'}</span>
				</button>

				{#if isInstructionsOpen}
					<div class="instructions-content" transition:fly={{ y: -20, duration: 200 }}>
						<h2>
							A custom context window lets you adjust how many previous messages will
							get sent with your prompt.<br /><br />
							<span>
								The more previous messages you include, the more memory the AI will
								have of your conversation, but the higher the cost of each message.
							</span>
						</h2>
					</div>
				{/if}
			</div>

			<div class="shortcut">
				<h1>Shortcut:</h1>
				<p>CTRL + [0-9]</p>
			</div>
			<div class="slider-container">
				<p>0</p>
				<Slider
					value={$numberPrevMessages}
					on:change={(e) => {
						numberPrevMessages.set(e.detail.value);
					}}
					min={0}
					max={$chatHistory.length / 2}
				/>
				<p>{$chatHistory.length / 2}</p>
			</div>
		</div>
	</div>

	<div class="context-container">
		<!-- Display messages from chatHistory based on numberPrevMessages -->
		{#each displayedMessages as message, index}
			{@const roleDetails = getRoleDetails(message)}
			{@const modelName = getModelName(message)}
			<div class="message-item {roleDetails.className}">
				<div class="message-header">
					{#if isLlmChatComponent(message)}
						<div class="model-icon">
							{#if isModelAnthropic(modelName)}
								<img src={ClaudeIcon} alt="Claude's icon" />
							{:else if isModelOpenAI(modelName)}
								<ChatGPTIcon color="var(--text-color)" width="22px" height="22px" />
							{:else if isModelGoogle(modelName)}
								<GeminiIcon />
							{:else if isModelXAI(modelName)}
								<GrokIcon color="var(--text-color)" />
							{:else if isModelDeepSeek(modelName)}
								<DeepSeekIcon />
							{:else}
								<span class="role-icon">🤖</span>
							{/if}
						</div>
					{:else}
						<!-- <span class="role-icon user-icon">👤</span> -->
					{/if}
					<span class="role-label">
						{getDisplayModelName(message)}
					</span>
					<span class="message-number">
						{message.by === 'user'
							? index === displayedMessages.length - 1 && currentPrompt
								? 'Current prompt'
								: `Prompt ${Math.floor(index / 2) + 1}`
							: `Response ${Math.floor(index / 2) + 1}`}
					</span>
				</div>
				<div class="message-content">
					{#if isUserChatComponent(message) && message.attachments && message.attachments.length > 0}
						<div class="user-attachments">
							<!-- {#each message.attachments.filter((att) => att.type === 'image') as image}
								<div
									class="user-image-container"
									on:click={() => openImageViewer(image.data, 'User uploaded image')}
									on:keydown={(e) => e.key === 'Enter' && openImageViewer(image.data, 'User uploaded image')}
									role="button"
									tabindex="0"
								>
									<img src={image.data} alt="User uploaded" />
								</div>
							{/each} -->
							{#each message.attachments.filter((att) => att.type === 'file') as file}
								<div
									class="user-file-container"
									role="button"
									tabindex="0"
									on:click={() => openFileViewer(file.data, file.filename)}
									on:keydown={(e) =>
										e.key === 'Enter' &&
										openFileViewer(file.data, file.filename)}
								>
									<div class="file-info">
										<div
											class="file-icon"
											style="background: {getFileIconColor(
												file.file_extension
											)}"
										>
											<span class="file-type"
												>{getFileIcon(file.file_extension)}</span
											>
										</div>
										<span class="file-name">{file.filename}</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
					<p>
						{@html processLinks(marked(sanitizeLLmContent(message.text)))}
					</p>
				</div>
			</div>
		{/each}

		<div class="message-item user-message">
			<div class="message-header">
				<!-- <span class="role-icon user-icon">👤</span> -->
				<span class="role-label">You</span>
				<span class="message-number">Current prompt</span>
			</div>
			<div class="message-content">
				<!-- {#if hasAttachments && attachments.length > 0}
                    <div class="user-attachments">
                        {#each attachments.filter((att) => att.type === 'image') as image}
                            <div
                                class="user-image-container"
                                on:click={() => openImageViewer(image.data, 'User uploaded image')}
                                on:keydown={(e) => e.key === 'Enter' && openImageViewer(image.data, 'User uploaded image')}
                                role="button"
                                tabindex="0"
                            >
                                <img src={image.data} alt="User uploaded" />
                            </div>
                        {/each}
                        {#each attachments.filter((att) => att.type === 'file') as file}
                            <div
                                class="user-file-container"
                                role="button"
                                tabindex="0"
                                on:click={() => openFileViewer(file.data, file.filename)}
                                on:keydown={(e) => e.key === 'Enter' && openFileViewer(file.data, file.filename)}
                            >
                                <div class="file-info">
                                    <div
                                        class="file-icon"
                                        style="background: {getFileIconColor(file.file_extension)}"
                                    >
                                        <span class="file-type">{getFileIcon(file.file_extension)}</span>
                                    </div>
                                    <span class="file-name">{file.filename}</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if} -->
				<p>
					{#if typeof currentPrompt === 'string'}
						{@html processLinks(marked(sanitizeLLmContent(currentPrompt)))}
					{:else}
						<!-- Handle non-string case -->
						{String(currentPrompt)}
					{/if}
				</p>
			</div>
		</div>
	</div>

	<div class="footer">
		<div class="token-info">
			<span>
				Context window: {$numberPrevMessages > $chatHistory.length / 2
					? $chatHistory.length / 2
					: $numberPrevMessages}
			</span>
		</div>
	</div>
</div>

<ImageViewer bind:show={showImageViewer} src={viewerImage} alt={viewerAlt} />
<FileViewer bind:show={showFileViewer} content={currentFileContent} filename={currentFileName} />

<style lang="scss">
	:global(h1) {
		font-size: 26px;
		margin: 0px 0 16px 0;
		padding: 0;
	}

	:global(h2) {
		font-size: 24px;
		margin: 32px 0 16px 0;
		padding: 0;
	}

	:global(h3, h4) {
		margin: 16px 0 8px 0;
		padding: 0;
	}

	:global(p) {
		margin: 0 0 10px 0;
		padding: 0;
	}

	:global(ul) {
		margin: 0 0 20px;
		padding: 0 0 0 26px;
		list-style-position: outside;
	}

	:global(ol) {
		margin: 0 0 20px;
		padding: 0 0 0 26px;
		list-style-position: outside;
	}

	:global(li) {
		margin: 8px 0;
		padding: 0;
		display: list-item;

		:global(p) {
			margin: 0 0 10px 0;
		}
	}

	:global(hr) {
		border: none;
		height: 1px;
		background-color: #e5e5e5;
		margin: 24px 0;
	}

	:global(table) {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		margin-bottom: 20px;
		border-radius: 10px;
		border: 1px solid var(--bg-color-light);
		overflow: hidden;
	}

	:global(thead) {
		background-color: var(--bg-color-light);
	}

	:global(th),
	:global(td) {
		border: 1px solid var(--bg-color-light);
		padding: 10px;
	}

	/* Main period rows */
	:global(tr:not([class^='sub-']) td:first-child) {
		font-weight: bold;
	}

	/* Sub-period rows (those with dashes) */
	:global(tr[class^='sub-']) :global(td:first-child) {
		padding-left: 30px;
		color: #333;
	}

	::-webkit-scrollbar {
		width: 3px;
	}

	.context-window-sidebar {
		position: fixed;
		top: 0;
		left: 0;
		width: 300px;
		height: 100%;
		background: var(--bg-color-conversations);
		box-shadow:
			0 0 #0000,
			0 0 #0000,
			0 9px 9px 0px rgba(0, 0, 0, 0.01),
			0 2px 5px 0px rgba(0, 0, 0, 0.06);
		z-index: 10000;
		display: flex;
		flex-direction: column;
		font-family:
			ui-sans-serif,
			-apple-system,
			system-ui,
			Segoe UI,
			Helvetica,
			Arial,
			sans-serif;
		box-sizing: border-box;

		* {
			box-sizing: border-box;
		}

		.header {
			display: flex;
			flex-direction: column;
			border-bottom: 1px solid var(--bg-color-light);
			width: 100%;

			.header-top {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 20px;
				width: 100%;

				h2 {
					margin: 0;
					font-size: 22px;
					font-weight: 500;
					color: var(--text-color);
				}

				.close-button {
					background: none;
					border: none;
					font-size: 24px;
					color: var(--text-color-light);
					cursor: pointer;
					padding: 0;
					width: 24px;
					height: 24px;
					display: flex;
					align-items: center;
					justify-content: center;

					&:hover {
						color: var(--text-color);
					}
				}
			}

			.header-details {
				padding: 0 20px 15px;
				width: 100%;

				h2 {
					font-size: 14px;
					margin: 15px 0;
					width: 100%;

					span {
						font-weight: 300;
						font-size: 12px;
					}
				}

				button {
					margin: 0;
					padding: 0;
					border: none;
					background: none;
					cursor: pointer;
				}

				.instructions-dropdown {
					margin: 5px 0 15px 0;
					width: 100%;

					.dropdown-toggle {
						width: 100%;
						background: none;
						border: none;
						color: var(--text-color);
						cursor: pointer;
						text-align: left;
						font-size: 14px;
						font-weight: 500;
						display: flex;
						align-items: center;

						&:hover {
							text-decoration: underline;
						}
					}

					.instructions-content {
						padding: 0;
						margin-top: 15px;
						width: 100%;
					}
				}

				.slider-container {
					padding: 0;
					display: flex;
					align-items: center;
					width: 100%;
					gap: 10px;
					--track-bgcolor: var(--text-color-light-opacity);
					--track-highlight-bg: linear-gradient(
						90deg,
						var(--text-color),
						var(--text-color-light)
					);
					--tooltip-bgcolor: var(--text-color);
					--tooltip-bg: linear-gradient(
						90deg,
						var(--text-color),
						var(--text-color-light)
					);
					--tooltip-text: var(--bg-color);

					:global(.slider) {
						flex: 1;
					}

					p {
						min-width: 10px;
						text-align: center;
						margin: 0;
					}
				}

				.shortcut {
					display: flex;
					align-items: center;
					margin: 15px 0;
					width: 100%;
					gap: 10px;

					h1,
					p {
						padding: 0;
						margin: 0;
						font-weight: 400;
					}

					h1 {
						font-size: 14px;
					}

					p {
						font-size: 12px;
					}
				}
			}
		}

		.context-container {
			flex: 1;
			overflow-y: auto;
			padding: 15px;
			margin: 0;
			width: 100%;

			.message-item {
				margin-bottom: 12px;
				border-radius: 8px;
				width: 100%;
				overflow: hidden;
				box-shadow:
					0 0 #0000,
					0 0 #0000,
					0 9px 9px 0px rgba(0, 0, 0, 0.01),
					0 2px 5px 0px rgba(0, 0, 0, 0.06);

				.message-header {
					display: flex;
					align-items: center;
					padding: 10px 12px;
					width: 100%;
					background: var(--bg-color-dark);
					border-bottom: 1px solid var(--bg-color-light-alt);

					.role-icon {
						margin-right: 8px;
						font-size: 14px;
					}

					.user-icon {
						margin-right: 8px;
						font-size: 14px;
					}

					.model-icon {
						width: 18px;
						height: 18px;
						margin-right: 8px;
						display: flex;
						align-items: center;
						justify-content: center;

						img {
							width: 100%;
							height: 100%;
							object-fit: contain;
						}
					}

					.role-label {
						font-weight: 500;
						font-size: 14px;
						text-transform: capitalize;
						color: var(--text-color);
						margin-right: auto;
					}

					.message-number {
						font-size: 12px;
						color: var(--text-color-light);
					}
				}

				.message-content {
					padding: 10px 12px;
					font-size: 13px;
					line-height: 1.5;
					color: var(--text-color);
					background: var(--bg-color);
					max-height: 300px;
					width: 100%;
					overflow-x: hidden;
					word-break: break-word;

					p {
						margin: 0;
						padding: 0;
						font-size: 14px;
						max-height: 300px;
						overflow-y: auto;
						font-weight: 300;
						line-height: 30px;
						font-family: 'Albert Sans', sans-serif;
					}
				}

				&.user-message {
					.message-header {
						background: var(--bg-color);
					}
				}

				&.assistant-message {
					.message-header {
						background: var(--bg-color);
					}
				}

				&.developer-message {
					border-left: 3px solid #d97706;

					.message-header {
						background: rgba(217, 119, 6, 0.1);
					}
				}

				.user-attachments {
					display: flex;
					flex-wrap: wrap;
					gap: 8px;
					margin-bottom: 10px;
					width: 100%;
				}

				.user-image-container {
					max-width: 100px;
					max-height: 100px;
					overflow: hidden;
					border-radius: 4px;
					cursor: pointer;

					img {
						width: 100%;
						height: 100%;
						object-fit: cover;
					}
				}

				.user-file-container {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 6px 10px;
					// background: var(--bg-color-light);
					border-radius: 4px;
					cursor: pointer;
					width: 110px;
					transition: all 0.2s ease-in-out;
					border: 1px solid var(--bg-color-light);
					box-shadow:
						0 0 #0000,
						0 0 #0000,
						0 9px 9px 0px rgba(0, 0, 0, 0.01),
						0 2px 5px 0px rgba(0, 0, 0, 0.06);

					&:hover {
						transform: translateY(-1px);
					}

					.file-info {
						display: flex;
						align-items: center;
						gap: 8px;
						max-width: 100%;
						overflow: hidden;

						.file-icon {
							min-width: 24px;
							height: 24px;
							border-radius: 4px;
							display: flex;
							align-items: center;
							justify-content: center;

							.file-type {
								font-size: 10px;
								font-weight: 600;
								color: white;
							}
						}

						.file-name {
							font-size: 12px;
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
							max-width: 140px;
						}
					}
				}
			}
		}

		.footer {
			padding: 12px 20px;
			border-top: 1px solid var(--bg-color-light);
			font-size: 12px;
			color: var(--text-color-light);
			width: 100%;

			.token-info {
				display: flex;
				justify-content: space-between;
				width: 100%;
			}
		}
	}

	@media (max-width: 810px) {
		.context-window-sidebar {
			width: 280px;
		}
	}
</style>
