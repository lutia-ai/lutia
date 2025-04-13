<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import { marked } from 'marked';
	import markedKatex from 'marked-katex-extension';
	import 'katex/dist/katex.min.css';
	import synthMidnightTerminalDark from 'svelte-highlight/styles/synth-midnight-terminal-dark';
	import atomOneLight from 'svelte-highlight/styles/atom-one-light';
	import {
		chatHistory,
		numberPrevMessages,
		chosenCompany,
		isContextWindowAuto,
		chosenModel,
		fullPrompt,
		isLargeScreen,
		isSettingsOpen,
		conversationsOpen,
		companySelection,
		gptModelSelection,
		conversationId,
		contextWindowOpen,
		mobileSidebarOpen,
		darkMode
	} from '$lib/stores.ts';
	import type {
		Message,
		Image,
		Model,
		UserChat,
		Component,
		SerializedApiRequest,
		ReasoningComponent,
		FileAttachment
	} from '$lib/types';
	import { sanitizeHtml, generateFullPrompt } from '$lib/promptFunctions.ts';
	import { modelDictionary } from '$lib/modelDictionary.ts';
	import {
		calculateClaudeImageCost,
		calculateGptVisionPricing,
		countTokens,
		roundToTwoSignificantDigits
	} from '$lib/tokenizer.ts';
	import {
		isLlmChatComponent,
		isModelAnthropic,
		isModelDeepSeek,
		isModelGoogle,
		isModelOpenAI,
		isModelXAI,
		isUserChatComponent
	} from '$lib/utils/typeGuards';
	import ErrorPopup from '$lib/components/ErrorPopup.svelte';
	import NotificationPopup from '$lib/components/NotificationPopup.svelte';
	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
	import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
	import ClaudeIcon from '$lib/images/claude.png';
	import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';
	import CopyIcon from '$lib/components/icons/CopyIcon.svelte';
	import CopyIconFilled from '$lib/components/icons/CopyIconFilled.svelte';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import ArrowIcon from '$lib/components/icons/Arrow.svelte';
	import DropdownIcon from '$lib/components/icons/DropdownIcon.svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import ImageIcon from '$lib/components/icons/ImageIcon.svelte';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import FileViewer from '$lib/components/FileViewer.svelte';
	import {
		changeTabWidth,
		closeAllTabWidths,
		copyToClipboard,
		formatModelEnumToReadable,
		handleKeyboardShortcut,
		loadChatHistory,
		parseMessageContent,
		regenerateMessage,
		sanitizeLLmContent,
		saveUserSettings,
		updateChatHistoryToCopiedState
	} from '$lib/chatHistory.js';
	import { page } from '$app/stores';
	import { PaymentTier, type ApiProvider } from '@prisma/client';
	import { fade } from 'svelte/transition';
	import GrokIcon from '$lib/components/icons/GrokIcon.svelte';
	import DeepSeekIcon from '$lib/components/icons/DeepSeekIcon.svelte';
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import HoverTag from '$lib/components/HoverTag.svelte';
	import BrainIcon from '$lib/components/icons/BrainIcon.svelte';
	import WarningIcon from '$lib/components/icons/WarningIcon.svelte';
	import { afterNavigate, pushState } from '$app/navigation';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';
	import {
		getFileIcon,
		getFileIconColor,
		scrollCursorIntoView
	} from '$lib/utils/fileHandling.js';
	import { processFileSelect } from '$lib/utils/fileHandling';

	export let data;

	// Add state for image viewer
	let viewerImage = '';
	let viewerAlt = '';
	let showImageViewer = false;
	let errorPopup: ErrorPopup;
	let notificationPopup: NotificationPopup;
	let prompt: string;
	let input_tokens: number = 0;
	let input_price: number = 0;
	let mounted: boolean = false;
	let placeholderVisible: boolean = true;
	let promptBar: HTMLDivElement;
	let promptBarHeight: number = 0;
	let scrollAnimationFrame: number | null = null;
	let isDragging: boolean = false;
	let fileInput: HTMLInputElement;
	let imagePreview: Image[] = [];
	let fileAttachments: FileAttachment[] = [];
	let showModelSearch = false;
	let searchQuery = '';
	let filteredModels: { company: ApiProvider; model: Model; formattedName: string }[] = [];
	let selectedModelIndex: number | null = 0;
	let modelSearchItems: HTMLDivElement[] = [];
	let reasoningOn: boolean = false;
	let isScrollingProgrammatically = false;
	let lastScrollPos = 0;

	// File viewer state
	let showFileViewer = false;
	let currentFileContent = '';
	let currentFileName = '';

	gptModelSelection.set(Object.values(modelDictionary[$chosenCompany].models));

	const markedKatexOptions = markedKatex({
		throwOnError: false,
		displayMode: true,
		output: 'html'
	});

	marked.use(markedKatexOptions);

	// Generates the fullPrompt and counts input tokens when the prompt changes
	$: if (
		prompt ||
		prompt === '' ||
		$numberPrevMessages ||
		imagePreview ||
		fileAttachments ||
		$isContextWindowAuto
	) {
		if (mounted) {
			fullPrompt.set(sanitizeHtml(prompt));
			if ($numberPrevMessages > 0) {
				fullPrompt.set(
					generateFullPrompt(
						prompt,
						$chatHistory,
						$numberPrevMessages,
						$chosenModel,
						false,
						$isContextWindowAuto
					)
				);
				if (
					Array.isArray($fullPrompt) &&
					$fullPrompt.length === 1 &&
					$fullPrompt[0].content.length === 0
				) {
					fullPrompt.set(prompt);
				}
			}
			handleCountTokens($fullPrompt);
		}
	}

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

	function handleInput(event: Event & { currentTarget: EventTarget & HTMLDivElement }) {
		const target = event.currentTarget;
		const content = target.textContent || '';

		// Function to check if @ is valid (at start, after newline, or after whitespace)
		const isValidAtPosition = (str: string, atIndex: number): boolean => {
			if (atIndex === 0) return true; // @ at start
			const charBefore = str.charAt(atIndex - 1);
			// return charBefore === '\n' || charBefore === ' '; // @ after newline or space
			return true;
		};

		// Find all @ positions and check if any are valid
		const atIndices = [...content.matchAll(/@/g)].map((match) => match.index!);
		const hasValidAt = atIndices.some((index) => isValidAtPosition(content, index));

		if (hasValidAt) {
			showModelSearch = true;
			// Get the text after the last valid @
			const lastValidAtIndex = atIndices
				.filter((index) => isValidAtPosition(content, index))
				.pop();

			if (lastValidAtIndex !== undefined) {
				const afterAt = content.slice(lastValidAtIndex + 1);
				searchQuery = afterAt.trim().toLowerCase();

				// Filter models based on search query
				filteredModels = Object.entries(modelDictionary)
					.flatMap(([company, details]) => {
						if (!details || !details.models) return [];
						return Object.values(details.models).map((model) => ({
							company: company as ApiProvider,
							model: model as Model,
							formattedName: formatModelEnumToReadable((model as Model).name)
						}));
					})
					.filter(
						(item) =>
							item.formattedName.toLowerCase().includes(searchQuery) ||
							item.company.toLowerCase().includes(searchQuery)
					);

				if (filteredModels.length === 0) {
					showModelSearch = false;
				}
			}
		} else {
			showModelSearch = false;
		}

		placeholderVisible = false;
		promptBarHeight = promptBar.offsetHeight;
	}

	function selectModelFromSearch(company: ApiProvider, model: Model) {
		selectCompany(company);
		selectModel(model);
		showModelSearch = false;

		// Instead of replacing from the first @ to the end, only replace from the last @
		const lastAtIndex = prompt.lastIndexOf('@');
		if (lastAtIndex !== -1) {
			// Keep everything before the last @
			prompt = prompt.substring(0, lastAtIndex);
		}

		requestAnimationFrame(() => {
			promptBar.focus();
			// Set cursor to end of content
			const range = document.createRange();
			const selection = window.getSelection();
			if (selection) {
				range.selectNodeContents(promptBar);
				range.collapse(false); // false means collapse to end
				selection.removeAllRanges();
				selection.addRange(range);
			}
		});
	}

	async function handleCountTokens(fullPrompt: Message[] | string) {
		if ($chosenModel.generatesImages || fullPrompt === '<br>') {
			input_tokens = 0;
			input_price = 0;
			return;
		}
		const result = await countTokens(fullPrompt, $chosenModel);
		let imageCost = 0;
		let imageTokens = 0;
		for (const image of imagePreview) {
			let imgResult = { price: 0, tokens: 0 };
			if ($chosenCompany === 'openAI') {
				imgResult = calculateGptVisionPricing(image.width, image.height);
			} else if ($chosenCompany === 'anthropic' || $chosenCompany === 'google') {
				imgResult = calculateClaudeImageCost(image.width, image.height, $chosenModel);
			}
			imageCost += imgResult.price;
			imageTokens += imgResult.tokens;
		}
		input_tokens = result.tokens + imageTokens;
		input_price = result.price + imageCost;
	}

	function handlePaste(event: ClipboardEvent): string | undefined {
		event.preventDefault();
		if (!event.clipboardData) return;

		const text = event.clipboardData.getData('text/plain');

		// Use a single regex pass instead of multiple replacements
		let formattedText = text.replace(/[&<>]/g, (char) => {
			switch (char) {
				case '&':
					return '&amp;';
				case '<':
					return '&lt;';
				case '>':
					return '&gt;';
				default:
					return char;
			}
		});

		// Process line breaks and leading spaces with larger indentation
		formattedText = formattedText.replace(/^[ \t]+|(\n)[ \t]+/g, (match, newline) => {
			// Calculate how many indentation units we need
			const spaces = match.length;
			if (match.startsWith('\n')) {
				// For lines starting with newline, preserve the newline and add indentation
				return newline + '&nbsp;'.repeat(spaces * 4); // Multiplying by 4 for larger indentation
			}
			// For leading spaces, just add indentation
			return '&nbsp;'.repeat(spaces * 4); // Multiplying by 4 for larger indentation
		});

		// Replace all tabs with multiple spaces for better visibility
		formattedText = formattedText.replace(/\t/g, '&nbsp;'.repeat(4)); // 4 spaces per tab

		// Replace all newlines with <br> in a single operation
		formattedText = formattedText.replace(/\n/g, '<br>');

		return formattedText;
	}

	// Updates the chosen company and resets the model selection based on the new company.
	function selectCompany(company: ApiProvider) {
		chosenCompany.set(company);
		companySelection.set(Object.keys(modelDictionary) as ApiProvider[]);
		companySelection.set($companySelection.filter((c) => c !== company));
		gptModelSelection.set(Object.values(modelDictionary[$chosenCompany].models));
		chosenModel.set($gptModelSelection[0]);
	}

	// Updates the chosen model and resets the model selection list.
	function selectModel(model: Model) {
		chosenModel.set(model);
		gptModelSelection.set(Object.values(modelDictionary[$chosenCompany].models));
	}

	async function submitPrompt(): Promise<void> {
		if (prompt.length === 0 || prompt === '<br>') {
			return;
		}
		const plainText = prompt;
		const imageArray = $chosenModel.handlesImages ? imagePreview : [];
		const fileArray = fileAttachments;
		console.log(fileArray);
		prompt = '';
		imagePreview = $chosenModel.handlesImages ? [] : imagePreview;
		fileAttachments = [];
		handleCountTokens(prompt);
		if (plainText.trim()) {
			let userPrompt: UserChat = {
				by: 'user',
				text: plainText.trim(),
				attachments: [...imageArray, ...fileArray]
			};

			// Add user's message to chat history
			chatHistory.update((history) => [...history, userPrompt]);

			// Scroll the new message to the top after a brief delay to ensure DOM update
			setTimeout(() => {
				const chatMessages = document.querySelectorAll(
					'.user-chat-wrapper, .llm-container'
				);
				if (chatMessages.length > 0) {
					const lastMessage = chatMessages[chatMessages.length - 1];
					const offset = lastMessage.getBoundingClientRect().top + window.scrollY - 150; // 100px from top
					window.scrollTo({
						top: offset,
						behavior: 'smooth'
					});
				}
			}, 100);

			// Initialize AI's response in chat history
			chatHistory.update((history) => [
				...history,
				{
					by: $chosenModel.name,
					text: '',
					input_cost: 0,
					output_cost: 0,
					price_open: false,
					loading: true,
					copied: false
				}
			]);

			const currentChatIndex = $chatHistory.length - 1;

			try {
				const fullPrompt = generateFullPrompt(
					plainText,
					$chatHistory,
					$numberPrevMessages,
					$chosenModel,
					true,
					$isContextWindowAuto
				);
				// console.log(fullPrompt);

				// Get conversationId from slug parameter
				if (!$conversationId || $conversationId === 'new') {
					conversationId.set($page.params.id);
				}

				// UUID validation function
				const isValidUUID = (uuid: string) => {
					const uuidRegex =
						/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
					return uuidRegex.test(uuid);
				};

				// Only include conversationId if it's a valid UUID and user is premium
				const validConversationId =
					$conversationId && isValidUUID($conversationId) ? $conversationId : undefined;

				let uri: string;
				switch ($chosenCompany) {
					case 'anthropic':
						uri = '/api/claude';
						break;
					case 'openAI':
						uri = '/api/chatGPT';
						break;
					case 'meta':
						uri = '/api/llama';
						break;
					case 'xAI':
						uri = '/api/xAI';
						break;
					case 'deepSeek':
						uri = '/api/deepSeek';
						break;
					default:
						uri = '/api/gemini';
				}

				const response = await fetch(uri, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						plainTextPrompt: JSON.stringify(plainText),
						promptStr: JSON.stringify(fullPrompt),
						modelStr: JSON.stringify($chosenModel.name),
						imagesStr: JSON.stringify(imageArray),
						filesStr: JSON.stringify(fileArray),
						...($chosenCompany === 'anthropic' ? { reasoningOn } : {}),
						...(data.user.payment_tier === PaymentTier.Premium
							? { conversationId: validConversationId }
							: {})
					})
				});

				if (!response.ok) {
					const errorData = await response.clone().json();
					prompt = $chatHistory[$chatHistory.length - 2].text;
					chatHistory.update((history) => history.slice(0, -2));
					// Clone the response so that we can safely read it as JSON
					if (errorData.message === 'Insufficient balance') {
						errorPopup.showError(
							errorData.message,
							"Spending can't go below $0.10",
							5000,
							'error'
						);
					}
					throw new Error(errorData.message || 'An error occurred');
				}

				if (prompt.length === 0 || prompt === '<br>') placeholderVisible = true;

				if (!response.body) {
					throw new Error('Response body is null');
				}

				let inputPrice: number = 0;
				let outputPrice: number = 0;

				if ($chosenModel.generatesImages) {
					const data = await response.json();
					const base64ImageData = data.image;
					outputPrice = data.outputPrice;
					// Update only the AI's response in chat history
					chatHistory.update((history) =>
						history.map((msg, index) =>
							index === currentChatIndex
								? {
										...msg,
										text: '[AI Generated image]',
										components: [
											{
												type: 'image',
												data: 'data:image/png;base64,' + base64ImageData,
												media_type: 'image/png',
												width: 1024,
												height: 1024,
												ai: true
											}
										],
										input_cost: inputPrice,
										output_cost: outputPrice,
										loading: false
									}
								: msg
						)
					);
					return;
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let responseText = '';
				let reasoningText = '';
				let responseComponents: Component[] = [];
				let reasoningComponent: ReasoningComponent;
				let message_id: number;

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;

					// Decode the chunk
					const chunk = decoder.decode(value, { stream: true });

					// Process lines (each JSON object is on its own line)
					const lines = chunk.split('\n').filter((line) => line.trim());

					for (const line of lines) {
						try {
							const data = JSON.parse(line);
							// Handle different message types
							if (data.type === 'text') {
								responseText += data.content;
								responseComponents = parseMessageContent(responseText);
							} else if (data.type === 'reasoning') {
								reasoningText += data.content;
								reasoningComponent = {
									type: 'reasoning',
									content: reasoningText
								};
							} else if (data.type === 'usage') {
								inputPrice = data.usage.inputPrice;
								outputPrice = data.usage.outputPrice;
							} else if (data.type === 'request_info') {
								// Update the URL without reloading the page
								const url = new URL(window.location.href);
								url.pathname = `/chat/${data.conversation_id}`;

								// This updates the URL without causing a page reload
								pushState(url.toString(), {});
								conversationId.set(data.conversation_id);
							} else if (data.type === 'message_id') {
								message_id = data.message_id;
							} else if (data.type === 'error') {
								console.error(data.message);
								errorPopup.showError(data.message, null, 5000, 'error');
							}

							chatHistory.update((history) =>
								history.map((msg, index) =>
									index === currentChatIndex - 1
										? {
												...msg,
												message_id: message_id
											}
										: msg
								)
							);
							chatHistory.update((history) =>
								history.map((msg, index) =>
									index === currentChatIndex
										? {
												...msg,
												text: responseText,
												components: responseComponents,
												reasoning: reasoningComponent,
												message_id: message_id
											}
										: msg
								)
							);
						} catch (e) {
							console.error('Error parsing stream chunk:', e);
							// Continue with the next line if one fails to parse
						}
					}
				}

				let imageCost = 0;
				let imageTokens = 0;
				for (const image of imageArray) {
					let result;
					if ($chosenCompany === 'openAI') {
						result = calculateGptVisionPricing(image.width, image.height);
					} else {
						result = calculateClaudeImageCost(image.width, image.height, $chosenModel);
					}
					imageCost += result.price;
					imageTokens += result.tokens;
				}
				chatHistory.update((history) => {
					return history.map((item, index) => {
						if (index === currentChatIndex) {
							return {
								...item,
								input_cost: inputPrice + imageCost,
								output_cost: outputPrice,
								loading: false
							};
						}
						return item;
					});
				});
				promptBarHeight = promptBar.offsetHeight;
			} catch (error) {
				if (error instanceof Error) {
					console.error('Error:', error.message);
				} else {
					console.error('Error:', error); // Handle the case where the error is not an instance of Error
				}
				// Set loading to false in case of error
				chatHistory.update((history) => {
					return history.map((item, index) => {
						if (index === currentChatIndex) {
							return {
								...item,
								loading: false
							};
						}
						return item;
					});
				});
			}
		}
	}

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

	function handleScroll(): void {
		const currentScrollPos = window.pageYOffset || document.documentElement.scrollTop;

		// Check scroll direction
		if (currentScrollPos < lastScrollPos) {
			// Scrolling up, stop programmatic scrolling
			isScrollingProgrammatically = false;
		}

		lastScrollPos = currentScrollPos; // Update last scroll position
	}

	function isAtBottom(): boolean {
		const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
		const windowHeight = window.innerHeight;
		const documentHeight = document.documentElement.scrollHeight;

		// Check if we are at the bottom of the page
		return currentScrollPosition + windowHeight + 200 >= documentHeight;
	}

	function handleFileSelect(event: Event | any): void {
		if (isDragging) {
			isDragging = false;
		}

		processFileSelect(
			event,
			(newPreviews, newAttachments) => {
				imagePreview = [...imagePreview, ...newPreviews];
				fileAttachments = [...fileAttachments, ...newAttachments];
				if (fileInput) fileInput.value = '';
			},
			(title, message, duration, type) => {
				notificationPopup.showNotification(title, message, duration, type);
			}
		);
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
		if (promptBar) {
			// Get the height of the prompt bar
			promptBarHeight = promptBar.offsetHeight;
		}
		// Wait for DOM update after setting chat history
		await tick();

		// Add a small delay to ensure content is fully rendered
		setTimeout(() => {
			scrollToBottom();
		}, 100);
		mounted = true;
	});
</script>

<svelte:head>
	{@html $darkMode ? synthMidnightTerminalDark : atomOneLight}
	<title>Chat | Lutia</title>
</svelte:head>

<svelte:window
	on:click|stopPropagation={() => {
		closeAllTabWidths();
		showModelSearch = false;
		if (prompt.length === 0 || prompt === '<br>') {
			placeholderVisible = true;
		}
	}}
	on:scroll={() => {
		handleScroll();
	}}
	on:keydown={(e) => {
		handleKeyboardShortcut(e);
		saveUserSettings(data.user.user_settings ?? {});
	}}
	on:dragover|preventDefault={(event) => {
		event.preventDefault;
		isDragging = true;
	}}
/>

<ErrorPopup bind:this={errorPopup} />
<NotificationPopup bind:this={notificationPopup} />
<ImageViewer src={viewerImage} alt={viewerAlt} bind:show={showImageViewer} />
<FileViewer content={currentFileContent} filename={currentFileName} bind:show={showFileViewer} />

<div class="main" class:settings-open={$isSettingsOpen}>
	<div
		class="body"
		class:shifted={$conversationsOpen || $contextWindowOpen}
		role="region"
		on:dragover|preventDefault={(event) => {
			event.preventDefault;
			isDragging = true;
		}}
	>
		{#await data.apiRequests}
			{#if !mounted}
				<div class="loading-container" transition:fade={{ duration: 300 }}>
					<div class="loader"></div>
				</div>
			{/if}
		{:then}
			{#if mounted}
				{#if $chatHistory.length === 0}
					<div class="empty-content-options">
						<div class="logo-container">
							<!-- <img src={logo} alt="logo" /> -->
							<h1 class="animated-text">What can I help you with?</h1>
						</div>
					</div>
				{/if}
				<div
					transition:fade={{ duration: 300, delay: 300 }}
					class="chat-history"
					style="
                        padding-bottom: {400 + promptBarHeight * 0.3}px;
                    "
				>
					{#each $chatHistory as chat, chatIndex}
						{#if isUserChatComponent(chat) && chat.by === 'user'}
							<div class="user-chat-wrapper">
								{#if chat.attachments && chat.attachments.length > 0}
									<div class="user-images">
										{#each chat.attachments.filter((att) => att.type === 'image') as image}
											<div
												class="user-image-container"
												on:click={() =>
													openImageViewer(
														image.data,
														'User uploaded image'
													)}
												on:keydown={(e) =>
													e.key === 'Enter' &&
													openImageViewer(
														image.data,
														'User uploaded image'
													)}
												role="button"
												tabindex="0"
											>
												<img src={image.data} alt="User uploaded" />
											</div>
										{/each}
										{#each chat.attachments.filter((att) => att.type === 'file') as file}
											<div
												class="user-file-container"
												role="button"
												tabindex="0"
												on:click={() =>
													openFileViewer(file.data, file.filename)}
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
															>{getFileIcon(
																file.file_extension
															)}</span
														>
													</div>
													<span class="file-name">{file.filename}</span>
												</div>
											</div>
										{/each}
									</div>
								{/if}
								<div class="user-chat">
									<p>
										{@html chat.text}
									</p>
								</div>
							</div>
						{:else}
							<div
								class="llm-container"
								style={chatIndex === $chatHistory.length - 1
									? `min-height: 45vh`
									: 'min-height: 0'}
							>
								{#if isLlmChatComponent(chat)}
									{#if isModelAnthropic(chat.by)}
										<div
											class="llm-icon-container {chat.loading
												? 'rotateLoading'
												: ''}"
										>
											<img src={ClaudeIcon} alt="Claude's icon" />
										</div>
									{:else if isModelOpenAI(chat.by)}
										<div
											class="gpt-icon-container {chat.loading
												? 'rotateLoading'
												: ''}"
										>
											<ChatGPTIcon
												color="var(--text-color)"
												width="22px"
												height="22px"
											/>
										</div>
									{:else if isModelGoogle(chat.by)}
										<div
											class="llm-icon-container {chat.loading
												? 'rotateLoading'
												: ''}"
										>
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
											<p class="reasoning-paragraph">
												<span>Reasoning:</span>
												{@html marked(
													sanitizeLLmContent(chat.reasoning.content)
												)}
											</p>
										{/if}
										{#each chat.components || [] as component, componentIndex}
											{#if component.type === 'text'}
												<p class="content-paragraph">
													{@html marked(
														component.type === 'text'
															? sanitizeLLmContent(component.content)
															: ''
													)}
												</p>
											{:else if component.type === 'code'}
												<div class="code-container">
													<div class="code-header">
														<p>{component.language}</p>

														<div class="right-side-container">
															{#if component.tabWidth}
																<div
																	class="tab-width-container"
																	role="button"
																	tabindex="0"
																	on:click|stopPropagation={() =>
																		(component.tabWidthOpen = true)}
																	on:keydown|stopPropagation={(
																		e
																	) => {
																		if (e.key === 'Enter') {
																			component.tabWidthOpen = true;
																		}
																	}}
																>
																	<div class="dropdown-icon">
																		<DropdownIcon
																			color="rgba(255,255,255,0.65)"
																		/>
																	</div>
																	<p>
																		Tab width: {component.tabWidth}
																	</p>
																	{#if component.tabWidthOpen}
																		<div
																			class="tab-width-open-container"
																		>
																			{#each [2, 4, 6, 8] as tabWidth}
																				<div
																					role="button"
																					tabindex="0"
																					on:click|stopPropagation={() => {
																						component.code =
																							changeTabWidth(
																								component.code,
																								tabWidth
																							);
																						component.tabWidth =
																							tabWidth;
																						component.tabWidthOpen = false;
																					}}
																					on:keydown|stopPropagation={(
																						e
																					) => {
																						if (
																							e.key ===
																							'Enter'
																						) {
																							component.code =
																								changeTabWidth(
																									component.code,
																									tabWidth
																								);
																							component.tabWidth =
																								tabWidth;
																						}
																					}}
																				>
																					<p>
																						Tab width: {tabWidth}
																					</p>
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
																on:click={() => {
																	copyToClipboard(
																		component.code
																			? component.code
																			: ''
																	);
																	updateChatHistoryToCopiedState(
																		chatIndex,
																		componentIndex
																	);
																}}
																on:keydown|stopPropagation={(e) => {
																	if (e.key === 'Enter') {
																		copyToClipboard(
																			component.code
																				? component.code
																				: ''
																		);
																		updateChatHistoryToCopiedState(
																			chatIndex,
																			componentIndex
																		);
																	}
																}}
															>
																{#if component.copied}
																	<div class="tick-container">
																		<TickIcon
																			color="rgba(255,255,255,0.65)"
																		/>
																	</div>
																{:else}
																	<div
																		class="copy-icon-container"
																	>
																		<CopyIcon
																			color="rgba(255,255,255,0.65)"
																		/>
																	</div>
																{/if}
																<p>
																	{component.copied
																		? 'copied'
																		: 'copy'}
																</p>
															</div>
														</div>
													</div>
													<div class="code-content">
														<HighlightAuto
															code={component.code.trim()}
															let:highlighted
														>
															<LineNumbers
																{highlighted}
																--line-number-color={$darkMode
																	? 'rgba(255, 255, 255, 0.3)'
																	: 'rgba(0, 0, 0, 0.3)'}
																--border-color="rgba(255, 255, 255, 0.1)"
																--padding-left="1em"
																--padding-right="1em"
																--
																style="max-width: 100%; font-size: 13px; line-height: 19px;"
															/>
														</HighlightAuto>
													</div>
												</div>
											{:else if component.type === 'image'}
												<div
													class="image-container"
													on:click={() =>
														openImageViewer(
															component.data,
															'AI generated image'
														)}
													on:keydown={(e) =>
														e.key === 'Enter' &&
														openImageViewer(
															component.data,
															'AI generated image'
														)}
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
											<div
												class="chat-toolbar-container"
												style="opacity: {chat.price_open ? '1' : ''};"
											>
												<div
													class="toolbar-item"
													role="button"
													tabindex="0"
													on:click={() => {
														copyToClipboard(chat.text);
														updateChatHistoryToCopiedState(
															chatIndex,
															0
														);
													}}
													on:keydown|stopPropagation={(e) => {
														if (e.key === 'Enter') {
															copyToClipboard(chat.text);
															updateChatHistoryToCopiedState(
																chatIndex,
																0
															);
														}
													}}
												>
													{#if chat.copied}
														<TickIcon color="var(--text-color-light)" />
													{:else}
														<CopyIconFilled
															color="var(--text-color-light)"
														/>
													{/if}
													<HoverTag
														text={chat.copied ? 'copied' : 'copy'}
														position="bottom"
														distance={12}
													/>
												</div>
												<div
													class="toolbar-item"
													role="button"
													tabindex="0"
													on:click|stopPropagation={() => {
														chat.price_open = true;
													}}
													on:keydown|stopPropagation={(e) => {
														if (e.key === 'Enter') {
															chat.price_open = true;
														}
													}}
												>
													<DollarIcon color="var(--text-color-light)" />
													<HoverTag
														text={'View cost'}
														position="bottom"
														distance={12}
													/>
													{#if chat.price_open}
														<div class="price-open-container">
															<div class="price-record">
																<p>Input:</p>
																<span
																	>${roundToTwoSignificantDigits(
																		chat.input_cost
																	)}</span
																>
															</div>
															<div class="price-record">
																<p>Output:</p>
																<span
																	>${roundToTwoSignificantDigits(
																		chat.output_cost
																	)}</span
																>
															</div>
															<div class="price-record">
																<p>Total:</p>
																<span
																	>${roundToTwoSignificantDigits(
																		chat.input_cost +
																			chat.output_cost
																	)}</span
																>
															</div>
														</div>
													{/if}
												</div>
												<div
													class="toolbar-item refresh-button"
													role="button"
													tabindex="0"
													on:click|stopPropagation={async () => {
														await regenerateMessage(
															chat.message_id ?? 0
														);
													}}
													on:keydown|stopPropagation={async (e) => {
														if (e.key === 'Enter') {
															await regenerateMessage(
																chat.message_id ?? 0
															);
														}
													}}
												>
													<div class="icon">
														<RefreshIcon
															color="var(--text-color-light)"
														/>
													</div>
													<span class="model-name"
														>{formatModelEnumToReadable(chat.by)}</span
													>
													<HoverTag
														text={'Regenerate response'}
														position="bottom"
														distance={12}
													/>
												</div>
											</div>
										{/if}
									{/if}
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		{:catch error}
			<p>error loading: {error.message}</p>
		{/await}

		<div
			class="prompt-bar-wrapper"
			style="
                transform: {$mobileSidebarOpen
				? 'translateX(calc(-50% + 20px))'
				: ($conversationsOpen || $contextWindowOpen) && $isLargeScreen
					? 'translateX(calc(-50% + 180px))'
					: ''};
                padding: {$mobileSidebarOpen ? '0 30px 0 50px' : ''};
                width: {($conversationsOpen || $contextWindowOpen) &&
			!$mobileSidebarOpen &&
			$isLargeScreen
				? 'calc(100% - 310px)'
				: ''};
            "
		>
			<div class="prompt-bar" class:shifted={$conversationsOpen || $contextWindowOpen}>
				{#if imagePreview.length > 0 || fileAttachments.length > 0 || isDragging}
					<div
						class="image-viewer"
						role="region"
						on:drop={(event) => {
							event.stopPropagation();
							event.preventDefault();
							handleFileSelect(event);
						}}
						on:dragenter={() => {
							isDragging = true;
						}}
						on:dragleave={(e) => {
							// Only set isDragging to false if we're leaving the container (not entering a child)
							if (e.currentTarget === e.target) {
								isDragging = false;
							}
						}}
						style="
                            background: {$chosenModel.handlesImages || imagePreview.length === 0
							? ''
							: 'rgba(255,50,50,0.25)'}
                        "
					>
						{#if !isDragging}
							{#if !$chosenModel.handlesImages && imagePreview.length > 0}
								<div class="warning">
									<div class="icon">
										<WarningIcon
											color="rgba(255,100,100,0.99)"
											strokeWidth={1.5}
										/>
									</div>
									<p>Vision not supported</p>
								</div>
							{/if}
							{#each imagePreview as image, index}
								<div class="image-container">
									<button
										class="image-button"
										on:click|stopPropagation={() =>
											openImageViewer(image.data, 'Uploaded image')}
										on:keydown|stopPropagation={(e) =>
											e.key === 'Enter' &&
											openImageViewer(image.data, 'Uploaded image')}
										aria-label="View uploaded image"
									>
										<img src={image.data} alt="Uploaded file" />
									</button>
									<div
										class="close-button"
										role="button"
										tabindex="0"
										on:click|stopPropagation={() => {
											imagePreview = imagePreview.filter(
												(_, i) => i !== index
											);
										}}
										on:keydown|stopPropagation={(event) => {
											if (event.key === 'Enter') {
												imagePreview = imagePreview.filter(
													(_, i) => i !== index
												);
											}
										}}
									>
										<CrossIcon color="var(--text-color-light)" />
									</div>
								</div>
							{/each}
							{#each fileAttachments as file, index}
								<div class="file-container">
									<div
										class="file-info"
										role="button"
										tabindex="0"
										on:click|stopPropagation={() =>
											openFileViewer(file.data, file.filename)}
										on:keydown|stopPropagation={(e) =>
											e.key === 'Enter' &&
											openFileViewer(file.data, file.filename)}
									>
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
									<div
										class="close-button"
										role="button"
										tabindex="0"
										on:click|stopPropagation={() => {
											fileAttachments = fileAttachments.filter(
												(_, i) => i !== index
											);
										}}
										on:keydown|stopPropagation={(event) => {
											if (event.key === 'Enter') {
												fileAttachments = fileAttachments.filter(
													(_, i) => i !== index
												);
											}
										}}
									>
										<CrossIcon color="var(--text-color-light)" />
									</div>
								</div>
							{/each}
						{:else}
							<div class="image-drop-container">
								<div class="image-icon">
									<ImageIcon color="var(--text-color)" />
								</div>
								<div class="text-container">
									<h1>Drop files here</h1>
									<p>Images, PDFs, and text files are supported</p>
								</div>
							</div>
						{/if}
					</div>
				{/if}
				{#if showModelSearch && filteredModels.length > 0}
					<div class="model-search-container">
						{#each filteredModels as { company, model, formattedName }, index}
							<div
								class="model-search-item {selectedModelIndex === index
									? 'selected'
									: ''}"
								role="button"
								tabindex="0"
								bind:this={modelSearchItems[index]}
								on:click={() => selectModelFromSearch(company, model)}
								on:keydown={(e) => {
									if (e.key === 'Enter') {
										selectModelFromSearch(company, model);
									}
								}}
								on:mouseenter={() => (selectedModelIndex = index)}
								on:mouseleave={() => (selectedModelIndex = null)}
							>
								<div class="model-icon">
									{#if isModelAnthropic(model.name)}
										<img src={ClaudeIcon} alt="Claude's icon" />
									{:else if isModelOpenAI(model.name)}
										<ChatGPTIcon
											color="var(--text-color)"
											width="22px"
											height="22px"
										/>
									{:else if isModelGoogle(model.name)}
										<GeminiIcon />
									{:else if isModelXAI(model.name)}
										<GrokIcon color="var(--text-color)" />
									{:else if isModelDeepSeek(model.name)}
										<DeepSeekIcon />
									{/if}
								</div>
								<div class="model-info">
									<span class="model-name">{formattedName}</span>
									<span class="company-name">{company}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<div
					contenteditable
					bind:this={promptBar}
					role="textbox"
					tabindex="0"
					bind:innerHTML={prompt}
					on:input={handleInput}
					on:click|stopPropagation={() => {
						if (prompt.startsWith('@')) {
							showModelSearch = true;
						}
					}}
					on:keydown={(event) => {
						if (showModelSearch) {
							if (event.key === 'Enter') {
								event.preventDefault();
								if (selectedModelIndex !== null) {
									const selectedModel = filteredModels[selectedModelIndex];
									selectModelFromSearch(
										selectedModel.company,
										selectedModel.model
									);
								}
							}
							if (event.key === 'ArrowDown') {
								selectedModelIndex =
									selectedModelIndex === null ||
									selectedModelIndex === filteredModels.length - 1
										? 0
										: selectedModelIndex + 1;
								modelSearchItems[selectedModelIndex]?.scrollIntoView({
									behavior: 'smooth',
									block: 'nearest'
								});
							}
							if (event.key === 'ArrowUp') {
								selectedModelIndex =
									selectedModelIndex === null || selectedModelIndex === 0
										? filteredModels.length - 1
										: selectedModelIndex - 1;
								modelSearchItems[selectedModelIndex]?.scrollIntoView({
									behavior: 'smooth',
									block: 'nearest'
								});
							}
						} else {
							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault();
								submitPrompt();
								promptBarHeight = promptBar.offsetHeight;
							}
						}
					}}
					on:paste={async (event) => {
						const formattedText = handlePaste(event);
						if (formattedText) {
							document.execCommand('insertHTML', false, formattedText);
							scrollCursorIntoView(promptBar);
						}
					}}
				/>
				<div class="prompt-bar-buttons-container">
					<div class="left">
						<div
							class="plus-icon button"
							role="button"
							tabindex="0"
							on:click={() => {
								fileInput.click();
							}}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									fileInput.click();
								}
							}}
						>
							<PlusIcon color="var(--text-color-light)" strokeWidth={1.8} />
							<input
								bind:this={fileInput}
								type="file"
								accept="image/jpeg,image/png,image/webp,.txt,.py,.js,.html,.css,.json,.md,.svelte,.tsx,.jsx,.ts,.java,.c,.cpp,.cs,.go,.rb,.php,.swift,.kt"
								style="display: none;"
								on:change={handleFileSelect}
								multiple={$chosenCompany !== 'google'}
							/>
							<HoverTag text="Add images or code files" position="top" />
						</div>
						<div
							class="{($chosenModel.reasons && !$chosenModel.extendedThinking) ||
							(reasoningOn && $chosenModel.extendedThinking)
								? 'selected'
								: ''} reason-button"
							role="button"
							tabindex="0"
							on:click={() => {
								if ($chosenModel.extendedThinking) {
									reasoningOn = !reasoningOn;
								}
							}}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									if ($chosenModel.extendedThinking) {
										reasoningOn = !reasoningOn;
									}
								}
							}}
						>
							<div class="brain-icon">
								<BrainIcon
									color={($chosenModel.reasons &&
										!$chosenModel.extendedThinking) ||
									(reasoningOn && $chosenModel.extendedThinking)
										? '#16a1f9'
										: 'var(--text-color-light)'}
								/>
							</div>
							<p>Reason</p>
							<HoverTag
								text={$chosenModel.reasons
									? 'Thinks before responding'
									: "Selected model doesn't support reasoning"}
								position="top"
							/>
						</div>
						<div
							class="{!$isContextWindowAuto ? 'selected' : ''} reason-button"
							role="button"
							tabindex="0"
							on:click={() => {
								isContextWindowAuto.set(!$isContextWindowAuto);
							}}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									isContextWindowAuto.set(!$isContextWindowAuto);
								}
							}}
						>
							<div class="brain-icon">
								<ContextWindowIcon
									color={!$isContextWindowAuto
										? '#16a1f9'
										: 'var(--text-color-light)'}
								/>
							</div>
							<p>Custom</p>
							<HoverTag text={'Customise your context window'} position="top" />
						</div>
					</div>
					<div class="right">
						<div
							class="button submit-container"
							role="button"
							tabindex="0"
							on:click={() => {
								if (!placeholderVisible) submitPrompt();
							}}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									if (!placeholderVisible) submitPrompt();
								}
							}}
						>
							<ArrowIcon color="var(--bg-color)" />
						</div>
					</div>
				</div>
				<span
					class="placeholder"
					style="display: {placeholderVisible || prompt === '' ? 'block' : 'none'};"
				>
					Write your prompt here or @mention model
				</span>
				{#if !$isContextWindowAuto && (data.user.user_settings?.prompt_pricing_visible || !$isContextWindowAuto)}
					<div class="input-token-container">
						<p>Context window: {$numberPrevMessages}</p>
						{#if data.user.payment_tier === PaymentTier.PayAsYouGo}
							<p class="middle">
								~ Input cost: {input_price === -1
									? '?'
									: '$' + roundToTwoSignificantDigits(input_price)}
							</p>
						{/if}
						<p class="right">
							~ Input tokens: {input_tokens === -1 ? '?' : input_tokens}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.settings-open {
		height: 100vh !important;
	}

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
		margin: 48px 0;
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

	.content-paragraph {
		:global(code) {
			background: var(--bg-color-code);
			color: var(--text-color);
			padding: 5px 5px;
			margin: 0 5px;
			border-radius: 5px;
		}
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

			.empty-content-options {
				position: absolute;
				left: 50%;
				top: 40%;
				transform: translate(-50%, -50%);
				display: flex;
				width: max-content;
				flex-direction: column;
				gap: 80px;
				z-index: 10;

				.logo-container {
					margin: 0 auto;
					display: flex;

					img {
						width: 100px;
						height: 100px;
					}

					h1 {
						margin: auto 0;
						font-size: 40px;
						font-weight: 500;
						text-align: center;
						word-wrap: break-word;
						font-family:
							ui-sans-serif,
							-apple-system,
							system-ui,
							Segoe UI,
							Helvetica,
							Apple Color Emoji,
							Arial,
							sans-serif,
							Segoe UI Emoji,
							Segoe UI Symbol;
					}
				}
			}

			.chat-history {
				position: relative;
				width: 100%;
				height: fit-content;
				padding: 0 50px;
				margin: 100px auto 0px auto;
				display: flex;
				flex-direction: column;
				box-sizing: border-box;
				gap: 50px;

				.user-chat-wrapper {
					display: flex;
					flex-direction: column;
					gap: 5px;
					width: 100%;
					max-width: 850px;
					margin-left: auto;
					margin-right: auto;

					.user-images {
						display: flex;
						flex-wrap: wrap;
						gap: 20px;
						max-width: 500px;
						width: 100%;
						margin-left: auto;

						.user-image-container {
							position: relative;
							flex: 0 0 auto;
							border-radius: 12px;
							overflow: hidden;
							max-width: 200px;
							max-height: 200px;
							width: 100%;
							margin-left: auto;
							cursor: pointer;
							transition:
								transform 0.2s ease,
								box-shadow 0.2s ease;

							&:only-child {
								grid-column: 2;
							}

							&:hover {
								transform: translateY(-2px);
								box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
							}

							img {
								position: relative;
								width: 100%;
								height: 100%;
								object-fit: contain;
							}
						}
					}

					.user-chat {
						position: relative;
						max-width: 500px;
						border-radius: 20px;
						background: var(--bg-color-light);
						padding: 10px 20px;
						width: max-content;
						flex-shrink: 1;
						box-sizing: border-box;
						word-break: break-word;
						overflow-wrap: break-word;
						margin-left: auto;

						p {
							padding: 0;
							margin: 0;
							font-weight: 300;
							line-height: 30px;
						}
					}
				}

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

						.reasoning-paragraph {
							border-left: 2px solid var(--text-color-light-opacity-extreme);
							padding-left: 25px;
							display: flex;
							flex-direction: column;
							font-weight: 300;
							line-height: 30px;
							width: max-content;
							max-width: 100%;
							overflow-y: hidden;
							overflow-x: hidden !important;
							margin-bottom: 35px;

							span {
								font-size: 18px;
								font-weight: 500;
								margin-bottom: 5px;
							}
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

						.chat-toolbar-container {
							position: absolute;
							opacity: 0;
							display: flex;
							gap: 10px;
							transition: all 0.3s ease-in-out;
							transform: translateY(10px);
							padding: 5px;
							box-sizing: border-box;
							border-radius: 10px;
							border: 1px solid var(--text-color-light-opacity);
							z-index: 9;

							.toolbar-item {
								position: relative;
								border-radius: 5px;
								padding: 5px;
								box-sizing: border-box;
								width: 28px;
								height: 28px;
								cursor: pointer;

								&:hover {
									background: var(--bg-color-light);
									p {
										opacity: 1;
									}
								}

								p {
									position: absolute;
									pointer-events: none;
									top: 140%;
									left: 50%;
									transform: translateX(-50%);
									opacity: 0;
									transition: all 0.3s ease;
									font-size: 13px;
									width: max-content;
								}

								.price-open-container {
									position: absolute;
									display: flex;
									gap: 15px;
									flex-direction: column;
									bottom: 40px;
									left: -10px;
									background: var(--bg-color-light);
									padding: 10px;
									border-radius: 10px;
									border: 1px solid var(--text-color-light-opacity);
									width: max-content;

									.price-record {
										position: relative;
										display: flex;
										gap: 5px;

										p {
											position: relative;
											margin: 0;
											transition: none;
											opacity: 1;
											font-size: 14px;
											width: 50px;
											padding: 0;
											left: 0;
											top: 0;
											transform: translateX(0);
										}

										span {
											position: relative;
											margin: 0;
											width: max-content;
										}
									}
								}
							}

							.toolbar-item.refresh-button {
								position: relative;
								display: flex;
								width: auto;
								transition: all 0s ease-in-out;

								.icon {
									margin-right: auto;
								}

								/* Initially only show the icon */
								.model-name {
									position: relative;
									max-width: 0;
									opacity: 0;
									white-space: nowrap;
									overflow: hidden;
									transition: all 0.5s ease-out;
									margin-left: 0;
								}

								/* On hover, expand to show model name */
								&:hover {
									background: var(--bg-color-light);
									width: auto;
									padding-right: 10px;

									.model-name {
										max-width: 100%; /* adjust based on your longest model name */
										opacity: 1;
										margin-left: 10px;
									}
								}
							}

							.chat-toolbar-container {
								/* Your existing styles */
								transition: all 0.3s ease-in-out;
								/* other styles */
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
				}
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

			.prompt-bar-wrapper {
				position: fixed;
				left: 50%;
				bottom: 0%;
				transform: translateX(calc(-50% + 30px));
				width: 100%;
				min-width: 340px;
				background: var(--bg-color);
				z-index: 1000;
				display: flex;
				flex-direction: column;
				box-sizing: border-box;
				padding: 0 50px;
				transition:
					transform 0.3s ease,
					width 0.3s ease;

				.prompt-bar {
					position: relative;
					margin: auto auto 35px auto;
					width: 100%;
					max-width: 900px;
					// min-width: 300px;
					height: max-content;
					box-sizing: border-box;
					background: var(--bg-color-prompt-bar);
					border: 1px solid rgba(0, 0, 0, 0.1);
					box-shadow:
						0 0 #0000,
						0 0 #0000,
						0 9px 9px 0px rgba(0, 0, 0, 0.01),
						0 2px 5px 0px rgba(0, 0, 0, 0.06);
					border-radius: 30px;
					display: flex;
					flex-direction: column;
					gap: 5px;
					transition: margin 0.3s ease;

					.image-viewer {
						position: absolute;
						display: flex;
						gap: 10px;
						top: -110px;
						border-radius: 10px;
						left: 0%;
						background: var(--bg-color-light-opacity);
						width: 100%;
						height: 100px;
						padding: 10px;
						box-sizing: border-box;
						// overflow-y: visible;
						overflow-x: auto;
						white-space: nowrap;

						.warning {
							position: absolute;
							top: 50%;
							left: 50%;
							transform: translateX(-50%) translateY(-50%);

							.icon {
								margin: 0 auto;
								width: 30px;
								height: 30px;
							}

							p {
								font-size: 16px;
								font-weight: 600;
								color: rgba(255, 100, 100, 0.99);
								margin: 0 !important;
							}
						}

						.image-container {
							position: relative;
							height: 100%;
							flex: 0 0 auto;
							border-radius: 12px;
							overflow: hidden;
							box-sizing: border-box;
							cursor: pointer;
							transition: transform 0.2s ease;

							&:hover {
								transform: translateY(-2px);
								outline: 1px solid var(--text-color);

								.close-button {
									opacity: 1;
								}
							}

							img {
								position: relative;
								width: 100%;
								height: 100%;
								object-fit: contain;
								cursor: pointer;
							}
						}

						.close-button {
							position: absolute;
							top: 6px;
							right: 6px;
							width: 18px;
							height: 18px;
							border-radius: 50%;
							cursor: pointer;
							display: flex;
							align-items: center;
							justify-content: center;
							background: rgba(255, 255, 255, 0.2);
							backdrop-filter: blur(2px);
							opacity: 0;
							transition:
								background 0.2s ease,
								opacity 0.2s ease;

							&:hover {
								background: rgba(255, 81, 81, 0.8);
							}
						}

						.file-container {
							position: relative;
							display: flex;
							justify-content: space-between;
							align-items: center;
							padding: 8px 10px;
							width: 160px;
							height: 100%;
							background-color: var(--bg-color);
							border-radius: 10px;
							border: 1px solid rgba(0, 0, 0, 0.1);
							// margin-right: 10px;
							box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
							transition:
								transform 0.2s ease,
								box-shadow 0.2s ease;
							overflow: hidden;
							cursor: pointer;
							box-sizing: border-box;

							&:after {
								content: '';
								position: absolute;
								top: 0;
								left: 0;
								width: 100%;
								height: 100%;
								background: linear-gradient(
									to bottom,
									rgba(255, 255, 255, 0.05),
									transparent
								);
								pointer-events: none;
							}

							&:hover {
								transform: translateY(-2px);
								box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
								border-color: rgba(29, 96, 194, 0.4);

								.close-button {
									opacity: 1;
								}
							}

							.file-info {
								display: flex;
								flex-direction: column;
								align-items: center;
								justify-content: center;
								gap: 8px;
								flex: 1;
								overflow: hidden;

								.file-icon {
									width: 40px;
									height: 40px;
									display: flex;
									align-items: center;
									justify-content: center;
									border-radius: 6px;
									background: linear-gradient(135deg, #1d60c2, #3a7bd5);
									box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

									.file-type {
										font-size: 12px;
										font-weight: bold;
										color: white;
										letter-spacing: 0.5px;
									}
								}

								.file-name {
									font-size: 11px;
									white-space: nowrap;
									overflow: hidden;
									text-overflow: ellipsis;
									max-width: 130px;
									text-align: center;
									color: var(--text-color);
								}
							}
						}

						.image-drop-container {
							height: 100%;
							width: 100%;
							border: 2px dashed rgba(255, 255, 255, 0.2);
							border-radius: inherit;
							display: flex;
							box-sizing: border-box;
							gap: 20px;
							background: var(--bg-color-light);
							transition: all 0.3s ease;
							animation: pulse 2s infinite;

							@keyframes pulse {
								0% {
									border-color: rgba(255, 255, 255, 0.2);
								}
								50% {
									border-color: rgba(29, 96, 194, 0.4);
								}
								100% {
									border-color: rgba(255, 255, 255, 0.2);
								}
							}

							.image-icon {
								margin: auto 0 auto auto;
								width: 40px;
								height: 40px;
								opacity: 0.7;
							}

							.text-container {
								margin: auto auto auto 0;
								gap: 5px;
								display: flex;
								flex-direction: column;
								h1 {
									font-size: 18px;
									font-weight: 600;
									color: var(--text-color);
									margin: 0px;
								}
								p {
									font-size: 14px;
									font-weight: 300;
									color: var(--text-color-light);
									margin: 0px;
								}
							}
						}
					}
					.model-search-container {
						position: absolute;
						bottom: 100%;
						transform: translateY(-10px);
						left: 0;
						width: 100%;
						background: var(--bg-color-light);
						border-radius: 10px;
						box-shadow:
							0 0 #0000,
							0 0 #0000,
							0 9px 9px 0px rgba(0, 0, 0, 0.01),
							0 2px 5px 0px rgba(0, 0, 0, 0.06);
						max-height: 300px;
						overflow-y: auto;
						z-index: 1000;

						.selected {
							background: var(--bg-color);
						}

						.model-search-item {
							display: flex;
							align-items: center;
							padding: 10px 20px;
							cursor: pointer;
							transition: background 0.2s ease;

							.model-icon {
								width: 20px;
								height: 20px;
								margin-right: 12px;
								display: flex;
								align-items: center;
								justify-content: center;

								img {
									width: 100%;
									height: 100%;
									object-fit: contain;
								}
							}

							.model-info {
								display: flex;
								flex-direction: column;

								.model-name {
									font-size: 14px;
									font-weight: 500;
									color: var(--text-color);
								}

								.company-name {
									font-size: 12px;
									color: var(--text-color-light);
								}
							}
						}
					}

					div[contenteditable] {
						max-height: 350px;
						overflow: auto;
						outline: none;
						font-weight: 300;
						padding: 15px 20px;
						margin: 5px 0;
						width: 100%;
						box-sizing: border-box;

						/* Webkit browsers (Chrome, Safari, etc.) */
						&::-webkit-scrollbar {
							width: 8px; /* adjust width as needed */
						}

						&::-webkit-scrollbar-track {
							background-color: transparent !important;
						}

						&::-webkit-scrollbar-thumb {
							background-color: rgba(0, 0, 0, 0.2); /* semi-transparent thumb */
							border-radius: 4px;
						}
					}

					.prompt-bar-buttons-container {
						display: flex;

						.left {
							display: flex;
							margin: auto auto 14px 14px;
							width: 100%;

							.plus-icon {
								margin: auto 0;
								border: 1px solid var(--text-color-light-opacity-extreme);
								width: 32px !important;
								height: 32px !important;
								padding: 6px;
								box-sizing: border-box;

								&:hover {
									background: var(--bg-color-light-alt);
								}
							}

							.selected {
								border-color: #16a1f9 !important;
								background-color: rgba(22, 161, 249, 0.1);

								p {
									color: #16a1f9 !important;
								}
							}

							.reason-button {
								position: relative;
								display: flex;
								gap: 5px;
								margin-left: 5px;
								border: 1px solid var(--text-color-light-opacity-extreme);
								// width: auto;
								border-radius: 99999px;
								height: 36px !important;
								padding: 8px 10px;
								box-sizing: border-box;
								cursor: pointer;

								&:hover {
									background: var(--bg-color-light-alt);
								}

								.brain-icon {
									padding: 0;
									margin: 0;
									max-width: 18px;
									box-sizing: border-box;
								}

								p {
									padding: 0;
									margin: auto;
									font-size: 14px;
									color: var(--text-color-light);
									font-family:
										ui-sans-serif,
										-apple-system,
										system-ui,
										Segoe UI,
										Helvetica,
										Apple Color Emoji,
										Arial,
										sans-serif,
										Segoe UI Emoji,
										Segoe UI Symbol;
								}
							}
						}

						.right {
							margin: auto 10px 10px auto;
							display: flex;
						}

						.button {
							position: relative;
							width: 40px !important;
							height: 40px !important;
							border-radius: 50%;
							padding: 5px;
							box-sizing: border-box;
							cursor: pointer;
							transition: background 0.1s ease;
						}

						.submit-container {
							background: var(--text-color);

							&:hover {
								background: var(--text-color-hover);
							}
						}
					}

					.placeholder {
						position: absolute;
						top: 17%;
						left: 20px;
						// transform: translateY(-50%);
						color: var(--text-color-light);
						font-weight: 300 !important;
						pointer-events: none;
						font-family:
							ui-sans-serif,
							-apple-system,
							system-ui,
							Segoe UI,
							Helvetica,
							Apple Color Emoji,
							Arial,
							sans-serif,
							Segoe UI Emoji,
							Segoe UI Symbol;
					}
				}

				.input-token-container {
					position: absolute;
					top: 100%;
					display: flex;
					width: 100%;
					// padding: 10px 50px 10px 50px;
					padding: 10px 2vw 10px 2vw;
					box-sizing: border-box;

					p {
						text-align: left;
						width: 100%;
						color: var(--text-color-light);
						margin: 0;
						font-size: 12px;
						font-family:
							ui-sans-serif,
							-apple-system,
							system-ui,
							Segoe UI,
							Helvetica,
							Apple Color Emoji,
							Arial,
							sans-serif,
							Segoe UI Emoji,
							Segoe UI Symbol;
					}

					.middle {
						text-align: center;
					}

					.right {
						text-align: right;
					}
				}
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

	@media (max-width: 810px) {
		.main {
			.body {
				padding-left: 0;

				&.shifted {
					margin-left: 0px; /* 300px (conversations sidebar) + 65px (main sidebar) */
				}

				.chat-history {
					padding: 0 35px 300px 35px;
					transition: all 0.3s ease-in-out;

					.user-chat-wrapper {
						margin-top: 20px !important;
						.user-chat {
							max-width: 100%;
						}
					}

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

						.chat-toolbar-container {
							transform: translateY(-5px);
						}
					}
				}
				.empty-content-options {
					left: calc(50%);
					.logo-container {
						width: 90%;
					}
				}

				.prompt-bar-wrapper {
					transform: translateX(-50%);
					padding: 0 10px;
					transition: all 0.6s ease-in-out;
				}
			}

			.input-token-container {
				padding: 10px 15px !important;
			}
		}
	}

	.animated-text {
		font-weight: 800; /* High font weight */
		background: linear-gradient(270deg, #1d60c2, #e91e63, #9c27b0, #1d60c2);
		background-size: 400%; /* To ensure smooth animation */
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent; /* Makes text fill color transparent */
		animation: gradient-animation 25s ease infinite; /* Animation */
	}

	.image-button {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		display: block;
		width: 100%;
		height: 100%;
	}

	.user-file-container {
		position: relative;
		display: inline-flex;
		margin-right: 10px;
		margin-left: auto;
		margin-bottom: 10px;
		border-radius: 8px;
		padding: 8px 12px;
		background-color: rgba(29, 96, 194, 0.08);
		border: 1px solid rgba(29, 96, 194, 0.2);
		// max-width: 160px;
		align-items: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		overflow: hidden;
		cursor: pointer;

		&:after {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
			pointer-events: none;
		}

		&:hover {
			transform: translateY(-1px);
			box-shadow: 0 3px 5px rgba(0, 0, 0, 0.08);
		}

		.file-info {
			display: flex;
			align-items: center;
			gap: 8px;

			.file-icon {
				width: 28px;
				height: 28px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 5px;
				background: linear-gradient(135deg, #1d60c2, #3a7bd5);
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

				.file-type {
					font-size: 10px;
					font-weight: bold;
					color: white;
					letter-spacing: 0.5px;
				}
			}

			.file-name {
				font-size: 11px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				max-width: 100px;
				color: var(--text-color);
			}
		}
	}
</style>
