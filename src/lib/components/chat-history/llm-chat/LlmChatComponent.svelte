<script lang="ts">
	import { chatHistory } from '$lib/stores';
	import {
		isLlmChatComponent,
		isModelAnthropic,
		isModelDeepSeek,
		isModelGoogle,
		isModelOpenAI,
		isModelXAI
	} from '$lib/types/typeGuards';
	import type { LlmChat } from '$lib/types/types';
	import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
	import GrokIcon from '$lib/components/icons/GrokIcon.svelte';
	import DeepSeekIcon from '$lib/components/icons/DeepSeekIcon.svelte';
	import Reasoning from './Reasoning.svelte';
	import {
		processLinks,
		sanitizeLLmContent
	} from '$lib/components/chat-history/utils/chatHistory';
	import marked from '$lib/utils/marked-extensions';
	import CodeContainer from '$lib/components/chat-history/llm-chat/CodeContainer.svelte';
	import ChatToolbar from '../chat-toolbar/ChatToolbar.svelte';
	import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';
	import ClaudeIcon from '$lib/images/claude.png';

	export let chatIndex: number;
	export let chat: LlmChat;
	export let openImageViewer: (image: string, alt: string) => void;
</script>

<div
	class="llm-container"
	style={chatIndex === $chatHistory.length - 1 ? `min-height: 45vh` : 'min-height: 0'}
>
	{#if isLlmChatComponent(chat)}
		{#if isModelAnthropic(chat.by)}
			<div class="llm-icon-container {chat.loading ? 'rotateLoading' : ''}">
				<img src={ClaudeIcon} alt="Claude's icon" />
			</div>
		{:else if isModelOpenAI(chat.by)}
			<div class="gpt-icon-container {chat.loading ? 'rotateLoading' : ''}">
				<ChatGPTIcon color="var(--text-color)" width="22px" height="22px" />
			</div>
		{:else if isModelGoogle(chat.by)}
			<div class="llm-icon-container {chat.loading ? 'rotateLoading' : ''}">
				<GeminiIcon />
			</div>
		{:else if isModelXAI(chat.by)}
			<div class="llm-icon-container">
				<GrokIcon color="var(--text-color)" />
			</div>
		{:else if isModelDeepSeek(chat.by)}
			<div class="deepseek-icon-container">
				<DeepSeekIcon />
			</div>
		{/if}
	{/if}
	<div class="llm-chat">
		{#if isLlmChatComponent(chat)}
			{#if chat.reasoning && chat.reasoning.content !== ''}
				<Reasoning reasoning={chat.reasoning.content} />
			{/if}
			{#each chat.components || [] as component, componentIndex}
				{#if component.type === 'text'}
					<p class="content-paragraph">
						{@html processLinks(
							marked(
								component.type === 'text'
									? sanitizeLLmContent(component.content)
									: ''
							)
						)}
					</p>
				{:else if component.type === 'code'}
					<CodeContainer
						code={component.code}
						language={component.language}
						tabWidth={component.tabWidth}
						{chatIndex}
						{componentIndex}
					/>
				{:else if component.type === 'image'}
					<div
						class="image-container"
						on:click={() => openImageViewer(component.data, 'AI generated image')}
						on:keydown={(e) =>
							e.key === 'Enter' &&
							openImageViewer(component.data, 'AI generated image')}
						role="button"
						tabindex="0"
					>
						<img src={component.data} alt="AI generated" />
					</div>
				{/if}
			{/each}
			{#if chat.loading}
				<span class="gpt-loading-dot" />
			{/if}
			{#if !chat.loading}
				<div class="chat-toolbar-container">
					<ChatToolbar {chatIndex} {chat} />
				</div>
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	.llm-container {
		position: relative;
		display: flex;
		gap: 20px;
		width: 100%;
		box-sizing: border-box;
		max-width: 850px;
		margin-left: auto;
		margin-right: auto;

		// Add this condition to set min-height when loading
		&:last-child:has(.gpt-loading-dot) {
			min-height: 80vh;
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

		.gpt-icon-container {
			position: relative;
			width: 22px;
			height: 22px;
			display: flex;
			border-radius: 50%;
			padding: 4px;
			border: 1px solid var(--text-color-light-opacity);
		}

		.deepseek-icon-container {
			position: relative;
			width: 32px;
			height: 32px;
			display: flex;
			border-radius: 50%;
		}

		.llm-icon-container {
			position: relative;
			display: flex;
			width: 28px;
			height: 28px;
			padding-top: 4px;
			flex: 1;
		}

		.llm-chat {
			position: relative;
			width: calc(100% - 50px);
			padding: 3px 0px;
			box-sizing: border-box;

			&:hover {
				.chat-toolbar-container {
					opacity: 1;
				}
			}

			.chat-toolbar-container {
				opacity: 0;
				transition: all 0.3s ease-in-out;
			}

			.content-paragraph {
				display: flex;
				flex-direction: column;
				font-weight: 300;
				line-height: 30px;
				width: max-content;
				max-width: 100%;
				overflow-y: hidden;
				overflow-x: hidden !important;

				:global(code) {
					background: var(--bg-color-code);
					color: var(--text-color);
					padding: 5px 5px;
					margin: 0 5px;
					border-radius: 5px;
				}

				&::-webkit-scrollbar {
					height: 10px;
				}

				/* Scrollbar handle */
				&::-webkit-scrollbar-thumb {
					background-color: #888;
					border-radius: 6px;
				}

				/* Scrollbar track background */
				&::-webkit-scrollbar-track {
					background-color: var(--bg-color-light);
				}
			}

			.image-container {
				position: relative;
				width: 100%;
				height: 100%;
				border-radius: 10px;
				overflow: hidden;
				cursor: pointer;
				transition: transform 0.2s ease;

				&:hover {
					transform: translateY(-2px);
				}

				img {
					width: 100%;
					height: 100%;
				}
			}
		}

		.rotateLoading {
			animation: rotation 2s infinite linear;
		}

		@keyframes rotation {
			from {
				transform: rotate(0deg);
			}
			to {
				transform: rotate(360deg);
			}
		}
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

	@media (max-width: 810px) {
		.llm-container {
			gap: 10px;

			.llm-icon-container {
				img {
					width: 100%;
				}
			}

			.llm-chat {
				flex: 10;
			}

			.gpt-icon-container {
				position: relative;
				width: 20px;
				height: 20px;
				display: flex;
				border-radius: 50%;
				padding: 2px;
				padding-top: 0px;
				margin-top: 6px;
				border: none;
			}

			.deepseek-icon-container {
				position: relative;
				width: 28px;
				height: 28px;
				display: flex;
				border-radius: 50%;
				padding-top: 4px;
			}

			.llm-icon-container {
				width: 24px;
				height: 24px;
				flex: none;
				padding-top: 5px;
			}
		}
	}
</style>
