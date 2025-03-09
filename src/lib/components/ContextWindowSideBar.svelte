<script lang="ts">
	import type { Message } from '$lib/types';
	import { fly } from 'svelte/transition';
	import Slider from './Slider.svelte';
	import { chatHistory, numberPrevMessages } from '$lib/stores';
	import { saveUserSettings } from '$lib/chatHistory';

	// Props
	export let contextWindowOpen: boolean;
	export let fullPrompt: Message[] | string;

	// Format the content for display
	function formatContent(content: string | Object[]): string {
		if (typeof content === 'string') {
			return content;
		} else {
			return JSON.stringify(content, null, 2);
		}
	}

	// // handles the save user settings from the slider change
	// function handleSaveSettings() {
	// 	saveUserSettings(user.user_settings!);
	// }

	// Determine role style classes and icons
	function getRoleDetails(role: string) {
		switch (role) {
			case 'user':
				return {
					className: 'user-message',
					icon: '👤'
				};
			case 'assistant':
				return {
					className: 'assistant-message',
					icon: '🤖'
				};
			case 'developer':
				return {
					className: 'developer-message',
					icon: '👨‍💻'
				};
			default:
				return {
					className: 'unknown-message',
					icon: '❓'
				};
		}
	}

	$: {
		console.log($chatHistory.length);
		console.log($numberPrevMessages);
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
		<h2>Context Window</h2>
		<button class="close-button" on:click|stopPropagation={() => (contextWindowOpen = false)}>
			×
		</button>
	</div>

	<div class="details">
		<h2>
			The context window adjusts how many of your previous messages will get sent with your
			prompt.<br /><br />
			<span
				>The more previous messages you include, the more memory the AI will have of your
				conversation, but the higher the cost of each message.</span
			>
		</h2>
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

	<div class="context-container">
		{#if typeof fullPrompt === 'string'}
			<!-- Add proper formatting for the string case -->
			<div class="message-item user-message">
				<div class="message-header">
					<span class="role-icon">👤</span>
					<span class="role-label">User</span>
					<span class="message-number">Current prompt</span>
				</div>
				<div class="message-content">
					<pre>{fullPrompt}</pre>
				</div>
			</div>
		{:else}
			{#each fullPrompt as message, index}
				{@const roleDetails = getRoleDetails(message.role)}
				<div class="message-item {roleDetails.className}">
					<div class="message-header">
						<span class="role-icon">{roleDetails.icon}</span>
						<span class="role-label">{message.role}</span>
						<span class="message-number">
							{message.role === 'user'
								? index === fullPrompt.length - 1
									? 'Current prompt'
									: `Prompt ${Math.floor(index / 2) + 1}`
								: `Response ${Math.floor(index / 2) + 1}`}
						</span>
					</div>
					<div class="message-content">
						<pre>{formatContent(message.content)}</pre>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<div class="footer">
		<div class="token-info">
			<span>
				Context window: {Array.isArray(fullPrompt)
					? fullPrompt.filter((message) => message.role === 'assistant').length
					: 0}
			</span>
		</div>
	</div>
</div>

<style lang="scss">
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

		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 25px 20px;
			border-bottom: 1px solid var(--bg-color-light);

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

		.details {
			padding: 0px 15px;

			h2 {
				font-size: 14px;

				span {
					font-weight: 300;
					font-size: 12px;
				}
			}

			.slider-container {
				padding: 0 !important;
				display: flex;
				gap: 25px;
				--track-bgcolor: var(--text-color-light-opacity);
				--track-highlight-bg: linear-gradient(
					90deg,
					var(--text-color),
					var(--text-color-light)
				);
				--tooltip-bgcolor: var(--text-color);
				--tooltip-bg: linear-gradient(90deg, var(--text-color), var(--text-color-light));
				--tooltip-text: var(--bg-color);
			}
		}

		.shortcut {
			display: flex;
			gap: 15px;
			margin-bottom: 15px;

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
				margin: auto 0;
			}
		}

		.context-container {
			flex: 1;
			overflow-y: auto;
			padding: 10px;
			margin-top: 10px;

			.message-item {
				margin-bottom: 12px;
				border-radius: 8px;
				background: var(--bg-color-light);
				overflow: hidden;

				.message-header {
					display: flex;
					align-items: center;
					padding: 10px 12px;
					background: var(--bg-color-dark);
					border-bottom: 1px solid var(--bg-color-light-alt);

					.role-icon {
						margin-right: 8px;
						font-size: 14px;
					}

					.role-label {
						font-weight: 500;
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

					pre {
						white-space: pre-wrap;
						word-break: break-word;
						margin: 0;
						font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
							monospace;
						font-size: 12px;
						max-height: 300px;
						overflow-y: auto;
					}
				}

				&.user-message {
					border-left: 3px solid #4f46e5;

					.message-header {
						background: rgba(79, 70, 229, 0.1);
					}
				}

				&.assistant-message {
					border-left: 3px solid #059669;

					.message-header {
						background: rgba(5, 150, 105, 0.1);
					}
				}

				&.developer-message {
					border-left: 3px solid #d97706;

					.message-header {
						background: rgba(217, 119, 6, 0.1);
					}
				}
			}
		}

		.footer {
			padding: 12px 16px;
			border-top: 1px solid var(--bg-color-light);
			font-size: 12px;
			color: var(--text-color-light);

			.token-info {
				display: flex;
				justify-content: space-between;
			}
		}
	}

	@media (max-width: 810px) {
		.context-window-sidebar {
			width: 280px;
		}
	}
</style>
