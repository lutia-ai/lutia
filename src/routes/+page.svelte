<script lang="ts">
	import { onMount } from 'svelte';
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import { marked } from 'marked';
	import synthMidnightTerminalDark from 'svelte-highlight/styles/synth-midnight-terminal-dark';
	import { chatHistory, numberPrevMessages, inputPricing, chosenCompany } from '$lib/stores.ts';
	import type {
		Message,
		Image,
		Model,
		UserChat,
		CodeComponent,
		ChatComponent,
		ModelDictionary,
		PromptHelpers,
		PromptHelper,
		Component
	} from '$lib/types';
	import { isCodeComponent, isLlmChatComponent, isUserChatComponent } from '$lib/typeGuards';
	import { sanitizeHtml, generateFullPrompt } from '$lib/promptFunctions.ts';
	import { modelDictionary } from '$lib/modelDictionary.ts';
	import {
		calculateClaudeImageCost,
		calculateGptVisionPricing,
		countTokens,
		roundToFirstTwoNonZeroDecimals
	} from '$lib/tokenizer.ts';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Settings from '$lib/components/settings/Settings.svelte';
	import ErrorPopup from '$lib/components/ErrorPopup.svelte';
	import logo from '$lib/images/logos/logo3.png';

	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
	import StarsIcon from '$lib/components/icons/StarsIcon.svelte';
	import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
	import ClaudeIcon from '$lib/images/claude.png';
	import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';
	import CopyIcon from '$lib/components/icons/CopyIcon.svelte';
	import CopyIconFilled from '$lib/components/icons/CopyIconFilled.svelte';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import ArrowIcon from '$lib/components/icons/Arrow.svelte';
	import DropdownIcon from '$lib/components/icons/DropdownIcon.svelte';
	import AttachmentIcon from '$lib/components/icons/AttachmentIcon.svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import ImageIcon from '$lib/components/icons/ImageIcon.svelte';
	import {
		calculateTabWidth,
		changeTabWidth,
		closeAllTabWidths,
		countLeadingWhitespaces,
		extractCodeBlock,
		findLastNewlineIndex,
		formatModelEnumToReadable,
		handleKeyboardShortcut,
		loadChatHistory,
		sanitizeLLmContent
	} from '$lib/chatHistory.js';
	import { page } from '$app/stores';
	import type { ApiProvider } from '@prisma/client';
	import { promptHelpers } from '$lib/promptHelpers.js';

	export let data;

	chatHistory.set(loadChatHistory(data.apiRequests));

	let errorPopup: ErrorPopup;
	let prompt: string;
	let fullPrompt: Message[] | string;
	let input_tokens: number = 0;
	let input_price: number = 0;
	let mounted: boolean = false;
	let placeholderVisible: boolean = true;
	let promptBar: HTMLDivElement;
	let promptBarHeight: number = 0;
	let scrollAnimationFrame: number | null = null;
	let isSettingsOpen: boolean = false;
	let isDragging: boolean = false;
	let fileInput: HTMLInputElement;
	let imagePreview: Image[] = [];
	const randomPrompts = getRandomPrompts(promptHelpers);

	let companySelection: ApiProvider[] = Object.keys(modelDictionary) as ApiProvider[];
	companySelection = companySelection.filter((c) => c !== $chosenCompany);

	let gptModelSelection: Model[] = Object.values(modelDictionary[$chosenCompany].models);
	let chosenModel = gptModelSelection[0];

	// Generates the fullPrompt and counts input tokens when the prompt changes
	$: if (prompt || prompt === '' || $numberPrevMessages || imagePreview) {
		if (mounted) {
			fullPrompt = sanitizeHtml(prompt);
			if ($numberPrevMessages > 0) {
				fullPrompt = generateFullPrompt(prompt, $chatHistory, $numberPrevMessages, false);
				if (fullPrompt.length === 1 && fullPrompt[0].content.length === 0) {
					fullPrompt = prompt;
				}
			}
			handleCountTokens(fullPrompt, chosenModel);
		}
	}

	function getRandomPrompts(promptHelpers: PromptHelpers): {
		createImage: PromptHelper;
		compose: PromptHelper;
		question: PromptHelper;
	} {
		const getRandomItem = <T,>(array: T[]): T => {
			return array[Math.floor(Math.random() * array.length)];
		};

		return {
			createImage: getRandomItem(promptHelpers.createImage),
			compose: getRandomItem(promptHelpers.compose),
			question: getRandomItem(promptHelpers.question)
		};
	}

	async function handleCountTokens(fullPrompt: Message[] | string, chosenModel: Model) {
		if (chosenModel.generatesImages) {
			input_tokens = 0;
			input_price = 0;
			return;
		}
		const result = await countTokens(fullPrompt, chosenModel);
		let imageCost = 0;
		let imageTokens = 0;
		for (const image of imagePreview) {
			let result;
			if ($chosenCompany === 'openAI') {
				result = calculateGptVisionPricing(image.width, image.height);
			} else {
				result = calculateClaudeImageCost(image.width, image.height, chosenModel);
			}
			imageCost += result.price;
			imageTokens += result.tokens;
		}
		console.log();
		console.log('result.price: ', result.price);
		input_tokens = result.tokens + imageTokens;
		input_price = result.price + imageCost;
	}

	function handlePaste(event: ClipboardEvent): void {
		event.preventDefault();
		if (!event.clipboardData) return;

		const text = event.clipboardData.getData('text/plain');

		// Preserve whitespace and line breaks
		const formattedText = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\n/g, '<br>')
			.replace(/\s/g, '&nbsp;');

		document.execCommand('insertHTML', false, formattedText);
	}

	function copyToClipboard(text: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (navigator.clipboard) {
				navigator.clipboard
					.writeText(text)
					.then(resolve)
					.catch((err) => {
						console.error('Failed to copy text:', err);
						reject(err);
					});
			} else {
				const textArea = document.createElement('textarea');
				textArea.value = text;
				document.body.appendChild(textArea);
				textArea.select();
				try {
					document.execCommand('copy');
					resolve();
				} catch (err) {
					console.error('Failed to copy text:', err);
					reject(err);
				} finally {
					document.body.removeChild(textArea);
				}
			}
		});
	}

	// Updates the chosen company and resets the model selection based on the new company.
	function selectCompany(company: ApiProvider) {
		chosenCompany.set(company);
		companySelection = Object.keys(modelDictionary) as ApiProvider[];
		companySelection = companySelection.filter((c) => c !== company);
		gptModelSelection = Object.values(modelDictionary[$chosenCompany].models);
		chosenModel = gptModelSelection[0];
	}

	// Updates the chosen model and resets the model selection list.
	function selectModel(model: Model) {
		chosenModel = model;
		gptModelSelection = Object.values(modelDictionary[$chosenCompany].models);
	}

	async function submitPrompt(): Promise<void> {
		const plainText = prompt;
		const imageArray = chosenModel.handlesImages ? imagePreview : [];
		prompt = '';
		imagePreview = [];
		handleCountTokens(prompt, chosenModel);
		if (plainText.trim()) {
			let userPrompt: UserChat = {
				by: 'user',
				text: plainText.trim(),
				image: imageArray
			};

			// Add user's message to chat history
			chatHistory.update((history) => [...history, userPrompt]);
			scrollToBottom();

			// Initialize AI's response in chat history
			chatHistory.update((history) => [
				...history,
				{
					by: chosenModel.name,
					text: '',
					input_cost: 0,
					output_cost: 0,
					price_open: false,
					loading: true,
					copied: false
				}
			]);

			try {
				const fullPrompt = generateFullPrompt(plainText, $chatHistory, $numberPrevMessages);
				console.log('fullPrompt: ', fullPrompt);

				let uri: string;

				switch ($chosenCompany) {
					case 'anthropic':
						uri = '/api/claude';
						break;
					case 'openAI':
						uri = '/api/chatGPT';
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
						modelStr: JSON.stringify(chosenModel),
						imagesStr: JSON.stringify(imageArray)
					})
				});

				if (!response.ok) {
					prompt = $chatHistory[$chatHistory.length - 2].text;
					chatHistory.update((history) => history.slice(0, -2));
					const errorData = await response.json();
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

				placeholderVisible = true;

				if (!response.body) {
					throw new Error('Response body is null');
				}

				if (chosenModel.generatesImages) {
					const data = await response.json();
					const base64ImageData = data.image;
					console.log(base64ImageData);
					// Update only the AI's response in chat history
					chatHistory.update((history) =>
						history.map((msg, index) =>
							index === history.length - 1
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

				let isInCodeBlock = false;
				let codeBlockContent = '';
				let language = '';
				let responseComponents: Component[] = [];
				let prevText = '';
				let spaceCount = 0;
				let whitespacesLeft = 0;
				let clearedNewLineSpacing = false;
				let codeBlockIsIndented = false;

				while (true) {
					const { value, done } = await reader.read();
					if (done && !prevText) break;

					let newText = done ? '' : decoder.decode(value);
					responseText += newText;
					// split the string but keep the spaces
					let newTextArray = newText.split(/(\s+)/);

					if (prevText) {
						newTextArray[0] = prevText + newTextArray[0];
					}

					for (let index = 0; index < newTextArray.length; index++) {
						let text = newTextArray[index];
						const lastComponent = responseComponents[responseComponents.length - 1];

						// if current word is last in the array and contains a ` then add it to prevText
						if (index === newTextArray.length - 1 && text.includes('`') && !done) {
							prevText = text;
							continue;
						}

						// if current word is just text then add it as text
						else if (!text.includes('```') && !isInCodeBlock) {
							if (lastComponent && lastComponent.type === 'text') {
								lastComponent.content += text;
							} else {
								responseComponents.push({
									type: 'text',
									content: text
								});
							}
						}

						// if current word is start of code block
						else if (text.includes('```') && !isInCodeBlock) {
							isInCodeBlock = true;
							clearedNewLineSpacing = false;

							// extract any text before codeBlock
							if (lastComponent && lastComponent.type === 'text') {
								lastComponent.content += text.split('```')[0];
							} else {
								responseComponents.push({
									type: 'text',
									content: text.split('```')[0]
								});
							}

							spaceCount = countLeadingWhitespaces(responseText);
							whitespacesLeft = spaceCount;
							codeBlockIsIndented = spaceCount > 0 ? true : false;

							// extract any code after ```
							codeBlockContent = extractCodeBlock(text);
							const langMatch = text.match(/```(\w+)/);
							language = langMatch ? langMatch[1] : '';
							if (codeBlockContent) {
								responseComponents.push({
									type: 'code',
									language,
									code: codeBlockContent,
									copied: false,
									tabWidthOpen: false,
									tabWidth: 0
								});
							}
						}

						// if current word is end of code block
						else if (text.includes('```') && isInCodeBlock) {
							isInCodeBlock = false;
							// add any remaining code before end of codeBlock
							if (lastComponent && lastComponent.type === 'code') {
								const codeComponent = lastComponent as CodeComponent;
								const additionalCode = text.split('```')[0].trimEnd();

								// Add any remaining code before the end of the code block
								codeComponent.code += additionalCode;
								codeComponent.code = codeComponent.code.trim();
								codeComponent.tabWidth = calculateTabWidth(codeComponent.code);
							} else {
								responseComponents.push({
									type: 'code',
									language: '',
									code: text.split('```')[0].trimEnd(),
									copied: false,
									tabWidthOpen: false,
									tabWidth: calculateTabWidth(text.split('```')[0])
								});
							}

							if (text.split('```')[1]) {
								responseComponents.push({
									type: 'text',
									content: newText.split('```')[1]
								});
							}
							spaceCount = 0;
							clearedNewLineSpacing = true;
						} else if (isInCodeBlock) {
							// deindents the codeblock
							if (codeBlockIsIndented) {
								if (text.includes('\n')) {
									clearedNewLineSpacing = false;
									const lastNewlineIndex = findLastNewlineIndex(text);
									const newText =
										text.slice(0, lastNewlineIndex) +
										text.slice(lastNewlineIndex + spaceCount);
									if (newText !== text) {
										// then we know that whitespace has been removed
										whitespacesLeft = spaceCount + newText.length - text.length;
										clearedNewLineSpacing =
											whitespacesLeft === 0 ? true : false;
									} else {
										whitespacesLeft = spaceCount;
									}
									text = newText;
								}

								// clear extra whitespace from indent
								if (
									!clearedNewLineSpacing &&
									text.includes(' ') &&
									whitespacesLeft > 0
								) {
									// Count how many leading whitespaces the text actually has
									let leadingWhitespaceCount = 0;
									while (
										text[leadingWhitespaceCount] === ' ' &&
										leadingWhitespaceCount < whitespacesLeft
									) {
										leadingWhitespaceCount++;
									}

									// Remove only the leading whitespaces that we can, based on the smaller value
									text = text.slice(leadingWhitespaceCount);

									// Update whitespacesLeft to account for the removed whitespaces
									whitespacesLeft -= leadingWhitespaceCount;
									clearedNewLineSpacing = whitespacesLeft === 0 ? true : false;
								}
							}

							if (lastComponent && lastComponent.type === 'code') {
								const codeComponent = lastComponent as CodeComponent;
								lastComponent.code = codeComponent.code + text;
							} else {
								responseComponents.push({
									type: 'code',
									language,
									code: text,
									copied: false
								});
							}
						}

						// Update only the AI's response in chat history
						chatHistory.update((history) =>
							history.map((msg, index) =>
								index === history.length - 1
									? { ...msg, text: responseText, components: responseComponents }
									: msg
							)
						);

						if (isScrollingProgrammatically) scrollToBottom();

						prevText = '';
					}
				}

				const lastItem = $chatHistory[$chatHistory.length - 1];
				const outputPriceResult = await countTokens(lastItem.text, chosenModel, 'output');
				const inputPriceResult = await countTokens(fullPrompt, chosenModel, 'input');
				let imageCost = 0;
				let imageTokens = 0;
				for (const image of imageArray) {
					let result;
					if ($chosenCompany === 'openAI') {
						result = calculateGptVisionPricing(image.width, image.height);
					} else {
						result = calculateClaudeImageCost(image.width, image.height, chosenModel);
					}
					imageCost += result.price;
					imageTokens += result.tokens;
				}
				chatHistory.update((history) => {
					return history.map((item, index) => {
						if (index === history.length - 1) {
							return {
								...item,
								input_cost: inputPriceResult.price + imageCost,
								output_cost: outputPriceResult.price,
								loading: false
							};
						}
						return item;
					});
				});
				promptBarHeight = promptBar.offsetHeight;
				console.log($chatHistory[$chatHistory.length - 1]);
			} catch (error) {
				if (error instanceof Error) {
					console.error('Error:', error.message);
				} else {
					console.error('Error:', error); // Handle the case where the error is not an instance of Error
				}
				// Set loading to false in case of error
				chatHistory.update((history) => {
					return history.map((item, index) => {
						if (index === history.length - 1) {
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

	export function updateChatHistoryToCopiedState(
		chatIndex: number,
		componentIndex: number
	): void {
		chatHistory.update((history) => {
			const newHistory: ChatComponent[] = [...history];
			if (isLlmChatComponent(newHistory[chatIndex])) {
				if (isCodeComponent(newHistory[chatIndex].components[componentIndex])) {
					newHistory[chatIndex].components[componentIndex].copied = true;
				} else {
					newHistory[chatIndex].copied = true;
				}
			}
			return newHistory;
		});

		setTimeout(() => {
			chatHistory.update((history) => {
				const newHistory: ChatComponent[] = [...history];
				if (isLlmChatComponent(newHistory[chatIndex])) {
					if (isCodeComponent(newHistory[chatIndex].components[componentIndex])) {
						newHistory[chatIndex].components[componentIndex].copied = false;
					} else {
						newHistory[chatIndex].copied = false;
					}
				}
				return newHistory;
			});
		}, 3000);
	}

	// Helper function to check if a model belongs to a specific company
	function isModelByCompany(company: keyof ModelDictionary, modelName: string): boolean {
		return Object.values(modelDictionary[company].models).some(
			(model) => (model as Model).name === modelName
		);
	}

	function isModelAnthropic(modelName: string): boolean {
		return isModelByCompany('anthropic', modelName);
	}

	function isModelOpenAI(modelName: string): boolean {
		return isModelByCompany('openAI', modelName);
	}

	function isModelGoogle(modelName: string): boolean {
		return isModelByCompany('google', modelName);
	}

	let isScrollingProgrammatically = false;
	let lastScrollPos = 0;

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
		let files;
		if (isDragging) {
			isDragging = false;
			files = event.dataTransfer.files;
		} else {
			const target = event.target as HTMLInputElement;
			files = target.files;
		}
		if (files && files.length > 0) {
			const newPreviews: Image[] = [];
			let processedFiles = 0;

			for (const file of files) {
				const reader = new FileReader();

				reader.onload = (e: ProgressEvent<FileReader>) => {
					if (e.target?.result) {
						const img = new Image();
						img.onload = () => {
							newPreviews.push({
								type: 'image',
								data: e.target!.result as string,
								media_type: file.type,
								width: img.width,
								height: img.height
							});

							processedFiles++;
							// If all files have been processed, update the imagePreview array
							if (processedFiles === files.length) {
								imagePreview = [...imagePreview, ...newPreviews];
								fileInput.value = '';
							}
						};
						img.src = e.target.result as string;
					}
				};
				reader.readAsDataURL(file);
			}
		}
	}

	$: if (promptBarHeight) {
		if (isAtBottom()) {
			scrollToBottom();
		}
	}

	onMount(() => {
		const successParam = $page.url.searchParams.get('success');
		if (successParam && errorPopup) {
			if (successParam === 'AccountLinkSuccess') {
				const message = 'Linked accounts successfully!';
				errorPopup.showError(message, null, 5000, 'success');
			}
		}
		mounted = true;
		scrollToBottom();
		if (promptBar) {
			// Get the height of the prompt bar
			promptBarHeight = promptBar.offsetHeight;
		}
	});
</script>

<svelte:head>
	{@html synthMidnightTerminalDark}
</svelte:head>

<svelte:window
	on:click={() => {
		closeAllTabWidths();
	}}
	on:scroll={() => {
		handleScroll();
	}}
	on:keydown={handleKeyboardShortcut}
/>

<ErrorPopup bind:this={errorPopup} />

<div class="main" class:settings-open={isSettingsOpen}>
	<Sidebar {companySelection} {gptModelSelection} bind:chosenModel bind:isSettingsOpen />
	{#if isSettingsOpen}
		<Settings bind:isOpen={isSettingsOpen} />
	{/if}
	<div
		class="body"
		role="region"
		on:dragover|preventDefault={(event) => {
			event.preventDefault;
			isDragging = true;
		}}
	>
		{#if $chatHistory.length === 0}
			<div class="empty-content-options">
				<div class="logo-container">
					<img src={logo} alt="logo" />
					<h1>Lutia</h1>
				</div>
				<div class="options-container">
					<div
						class="option"
						role="button"
						tabindex="0"
						on:click={() => {
							selectCompany('openAI');
							selectModel(modelDictionary.openAI.models.dalle3);
							prompt = randomPrompts.createImage.prompt;
							submitPrompt();
						}}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								selectCompany('openAI');
								selectModel(modelDictionary.openAI.models.dalle3);
								prompt = randomPrompts.createImage.prompt;
								submitPrompt();
							}
						}}
					>
						<div class="icon" style="background-color: rgba(227,193,15,1);">
							<svelte:component this={randomPrompts.createImage.icon} color="white" />
						</div>
						<p>{randomPrompts.createImage.prompt}</p>
					</div>
					<div
						class="option"
						role="button"
						tabindex="0"
						on:click={() => {
							if (chosenModel.generatesImages) {
								selectCompany('anthropic');
								selectModel(modelDictionary.anthropic.models.claude35Sonnet);
							}
							prompt = randomPrompts.compose.prompt;
							submitPrompt();
						}}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								if (chosenModel.generatesImages) {
									selectCompany('anthropic');
									selectModel(modelDictionary.anthropic.models.claude35Sonnet);
								}
								prompt = randomPrompts.compose.prompt;
								submitPrompt();
							}
						}}
					>
						<div class="icon" style="background-color: #dc0480;">
							<svelte:component this={randomPrompts.compose.icon} color="white" />
						</div>
						<p>{randomPrompts.compose.prompt}</p>
					</div>
					<div
						class="option"
						role="button"
						tabindex="0"
						on:click={() => {
							if (chosenModel.generatesImages) {
								selectCompany('anthropic');
								selectModel(modelDictionary.anthropic.models.claude35Sonnet);
							}
							prompt = randomPrompts.question.prompt;
							submitPrompt();
						}}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								if (chosenModel.generatesImages) {
									selectCompany('anthropic');
									selectModel(modelDictionary.anthropic.models.claude35Sonnet);
								}
								prompt = randomPrompts.question.prompt;
								submitPrompt();
							}
						}}
					>
						<div class="icon" style="background-color: #16a1fb;">
							<svelte:component this={randomPrompts.question.icon} color="white" />
						</div>
						<p>{randomPrompts.question.prompt}</p>
					</div>
				</div>
			</div>
		{/if}
		<div class="chat-history" style="padding-bottom: {380 + promptBarHeight * 0.3}px;">
			{#each $chatHistory as chat, chatIndex}
				{#if isUserChatComponent(chat) && chat.by === 'user'}
					<div class="user-chat-wrapper">
						{#if chat.image}
							<div class="user-images">
								{#each chat.image as image}
									<div class="user-image-container">
										<img src={image.data} alt="user file" />
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
					<div class="llm-container">
						{#if isLlmChatComponent(chat)}
							{#if isModelAnthropic(chat.by)}
								<div
									class="llm-icon-container {chat.loading ? 'rotateLoading' : ''}"
								>
									<img src={ClaudeIcon} alt="Claude's icon" />
								</div>
							{:else if isModelOpenAI(chat.by)}
								<div
									class="gpt-icon-container {chat.loading ? 'rotateLoading' : ''}"
								>
									<ChatGPTIcon
										color="var(--text-color)"
										width="22px"
										height="22px"
									/>
								</div>
							{:else if isModelGoogle(chat.by)}
								<div
									class="llm-icon-container {chat.loading ? 'rotateLoading' : ''}"
								>
									<GeminiIcon />
								</div>
							{/if}
						{/if}
						<div class="llm-chat">
							{#if isLlmChatComponent(chat)}
								{#each chat.components || [] as component, componentIndex}
									{#if component.type === 'text'}
										<p class="content-paragraph">
											{@html marked(
												component.content
													? sanitizeLLmContent(component.content.trim())
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
															on:keydown|stopPropagation={(e) => {
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
																component.code ? component.code : ''
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
															<div class="copy-icon-container">
																<CopyIcon
																	color="rgba(255,255,255,0.65)"
																/>
															</div>
														{/if}
														<p>
															{component.copied ? 'copied' : 'copy'}
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
														--line-number-color="rgba(255, 255, 255, 0.3)"
														--border-color="rgba(255, 255, 255, 0.1)"
														--padding-left="2em"
														--padding-right="1em"
														style="max-width: 100%;"
													/>
												</HighlightAuto>
											</div>
										</div>
									{:else if component.type === 'image'}
										<div class="image-container">
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
												updateChatHistoryToCopiedState(chatIndex, 0);
											}}
											on:keydown|stopPropagation={(e) => {
												if (e.key === 'Enter') {
													copyToClipboard(chat.text);
													updateChatHistoryToCopiedState(chatIndex, 0);
												}
											}}
										>
											{#if chat.copied}
												<TickIcon color="var(--text-color-light)" />
											{:else}
												<CopyIconFilled color="var(--text-color-light)" />
											{/if}
											<p>{chat.copied ? 'copied' : 'copy'}</p>
										</div>
										<div
											class="toolbar-item"
											role="button"
											tabindex="0"
											on:click|stopPropagation={() => {
												chat.price_open = true;
											}}
											on:keydown|stopPropagation={(e) => {
												chat.price_open = true;
											}}
										>
											<DollarIcon color="var(--text-color-light)" />
											<p>Price</p>
											{#if chat.price_open}
												<div class="price-open-container">
													<div class="price-record">
														<p>Input:</p>
														<span
															>${roundToFirstTwoNonZeroDecimals(
																chat.input_cost
															)}</span
														>
													</div>
													<div class="price-record">
														<p>Output:</p>
														<span
															>${roundToFirstTwoNonZeroDecimals(
																chat.output_cost
															)}</span
														>
													</div>
													<div class="price-record">
														<p>Total:</p>
														<span
															>${roundToFirstTwoNonZeroDecimals(
																chat.input_cost + chat.output_cost
															)}</span
														>
													</div>
												</div>
											{/if}
										</div>
										<div class="toolbar-item">
											<StarsIcon color="var(--text-color-light)" />
											<p>{formatModelEnumToReadable(chat.by)}</p>
										</div>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<div class="prompt-bar-wrapper">
			<div
				class="prompt-bar"
				style="
                    margin: {$inputPricing ? '' : 'auto auto 20px auto'};
                "
			>
				{#if (imagePreview.length > 0 || isDragging) && chosenModel.handlesImages}
					<div
						class="image-viewer"
						role="region"
						on:drop={(event) => {
							event.stopPropagation();
							event.preventDefault();
							handleFileSelect(event);
						}}
					>
						{#if !isDragging}
							{#each imagePreview as image, index}
								<div class="image-container">
									<img src={image.data} alt="Uploaded file" />
									<div
										class="close-button"
										role="button"
										tabindex="0"
										on:click={() => {
											imagePreview = imagePreview.filter(
												(_, i) => i !== index
											);
										}}
										on:keydown={(event) => {
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
						{:else}
							<div class="image-drop-container">
								<div class="image-icon">
									<ImageIcon color="var(--text-color)" />
								</div>
								<div class="text-container">
									<h1>Drop images here</h1>
									<p>Max 5 files per chat</p>
								</div>
							</div>
						{/if}
					</div>
				{/if}
				<div
					contenteditable
					bind:this={promptBar}
					role="textbox"
					tabindex="0"
					bind:innerHTML={prompt}
					on:input={() => {
						placeholderVisible = false;
						promptBarHeight = promptBar.offsetHeight;
					}}
					on:keydown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							submitPrompt();
							promptBarHeight = promptBar.offsetHeight;
						}
					}}
					on:paste={handlePaste}
				/>
				<div class="prompt-bar-buttons-container">
					{#if chosenModel.handlesImages}
						<div
							class="button"
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
							<AttachmentIcon color="var(--text-color)" strokeWidth={2} />
							<input
								bind:this={fileInput}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								style="display: none;"
								on:change={handleFileSelect}
								multiple={$chosenCompany !== 'google'}
							/>
							<div class="hover-tag">
								<p>Attach image</p>
							</div>
						</div>
					{/if}
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
				<span
					class="placeholder"
					style="display: {placeholderVisible || prompt === '' ? 'block' : 'none'};"
				>
					Enter a prompt here
				</span>
				{#if $inputPricing}
					<div class="input-token-container">
						<p>Context window: {$numberPrevMessages}</p>
						<p class="middle">Input tokens: {input_tokens}</p>
						<p class="right">
							Input cost: ${roundToFirstTwoNonZeroDecimals(input_price)}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.settings-open {
		height: 100vh;
	}

	:global(h1, h2) {
		margin: 0 0 20px 0;
		padding: 0;
	}

	:global(h3, h4) {
		margin: 0 0 10px 0;
		padding: 0;
	}

	:global(p) {
		margin: 0 0 10px 0;
		padding: 0;
	}

	:global(ol) {
		margin: 0 20px 10px 20px;
		padding: 10px 0 0 0;
	}

	:global(li) {
		margin: 0 0 10px 0;
		padding: 0;

		:global(p) {
			margin: 0 0 10px 0;
		}
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
		min-width: 450px;
		font-family: 'Albert Sans', sans-serif;
		// overflow-x: hidden;

		.body {
			position: relative;
			width: 100%;
			height: 100%;
			background: var(--bg-color);
			z-index: 1000;
			display: flex;
			flex-direction: column;
			box-sizing: border-box;
			padding-left: 60px;

			.empty-content-options {
				position: absolute;
				left: 50%;
				top: 50%;
				height: 50%;
				transform: translate(calc(-50% + 30px), -45%);
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
					}
				}

				.options-container {
					display: flex;
					flex-wrap: wrap;
					gap: 20px;

					.option {
						display: flex;
						flex-direction: column;
						margin: auto 0;
						border: 2px solid var(--bg-color-light);
						box-shadow: 0 0 5px rgba(0, 0, 0, 0.05);
						padding: 15px;
						width: 190px;
						height: 140px;
						border-radius: 15px;
						cursor: pointer;
						transition: all 0.1s ease;

						.icon {
							width: 35px;
							height: 35px;
							padding: 6px;
							box-sizing: border-box;
							border-radius: 50%;
						}

						p {
							margin-top: auto;
							color: var(--text-color-light);
						}

						&:hover {
							border-color: var(--text-color-light);
						}
					}
				}
			}

			.chat-history {
				position: relative;
				width: 100%;
				height: fit-content;
				padding: 0 50px;
				margin: 150px auto 0px auto;
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
							// height: 100%;
							margin-left: auto;

							&:only-child {
								grid-column: 2;
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

					.gpt-icon-container {
						position: relative;
						width: 22px;
						height: 22px;
						display: flex;
						border-radius: 50%;
						padding: 4px;
						border: 1px solid var(--text-color-light-opacity);
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
						padding: 3px;
						box-sizing: border-box;

						&:hover {
							.chat-toolbar-container {
								opacity: 1;
							}
						}

						.content-paragraph {
							display: flex;
							flex-direction: column;
							font-weight: 300;
							line-height: 30px;
							width: max-content;
							max-width: 100%;
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
						}

						.image-container {
							position: relative;
							width: 100%;
							height: 100%;
							border-radius: 5px;
							overflow: hidden;

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

			.code-container {
				padding-bottom: 10px;
				border-radius: 10px;
				margin: 20px 0;

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
				}
			}

			.prompt-bar-wrapper {
				position: fixed;
				left: 50%;
				bottom: 0%;
				transform: translateX(calc(-50% + 30px));
				width: 100%;
				background: var(--bg-color);
				z-index: 1000;
				display: flex;
				flex-direction: column;
				box-sizing: border-box;
				padding: 0 50px;

				.prompt-bar {
					position: relative;
					margin: auto auto 35px auto;
					width: 100%;
					max-width: 900px;
					min-width: 300px;
					height: max-content;
					box-sizing: border-box;
					background: var(--bg-color-light);
					border-radius: 30px;
					display: flex;
					gap: 5px;

					.image-viewer {
						position: absolute;
						display: flex;
						gap: 10px;
						top: -120px;
						border-radius: 10px;
						left: 0%;
						background: var(--bg-color-light-opacity);
						width: 100%;
						height: 100px;
						padding: 10px;
						box-sizing: border-box;
						overflow-x: auto;
						white-space: nowrap;

						.image-container {
							position: relative;
							height: 100%;
							flex: 0 0 auto;
							border-radius: 12px;
							overflow: hidden;
							box-sizing: border-box;

							&:hover {
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
							}

							.close-button {
								position: absolute;
								top: 4px;
								left: 4px;
								width: 20px;
								height: 20px;
								border-radius: 50%;
								cursor: pointer;
								box-sizing: border-box;
								background: var(--bg-color-light);
								opacity: 0;
								outline: 1px solid var(--text-color);

								&:hover {
									background: rgb(255, 81, 81);
								}
							}
						}

						.image-drop-container {
							height: 100%;
							width: 100%;
							border: 3px dashed var(--text-color-light);
							border-radius: inherit;
							display: flex;
							box-sizing: border-box;
							gap: 20px;
							background: var(--bg-color-light);

							.image-icon {
								margin: auto 0 auto auto;
								width: 40px;
								height: 40px;
							}

							.text-container {
								margin: auto auto auto 0;
								gap: 5px;
								display: flex;
								flex-direction: column;

								h1,
								p {
									text-align: center;
									margin: 0;
									width: max-content;
								}

								h1 {
									font-size: 24px;
									font-weight: 400;
									color: var(--text-color);
								}

								p {
									font-size: 14px;
									font-weight: 300;
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
						padding: 15px 30px;
						margin: 5px 0;
						width: 100%;
					}

					.prompt-bar-buttons-container {
						margin: auto 10px 10px auto;
						display: flex;

						.button {
							position: relative;
							width: 40px !important;
							height: 40px !important;
							border-radius: 50%;
							padding: 5px;
							box-sizing: border-box;
							cursor: pointer;
							transition: background 0.1s ease;

							&:hover {
								.hover-tag {
									opacity: 1;
								}
							}

							.hover-tag {
								position: absolute;
								bottom: 130%;
								left: 50%;
								transform: translateX(-50%);
								background: var(--bg-color-light);
								padding: 10px;
								box-sizing: border-box;
								border-radius: 10px;
								width: max-content;
								opacity: 0;
								transition: all 0.5s ease-in;

								p {
									margin: 0;
								}
							}
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
						top: 50%;
						left: 30px;
						transform: translateY(-50%);
						color: var(--text-color-light);
						font-weight: 300 !important;
						pointer-events: none;
					}
				}

				.input-token-container {
					position: absolute;
					top: 100%;
					display: flex;
					width: 100%;
					padding: 10px 50px 10px 50px;
					box-sizing: border-box;

					p {
						text-align: left;
						width: 100%;
						color: var(--text-color-light);
						margin: 0;
						font-size: 12px;
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
		.user-chat {
			max-width: 100% !important;
		}

		.empty-content-options {
			transform: translate(-50%, -45%) !important;

			.options-container {
				display: none !important;
			}
		}

		.input-token-container {
			padding: 10px 18px !important;
		}
	}
</style>
