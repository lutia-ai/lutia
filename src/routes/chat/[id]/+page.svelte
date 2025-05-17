<script lang="ts">
	import { onMount, tick } from 'svelte'
	import 'katex/dist/katex.min.css';
	import synthMidnightTerminalDark from 'svelte-highlight/styles/synth-midnight-terminal-dark';
	import atomOneLight from 'svelte-highlight/styles/atom-one-light';
	import {
		chatHistory,
		chosenCompany,
		isSettingsOpen,
		isSidebarOpen,
		gptModelSelection,
		darkMode,
		isDragging
	} from '$lib/stores.ts';
	import type {
		SerializedApiRequest,
	} from '$lib/types/types.js';
	import { modelDictionary } from '$lib/models/modelDictionary';
	import ErrorPopup from '$lib/components/notifications/ErrorPopup.svelte';
	import NotificationPopup from '$lib/components/notifications/NotificationPopup.svelte';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import FileViewer from '$lib/components/FileViewer.svelte';
	import {
		handleKeyboardShortcut,
		loadChatHistory,
	} from '$lib/components/chat-history/utils/chatHistory.js';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import { afterNavigate } from '$app/navigation';
	import PromptBar from '$lib/components/prompt-bar/PromptBar.svelte';
	import ChatHistory from '$lib/components/chat-history/ChatHistory.svelte';
	import { submitPrompt, scrollLastMessageIntoView } from '$lib/components/prompt-bar/utils/submitPrompt.js';
	import { closeAllTabWidths } from '$lib/components/chat-history/utils/codeContainerUtils.js';
	import { saveUserSettings } from '$lib/components/settings/utils/settingsUtils.js';
    
	export let data;

	let viewerImage = '';
	let viewerAlt = '';
	let showImageViewer = false;
	let errorPopup: ErrorPopup;
	let notificationPopup: NotificationPopup;
	let mounted: boolean = false;
	let promptBarHeight: number = 0;
	let scrollAnimationFrame: number | null = null;
	let isScrollingProgrammatically = false;

	// File viewer state
	let showFileViewer = false;
	let currentFileContent = '';
	let currentFileName = '';

	gptModelSelection.set(Object.values(modelDictionary[$chosenCompany].models));

	$: if (promptBarHeight) {
		if (isAtBottom()) {
			scrollToBottom();
		}
	}

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

	// Refactored to handle submission from PromptBar component
	async function handleSubmitPrompt(event: CustomEvent): Promise<void> {
		const { prompt: plainText, images: imageArray, fileAttachments: fileArray, reasoningOn: reasoning } = event.detail;
		
        // Scroll to the last message
        scrollLastMessageIntoView();
		// Use the new submitPrompt function
		await submitPrompt(
			plainText,
			imageArray,
			fileArray,
			reasoning,
			(message, subText, duration, type) => errorPopup.showError(message, subText, duration, type as 'error' | 'success' | undefined),
			(title, message, duration, type) => notificationPopup.showNotification(title, message, duration, type as 'success' | 'info' | undefined)
		);
		
	}

	// Function to handle notification from PromptBar
	function handleNotification(event: CustomEvent): void {
		const { title, message, duration, type } = event.detail;
		notificationPopup.showNotification(title, message, duration, type);
	}

	afterNavigate(async ({ from, to }) => {
		// Only reload if we've actually changed conversations
		if (to && from?.url.pathname !== to.url.pathname) {
			const apiRequests = (await data.apiRequests) as SerializedApiRequest[];
			chatHistory.set(loadChatHistory(apiRequests));

			// Reset other state as needed
			await tick();
			setTimeout(() => {
				scrollToBottom();
			}, 100);
		}
	});

	onMount(async () => {
		const successParam = $page.url.searchParams.get('success');
		if (successParam && errorPopup) {
			if (successParam === 'AccountLinkSuccess') {
				const message = 'Linked accounts successfully!';
				errorPopup.showError(message, null, 5000, 'success');
			}
		}
		const id = $page.params.id;
		const apiRequests = (await data.apiRequests) as SerializedApiRequest[];
		chatHistory.set(loadChatHistory(apiRequests));
		
		// Wait for DOM update after setting chat history
		await tick();

		// Add a small delay to ensure content is fully rendered
		setTimeout(() => {
			scrollToBottom();
		}, 100);
		mounted = true;
	});

	// Add missing scrollToBottom function
	function scrollToBottom() {
		// Cancel any ongoing animation frame
		if (scrollAnimationFrame !== null) {
			cancelAnimationFrame(scrollAnimationFrame);
		}

		isScrollingProgrammatically = true;

		// Smooth scrolling function
		const scrollStep = function () {
			const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
			const targetPosition = document.documentElement.scrollHeight;
			const distanceToScroll = targetPosition - currentScrollPosition - window.innerHeight;

			// Check if the end is reached, we can stop scrolling
			if (distanceToScroll > 0 && isScrollingProgrammatically) {
				// Calculate a variable scroll distance, using easing
				const scrollDistance = Math.min(
					distanceToScroll,
					Math.max(1, distanceToScroll / 20)
				); // Dynamic distance based on remaining distance

				window.scrollBy(0, scrollDistance);
				scrollAnimationFrame = requestAnimationFrame(scrollStep);
			} else {
				// Clear frame if finished
				scrollAnimationFrame = null;
			}
		};

		// Initiate the scroll
		scrollStep();
	}

	// Update isAtBottom to focus only on scroll position and not reference removed variables
	function isAtBottom(): boolean {
		const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
		const windowHeight = window.innerHeight;
		const documentHeight = document.documentElement.scrollHeight;
		
		// Check if we're near the bottom (within 100px)
		return documentHeight - (currentScrollPosition + windowHeight) < 100;
	}
</script>

<svelte:head>
	{@html $darkMode ? synthMidnightTerminalDark : atomOneLight}
	<title>Chat | Lutia</title>
</svelte:head>

<svelte:window
	on:click|stopPropagation={() => {
		closeAllTabWidths();
	}}
	on:keydown={(e) => {
		handleKeyboardShortcut(e);
		saveUserSettings(data.user.user_settings ?? {});
	}}
	on:dragover|preventDefault={() => {
		isDragging.set(true);
	}}
/>

<ErrorPopup bind:this={errorPopup} />
<NotificationPopup bind:this={notificationPopup} />
<ImageViewer src={viewerImage} alt={viewerAlt} bind:show={showImageViewer} />
<FileViewer content={currentFileContent} filename={currentFileName} bind:show={showFileViewer} />

<div
	class="main"
	class:settings-open={$isSettingsOpen}
>
	<div
		class="body"
		class:shifted={$isSidebarOpen}
		role="region"
	>
		{#await data.apiRequests}
			{#if !mounted}
				<div class="loading-container" transition:fade={{ duration: 300 }}>
					<div class="loader"></div>
				</div>
			{/if}
		{:then}
			{#if mounted}
				<ChatHistory
					openImageViewer={openImageViewer}
					openFileViewer={openFileViewer}
					promptBarHeight={promptBarHeight}
				/>
			{/if}
		{:catch error}
			<p>error loading: {error.message}</p>
		{/await}

		<PromptBar
			user={data.user}
			on:submit={handleSubmitPrompt}
			on:viewImage={({ detail }) => openImageViewer(detail.src, detail.alt)}
			on:viewFile={({ detail }) => openFileViewer(detail.content, detail.filename)}
			on:resize={(e) => promptBarHeight = e.detail.height}
			on:notification={handleNotification}
		/>
	</div>
</div>

<style lang="scss">
	.settings-open {
		height: 100vh !important;
	}

	.main {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 90vh;
		min-width: 450px;
		font-family: 'Albert Sans', sans-serif;

		.body {
			position: relative;
			display: flex;
			flex-direction: column;
			min-height: 90vh;
			transition: margin-left 0.3s ease;

			&.shifted {
				margin-left: 300px; /* 300px (conversations sidebar) + 65px (main sidebar) */
			}

			background: var(--bg-color);
			z-index: 1000;
			display: flex;
			flex-direction: column;
			box-sizing: border-box;
			padding-left: 60px;

			.loading-container {
				margin: auto;
				max-width: 350px;
				max-height: 350px;
				width: 4vw;
				height: 4vw;
				min-width: 50px;
				min-height: 50px;
				border-radius: 100%;
				background: linear-gradient(
					165deg,
					rgba(255, 255, 255, 1) 0%,
					rgb(220, 220, 220) 40%,
					rgb(170, 170, 170) 98%,
					rgb(10, 10, 10) 100%
				);
				position: relative;
			}

			.loader:before {
				position: absolute;
				content: '';
				width: 100%;
				height: 100%;
				border-radius: 100%;
				border-bottom: 0 solid #ffffff05;

				box-shadow:
					0 -10px 20px 20px #ffffff40 inset,
					0 -5px 15px 10px #ffffff50 inset,
					0 -2px 5px #ffffff80 inset,
					0 -3px 2px #ffffffbb inset,
					0 2px 0px #ffffff,
					0 2px 3px #ffffff,
					0 5px 5px #ffffff90,
					0 10px 15px #ffffff60,
					0 10px 20px 20px #ffffff40;
				filter: blur(3px);
				animation: 2s rotate linear infinite;
			}

			@keyframes rotate {
				100% {
					transform: rotate(360deg);
				}
			}
		}
	}

	@media (max-width: 810px) {
		.main {
			.body {
				padding-left: 0;

				&.shifted {
					margin-left: 0px;
				}
			}
		}
	}
</style>
