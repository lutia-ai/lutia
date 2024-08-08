<script>
	import DOMPurify from 'dompurify';
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import { marked } from 'marked';
	import typescript from 'svelte-highlight/languages/typescript';
	import python from 'svelte-highlight/languages/python';
	import synthMidnightTerminalDark from 'svelte-highlight/styles/synth-midnight-terminal-dark';
	import { fly } from 'svelte/transition';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import {
		chatHistory,
		numberPrevMessages,
		clearChatHistory,
		darkMode,
		inputPricing,
		showPricing,
		showLegacyModels
	} from '$lib/stores.js';

	import { updateTokens } from '$lib/tokenizer.ts';
	import SettingsContainer from '$lib/components/SettingsContainer.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import Switch from '$lib/components/Switch.svelte';

	import AnthropicIcon from '$lib/components/icons/Anthropic.svelte';
	import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte';
	import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
	import OpenAiIcon from '$lib/components/icons/OpenAiIcon.svelte';
	import ClaudeIcon from '$lib/images/claude.png';
	import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';
	import CopyIcon from '$lib/components/icons/CopyIcon.svelte';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import ArrowIcon from '$lib/components/icons/Arrow.svelte';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import DropdownIcon from '$lib/components/icons/DropdownIcon.svelte';
	import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';

	/**
	 * The current user input prompt.
	 * @type {string}
	 */
	let prompt;

	let fullPrompt;

	/**
	 * Stores the number of tokens that are within the input/prompt.
	 * @type {number}
	 */
	let input_tokens = 0;

	/**
	 * Stores the cost of the prompt.
	 * @type {number}
	 */
	let input_price = 0;

	/**
	 * Indicates whether the page has been mounted.
	 * @type {boolean}
	 */
	let mounted = false;

	/**
	 * Indicates whether the placeholder is visible in the input field.
	 * @type {boolean}
	 */
	let placeholderVisible = true;

	/**
	 * Controls the visibility of the model dropdown.
	 * @type {boolean}
	 */
	let dropdownOpen = false;

	/**
	 * Controls the visibility of the company dropdown.
	 * @type {boolean}
	 */
	let companyDropdownOpen = false;

	/**
	 * Controls the visibility of the settings panel.
	 * @type {boolean}
	 */
	let settingsOpen = false;

	/**
	 * Controls the visibility of the context window.
	 * @type {boolean}
	 */
	let contextOpen = false;

	/**
	 * Indicates whether an animation is currently rotating.
	 * @type {boolean}
	 */
	let isRotating = false;

	/**
	 * Dictionary of AI companies, their logos, and available models.
	 * @type {Object.<string, {logo: any, models: Object.<string, string>}>}
	 */
	const modelDictionary = {
		openAI: {
			logo: OpenAiIcon,
			models: {
				gpt4o: {
					name: 'GPT 4o',
					param: 'gpt-4o-2024-08-06',
					legacy: false,
					input_price: 2.5,
					output_price: 10,
					context_window: 128000,
					hub: 'Xenova/gpt-4o'
				},
				gpt4mini: {
					name: 'GPT 4o mini',
					param: 'gpt-4o-mini',
					legacy: false,
					input_price: 0.15,
					output_price: 0.6,
					context_window: 128000,
					hub: 'Xenova/gpt-4o'
				},
				gpt4turbo: {
					name: 'GPT 4 Turbo',
					param: 'gpt-4-turbo',
					legacy: true,
					input_price: 10,
					output_price: 30,
					context_window: 128000,
					hub: 'Xenova/gpt-4'
				},
				gpt4: {
					name: 'GPT 4',
					param: 'gpt-4',
					legacy: true,
					input_price: 30,
					output_price: 60,
					context_window: 8000,
					hub: 'Xenova/gpt-4'
				},
				gpt35turbo: {
					name: 'GPT 3.5 Turbo',
					param: 'gpt-3.5-turbo-0125',
					legacy: true,
					input_price: 0.5,
					output_price: 1.5,
					context_window: 16385,
					hub: 'Xenova/gpt-3.5-turbo'
				}
			}
		},
		anthropic: {
			logo: AnthropicIcon,
			models: {
				claude35Sonnet: {
					name: 'Claude 3.5 Sonnet',
					param: 'claude-3-5-sonnet-20240620',
					legacy: false,
					input_price: 3,
					output_price: 15,
					context_window: 200000,
					hub: 'Xenova/claude-tokenizer'
				},
				claude3Opus: {
					name: 'Claude 3 Opus',
					param: 'claude-3-opus-20240229',
					legacy: false,
					input_price: 15,
					output_price: 75,
					context_window: 200000,
					hub: 'Xenova/claude-tokenizer'
				},
				claude3Sonnet: {
					name: 'Claude 3 Sonnet',
					param: 'claude-3-sonnet-20240229',
					legacy: true,
					input_price: 3,
					output_price: 15,
					context_window: 200000,
					hub: 'Xenova/claude-tokenizer'
				},
				claude3Haiku: {
					name: 'Claude 3 Haiku',
					param: 'claude-3-haiku-20240307',
					legacy: false,
					input_price: 0.25,
					output_price: 1.25,
					context_window: 200000,
					hub: 'Xenova/claude-tokenizer'
				}
			}
		},
		google: {
			logo: GoogleIcon,
			models: {
				gemini15Pro: {
					name: 'Gemini 1.5 Pro',
					param: 'gemini-1.5-pro',
					legacy: false,
					input_price: 3.5,
					output_price: 10.5,
					input_price_large: 7, // Price increases for prompts 128k or longer
					output_price_large: 21, // Price increases for prompts 128k or longer
					context_window: 2000000
				},
				gemini15Flash: {
					name: 'Gemini 1.5 Flash',
					param: 'gemini-1.5-flash',
					legacy: false,
					input_price: 0.35,
					output_price: 1.05,
					input_price_large: 0.7, // Price increases for prompts 128k or longer
					output_price_large: 2.1, // Price increases for prompts 128k or longer
					context_window: 1000000
				},
				gemini1Pro: {
					name: 'Gemini 1.0 Pro',
					param: 'gemini-1.0-pro',
					legacy: true,
					input_price: 0.5,
					output_price: 1.5,
					context_window: 1000000
				}
			}
		}
	};

	/**
	 * The currently selected AI company.
	 * @type {string}
	 */
	let chosenCompany = 'anthropic';

	/**
	 * List of available company selections.
	 * @type {string[]}
	 */
	let companySelection = Object.keys(modelDictionary);
	companySelection = companySelection.filter((c) => c !== chosenCompany);

	/**
	 * List of available models for the chosen company.
	 * @type {string[]}
	 */
	let gptModelSelection = Object.values(modelDictionary[chosenCompany].models);

	/**
	 * The currently selected AI model.
	 * @type {string}
	 */
	let chosenModel = gptModelSelection[0];

	$: if (prompt || $numberPrevMessages !== null) generateFullPrompt(prompt);

	/**
	 * Handles paste events, inserting plain text at the cursor position.
	 * @param {ClipboardEvent} event - The paste event.
	 */
	function handlePaste(event) {
		event.preventDefault();

		if (!event.clipboardData) return;

		// Get plain text from clipboard
		const text = event.clipboardData.getData('text/plain');

		// Insert text at cursor position
		document.execCommand('insertText', false, text);
	}

	/**
	 * Copies the given text to the clipboard and updates the chat history to show a 'copied' state.
	 * @param {string} text - The text to be copied to the clipboard.
	 * @param {number} chatIndex - The index of the chat message in the history.
	 * @param {number} componentIndex - The index of the component within the chat message.
	 */
	function copyToClipboard(text, chatIndex, componentIndex) {
		if (navigator.clipboard) {
			navigator.clipboard
				.writeText(text)
				.then(() => {
					chatHistory.update((history) => {
						const newHistory = [...history];
						newHistory[chatIndex].components[componentIndex].copied = true;
						return newHistory;
					});
					setTimeout(() => {
						chatHistory.update((history) => {
							const newHistory = [...history];
							newHistory[chatIndex].components[componentIndex].copied = false;
							return newHistory;
						});
					}, 3000);
				})
				.catch((err) => console.error('Failed to copy text:', err));
		} else {
			const textArea = document.createElement('textarea');
			textArea.value = text;
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand('copy');
			} catch (err) {
				console.error('Failed to copy text:', err);
			}
			document.body.removeChild(textArea);
		}
	}

	/**
	 * Updates the chosen company and resets the model selection based on the new company.
	 * @param {string} company - The name of the selected company.
	 */
	function selectCompany(company) {
		chosenCompany = company;
		companySelection = Object.keys(modelDictionary);
		companySelection = companySelection.filter((c) => c !== company);
		gptModelSelection = Object.keys(modelDictionary[chosenCompany].models);
		gptModelSelection = Object.values(modelDictionary[chosenCompany].models);
		chosenModel = gptModelSelection[0];
	}

	/**
	 * Updates the chosen model and resets the model selection list.
	 * @param {string} model - The name of the selected model.
	 */
	function selectModel(model) {
		chosenModel = model;
		gptModelSelection = Object.values(modelDictionary[chosenCompany].models);
	}

	/**
	 * Sanitizes HTML content by removing potentially unsafe tags and attributes.
	 * @param {string} html - The HTML content to be sanitized.
	 * @returns {string} The sanitized plain text.
	 */
	function sanitizeHtml(html) {
		// Sanitize the HTML content
		let sanitizedHtml = DOMPurify.sanitize(html, {
			ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
			ALLOWED_ATTRS: ['href']
		});
		// Convert the sanitized HTML to plain text
		let tempDiv = document.createElement('div');
		tempDiv.innerHTML = sanitizedHtml;
		return tempDiv.textContent || tempDiv.innerText || '';
	}

	/**
	 * Extracts the code block content from a string starting with a code fence.
	 * @param {string} inputString - The input string containing a code block.
	 * @returns {string} The extracted code block content or null if not found.
	 */
	function extractCodeBlock(inputString) {
		// Use a regular expression to match everything after the first ```
		const match = inputString.match(/```[a-zA-Z]+\n([\s\S]*)/);

		if (!match) {
			return '';
		}
		return match[1];
	}

	/**
	 * Extracts the code block content from a string starting with a code fence.
	 * @param {string} prompt - The current prompt.
	 */
	async function generateFullPrompt(prompt) {
		if (!mounted) return;
		const sanitizedPrompt = sanitizeHtml(prompt);

		/**
		 * @type {Array<{by: string, text: string}>}
		 */
		const currentHistory = $chatHistory;

		/**
		 * Extract and sanitize the previous messages from the chat history.
		 * @type {Array<{by: string, text: string}>}
		 */
		const prevMessages = currentHistory.slice(-$numberPrevMessages * 2 - 1, -1).map(
			/** @param {{by: string, text: string}} message */
			({ by, text }) => ({ by, text: sanitizeHtml(text) })
		);

		fullPrompt = {
			prevMessages,
			prompt: sanitizedPrompt.trim()
		};
		const result = await updateTokens(fullPrompt, chosenModel);
		input_tokens = result.tokens;
		input_price = result.price;
	}

	/**
	 * Submits the user's prompt, processes the AI's response, and updates the chat history.
	 */
	async function submitPrompt() {
		const plainText = prompt;
		const sanitizedPrompt = sanitizeHtml(plainText);
		prompt = '';
		if (plainText.trim()) {
			let userPrompt = {
				by: 'user',
				text: plainText.trim()
			};

			// Add user's message to chat history
			chatHistory.update((history) => [...history, userPrompt]);

			const uri =
				chosenCompany === 'anthropic'
					? '/api/claude'
					: chosenCompany === 'openAI'
						? '/api/chatGPT'
						: '/api/gemini';

			generateFullPrompt(plainText);

			const response = await fetch(uri, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					prompt: JSON.stringify(fullPrompt),
					model: chosenModel.param
				})
			});

			// Initialize AI's response in chat history
			chatHistory.update((history) => [...history, { by: chosenModel.name, text: '', output_cost: 0 }]);

			placeholderVisible = true;

			if (!response.body) {
				console.error('Response body is null');
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let responseText = '';

			let isInCodeBlock = false;
			let codeBlockContent = '';
			let language = '';
			let responseComponents = [];
			let prevText = '';

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
					const text = newTextArray[index];

					// if current word is last in the array and contains a ` then add it to prevText
					if (index === newTextArray.length - 1 && text.includes('`') && !done) {
						prevText = text;
						continue;
					}

					// if current word is just text then add it as text
					else if (!text.includes('```') && !isInCodeBlock) {
						if (
							responseComponents.length > 0 &&
							responseComponents[responseComponents.length - 1].type === 'text'
						) {
							responseComponents[responseComponents.length - 1].content += text;
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
						// extract any text before codeBlock
						if (
							responseComponents.length > 0 &&
							responseComponents[responseComponents.length - 1].type === 'text'
						) {
							responseComponents[responseComponents.length - 1].content +=
								text.split('```')[0];
						} else {
							responseComponents.push({
								type: 'text',
								content: text.split('```')[0]
							});
						}

						// extract any code after ```
						codeBlockContent = extractCodeBlock(text);
						const langMatch = text.match(/```(\w+)/);
						language = langMatch ? langMatch[1] : '';
						if (codeBlockContent) {
							responseComponents.push({
								type: 'code',
								language,
								code: codeBlockContent,
								copied: false
							});
						}
					}

					// if current word is end of code block
					else if (text.includes('```') && isInCodeBlock) {
						isInCodeBlock = false;
						// add any remaining code before end of codeBlock
						if (
							responseComponents.length > 0 &&
							responseComponents[responseComponents.length - 1].type === 'code'
						) {
							responseComponents[responseComponents.length - 1].code +=
								text.split('```')[0];
						} else {
							responseComponents.push({
								type: 'code',
								language: '',
								code: text.split('```')[0],
								copied: false
							});
						}

						if (text.split('```')[1]) {
							responseComponents.push({
								type: 'text',
								content: newText.split('```')[1]
							});
						}
					} else if (isInCodeBlock) {
						if (
							responseComponents.length > 0 &&
							responseComponents[responseComponents.length - 1].type === 'code'
						) {
							responseComponents[responseComponents.length - 1].code += text;
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

					prevText = '';
				}
			}

	       	const lastItem = $chatHistory[$chatHistory.length - 1];
	       	const result = await updateTokens(lastItem.text, chosenModel, 'output');
	       	chatHistory.update(history => {
	       		return history.map((item, index) => {
	       			if (index === history.length - 1) {
	       				return {
	       					...item,
	       					output_cost: result.price
	       				};
	       			}
	       			return item;
	       		});
	       	});
			console.log($chatHistory[$chatHistory.length - 1]);
		}
	}

	/**
	 * Initializes the component and loads the saved chat history from local storage.
	 */
	onMount(async () => {
		const savedChatHistory = localStorage.getItem('chatHistory');
		if (savedChatHistory) {
			chatHistory.set(JSON.parse(savedChatHistory));
		}
		mounted = true;
	});
</script>

<svelte:head>
	{@html synthMidnightTerminalDark}
</svelte:head>

<svelte:window
	on:click={() => {
		dropdownOpen = false;
		companyDropdownOpen = false;
		settingsOpen = false;
		contextOpen = false;
	}}
/>

<div class="main">
	<div class="sidebar">
		<div class="company-and-llm-container">
			<div
				class="company-container"
				role="button"
				tabindex="0"
				on:mouseenter={() => (companyDropdownOpen = true)}
				on:mouseleave={() => (companyDropdownOpen = false)}
			>
				<div class="choose-company-container">
					<div
						class="company-logo-container"
						role="button"
						tabindex="0"
						on:click|stopPropagation={() => {
							companyDropdownOpen = true;
						}}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') companyDropdownOpen = true;
						}}
					>
						<svelte:component this={modelDictionary[chosenCompany].logo} />
					</div>
					{#each companySelection as company, index}
						{#if companyDropdownOpen}
							<div
								role="button"
								tabindex="0"
								on:click|stopPropagation={() => {
									selectCompany(company);
									companyDropdownOpen = false;
								}}
								on:keydown|stopPropagation={(e) => {
									if (e.key === 'Enter') {
										selectCompany(company);
										companyDropdownOpen = false;
									}
								}}
								in:fly={{ y: -50, duration: 600, delay: index * 75 }}
								out:fly={{ y: -50, duration: 450, delay: index * 50 }}
							>
								<div class="company-logo-container">
									<svelte:component this={modelDictionary[company].logo} />
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
			<div
				class="choose-llm-model-container"
				role="button"
				tabindex="0"
				on:click|stopPropagation={() => (dropdownOpen = !dropdownOpen)}
				on:keydown|stopPropagation={(e) => {
					if (e.key === 'Enter') dropdownOpen = !dropdownOpen;
				}}
			>
				<div
					class="options-container chosen-llm"
					style="
						background: {dropdownOpen ? 'var(--bg-color-light)' : ''};
					"
				>
					<p class="chosen-model-p">{chosenModel.name}</p>
					<div class="dropdown-icon">
						<DropdownIcon color="var(--text-color)" />
					</div>
				</div>
				{#if dropdownOpen}
					<div
						class="llm-dropdown-container"
						style="
							background: {$darkMode ? 'var(--bg-color-light)' : 'var(--bg-color)'};
						"
						role="button"
						tabindex="0"
						on:click|stopPropagation
						on:keydown|stopPropagation
					>
						{#each gptModelSelection as model}
							{#if !model.legacy || $showLegacyModels}
								<div
									class="llm-options"
									role="button"
									tabindex="0"
									on:click|stopPropagation={() => {
										selectModel(model);
										dropdownOpen = false;
									}}
									on:keydown={(e) => {
										if (e.key === 'Enter') selectModel(model);
									}}
								>
									<div class="record">
										<p>
											{model.name}

											{#if $showPricing}
												<div class="pricing">
													<span>
														Input: ${model.input_price} / 1M
													</span>
													<span>
														Output: ${model.output_price} / 1M
													</span>
												</div>
											{/if}
										</p>
										{#if model.legacy}
											<div class="legacy">
												<p>Legacy</p>
											</div>
										{/if}
										{#if chosenModel.name === model.name}
											<div class="selected">
												<TickIcon color="var(--bg-color)" strokeWidth={3} />
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{/each}
						<div class="toggles-container">
							<div class="toggle">
								<p
									style="color: {!$showLegacyModels
										? 'var(--text-color-light)'
										: ''}"
								>
									Legacy models
								</p>
								<div class="switch">
									<Switch bind:on={$showLegacyModels} />
								</div>
							</div>
							<div class="toggle">
								<p style="color: {!$showPricing ? 'var(--text-color-light)' : ''}">
									Pricing
								</p>
								<div class="switch">
									<Switch bind:on={$showPricing} />
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="settings-container">
			<div class="settings-wrapper">
				<div
					class="settings-icon"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						clearChatHistory();
						generateFullPrompt(prompt);
						isRotating = true;
						setTimeout(() => {
							isRotating = false;
						}, 500);
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							clearChatHistory();
							generateFullPrompt(prompt);
							isRotating = true;
							setTimeout(() => {
								isRotating = false;
							}, 500);
						}
					}}
					style="padding: 8px;"
				>
					<div class:rotate={isRotating}>
						<RefreshIcon color="var(--text-color-light)" />
					</div>
					<p class="tag">Clear chat</p>
				</div>
			</div>
			<div class="settings-wrapper">
				<div
					class="settings-icon"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						contextOpen = !contextOpen;
						settingsOpen = false;
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							contextOpen = !contextOpen;
							settingsOpen = false;
						}
					}}
					style="
						pointer-events: {contextOpen ? 'none' : ''};
						cursor: {contextOpen ? 'default' : ''} !important;
					"
				>
					<ContextWindowIcon color="var(--text-color-light)" />
					<p class="tag">Context window</p>
				</div>
				{#if contextOpen}
					<div
						class="settings-open-container"
						role="button"
						tabindex="0"
						on:click|stopPropagation
						on:keydown|stopPropagation
					>
						<div class="open-container">
							<p>Previous messages included</p>
							<div class="slider-container">
								<p>0</p>
								<Slider
									value={$numberPrevMessages}
									on:change={(e) => numberPrevMessages.set(e.detail.value) }
								/>
								<p>max</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
			<div class="settings-wrapper">
				<div
					class="settings-icon"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						settingsOpen = !settingsOpen;
						contextOpen = false;
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							settingsOpen = !settingsOpen;
							contextOpen = false;
						}
					}}
					style="
						pointer-events: {settingsOpen ? 'none' : ''};
						cursor: {settingsOpen ? 'default' : ''} !important;
					"
				>
					<SettingsIcon color="var(--text-color-light)" />
					<p class="tag">Settings</p>
				</div>
				{#if settingsOpen}
					<div class="settings-open-container">
						<SettingsContainer />
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="body">
		<div class="chat-history">
			{#each $chatHistory as chat, chatIndex}
				{#if chat.by === 'user'}
					<div class="user-chat">
						<p>
							{@html chat.text}
						</p>
					</div>
				{:else}
					<div class="llm-container">
						{#if Object.values(modelDictionary.anthropic.models).some((model) => model.name === chat.by)}
							<div class="claude-icon-container">
								<img src={ClaudeIcon} alt="Claude's icon" />
							</div>
						{:else if Object.values(modelDictionary.openAI.models).some((model) => model.name === chat.by)}
							<div class="gpt-icon-container">
								<ChatGPTIcon color="var(--text-color)" />
							</div>
						{:else if Object.values(modelDictionary.google.models).some((model) => model.name === chat.by)}
							<div class="gemini-icon-container">
								<GeminiIcon />
							</div>
						{/if}
						<div class="llm-chat">
							{#each chat.components || [] as component, componentIndex}
								{#if component.type === 'text'}
									<p class="content-paragraph">
										{@html marked(
											component.content ? component.content.trim() : ''
										)}
									</p>
								{:else if component.type === 'code'}
									<div class="code-container">
										<div class="code-header">
											<p>{component.language}</p>
											<div
												class="copy-code-container"
												role="button"
												tabindex="0"
												on:click={() =>
													copyToClipboard(
														component.code ? component.code : '',
														chatIndex,
														componentIndex
													)}
												on:keydown|stopPropagation={(e) => {
													if (e.key === 'Enter') {
														copyToClipboard(
															component.code ? component.code : '',
															chatIndex,
															componentIndex
														);
													}
												}}
											>
												{#if component.copied}
													<div class="tick-container">
														<TickIcon color="rgba(255,255,255,0.65)" />
													</div>
												{:else}
													<div class="copy-icon-container">
														<CopyIcon color="rgba(255,255,255,0.65)" />
													</div>
												{/if}
												<p>{component.copied ? 'copied' : 'copy'}</p>
											</div>
										</div>
										<HighlightAuto code={component.code} let:highlighted>
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
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<div class="prompt-bar-wrapper">
			<div 
				class="prompt-bar"
				style="
					margin: {$inputPricing ? '' : 'auto auto 30px auto'}
				" 
			>
				<div
					contenteditable
					role="textbox"
					tabindex="0"
					bind:innerHTML={prompt}
					on:input={() => (placeholderVisible = false)}
					on:keydown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							submitPrompt();
						}
					}}
					on:paste={handlePaste}
				/>

				<div
					class="submit-container"
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
				<span
					class="placeholder"
					style="display: {placeholderVisible || prompt === '' ? 'block' : 'none'};"
				>
					Enter a prompt here
				</span>
			</div>
			{#if $inputPricing}
				<div class="input-token-container">
					<p>Input tokens: {input_tokens}</p>
					<p class="right">Input cost: ${input_price}</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	:global(h1, h2) {
		margin: 0 0 20px 0;
		padding: 0;
	}

	:global(h3, h4) {
		margin: 0 0 10px 0;
		padding: 0;
	}

	:global(p) {
		margin: 0 0 20px 0;
		padding: 0;
	}

	:global(ol) {
		margin: 0 20px 20px 20px;
		padding: 10px 0 0 0;
	}

	:global(li) {
		margin: 0 0 20px 0;
		padding: 0;

		:global(p) {
			margin: 0 0 10px 0;
		}
	}

	.main {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		font-family: 'Albert Sans', sans-serif;

		.sidebar {
			position: fixed;
			display: flex;
			flex-direction: column;
			height: 100%;
			// background: blue;
			z-index: 10001;
			padding: 10px 0px;
			width: 65px;

			.company-and-llm-container {
				position: relative;
				display: flex;

				.company-container {
					position: relative;
					display: flex;
					// margin: auto;
					cursor: pointer;
					z-index: 10;
					width: 100%;

					.choose-company-container {
						width: 100%;
					}

					.company-logo-container {
						width: 60px;
						height: 60px !important;
						margin: auto;
						border-radius: 50%;
						padding: 5px;
						box-sizing: border-box;
						transition: all 0.3s ease;

						&:hover {
							background: var(--bg-color-light);
						}
					}
				}

				.options-container {
					position: relative;
					display: flex;
					flex-direction: column;
					height: 50px;
					padding: 5px;
					border-radius: 50%;
					overflow: hidden;
					transition: all 0.3s ease;

					p {
						margin: auto 0;
						text-align: center;
						color: var(--text-color);
					}

					.chosen-model-p {
						margin: auto 0;
						font-size: 18px;
					}

					&:hover {
						background: var(--bg-color-light);
					}
				}

				.choose-llm-model-container {
					position: absolute;
					left: 100%;
					height: max-content;
					width: max-content;
					border-radius: 10px !important;
					display: flex;
					flex-direction: column;
					transition: all 0.3s ease;
					cursor: pointer;
					background: var(--bg-color);

					.chosen-llm {
						flex-direction: row;
						gap: 5px;
						border-radius: 10px !important;
						padding: 5px 15px;

						.dropdown-icon {
							margin: auto;
							width: 25px;
							height: 25px;
							transform: translateY(2px);
						}
					}

					.llm-dropdown-container {
						position: absolute;
						top: 110%;
						border: 1px solid var(--bg-color-dark);
						background: var(--bg-color);
						box-shadow: 0 5px 15px rgba(50, 50, 50, 0.15);
						border-radius: 10px;
						display: flex;
						flex-direction: column;
						z-index: inherit;
						padding: 10px;
						min-width: 300px;
						cursor: default;

						.llm-options {
							display: flex;
							height: 50px;
							overflow: hidden;
							transition: all 0.3s ease;
							// margin: 10px;

							.record {
								display: flex;
								gap: 10px;
								align-items: center;
								width: 100%;
								height: 100%;
								padding: 0 10px;
								border-radius: 10px;
								color: var(--text-color);
								cursor: pointer;

								&:hover {
									background: var(--bg-color-light-alt);
								}

								p {
									flex: 10;
									display: flex;
									gap: 5px;
									flex-direction: column;
									// align-items: center;
									margin: 0;
									padding: 0;
									width: 140px;

									.pricing {
										display: flex;
										gap: 10px;

										span {
											text-align: left;
											color: var(--text-color-light);
											font-size: 12px;
											// margin-top: 5px;
										}
									}
								}

								.legacy {
									border-radius: 20px;
									border: 1px solid var(--text-color-light);
									background: var(--bg-color-light);
									padding: 5px 10px;
									color: var(--text-color);

									p {
										width: max-content;
										font-size: 14px;
										color: var(--text-color-light);
									}
								}

								.selected {
									// flex: 2;
									margin-left: auto;
									width: 20px;
									height: 20px;
									padding: 2px;
									box-sizing: border-box;
									border-radius: 50%;
									background: var(--text-color);
								}
							}
						}

						.toggles-container {
							display: grid;
							grid-template-columns: repeat(2, 1fr);
							gap: 25px;
							border-top: 1px solid var(--bg-color-dark);
							margin-top: 5px;
							padding: 10px;
							padding-top: 15px;

							.toggle {
								display: flex;

								p {
									margin: auto 0;
									font-size: 14px;
									color: var(--text-color);
								}

								.switch {
									margin: auto 0 auto auto;
								}
							}
						}
					}
				}
			}
			.settings-container {
				position: relative;
				display: flex;
				flex-direction: column;
				gap: 15px;
				margin: auto auto 48px auto;
				padding-left: 10px;
				overflow: visible;

				.settings-wrapper {
					position: relative;

					.settings-icon {
						padding: 6px;
						border-radius: 50%;
						border: 2px solid var(--text-color-light);
						width: 45px;
						height: 45px;
						box-sizing: border-box;
						transition: all 0.5s ease;
						cursor: pointer;

						&:hover {
							outline: 7px solid var(--bg-color-light);

							.tag {
								opacity: 1;
							}
						}

						.tag {
							position: absolute;
							top: 50%;
							left: 140%;
							pointer-events: none;
							transform: translateY(-50%);
							opacity: 0;
							border-radius: 10px;
							padding: 10px;
							width: max-content;
							background: var(--bg-color-light);
							transition: all 0.1s ease;
						}
					}

					.settings-open-container {
						position: absolute;
						border: 1px solid var(--bg-color-dark);
						background: var(--bg-color-light);
						box-shadow: 0 5px 15px rgba(50, 50, 50, 0.15);
						border-radius: 10px;
						left: 120%;
						bottom: 0%;
						width: max-content;
						display: flex;
						flex-direction: column;
						gap: 10px;
						z-index: inherit;
						transition: none;
						overflow: visible;

						.open-container {
							display: flex;
							flex-direction: column;
							gap: 20px;
							padding: 15px 25px;
							overflow: visible;

							p {
								margin: 0;
								color: var(--text-color-light);
							}

							.slider-container {
								display: flex;
								gap: 5px;
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
							}
						}
					}
				}
			}
		}

		.body {
			position: relative;
			display: flex;
			padding-left: 60px;

			.chat-history {
				width: 850px;
				margin: 50px auto 0 auto;
				padding-bottom: 200px;
				display: flex;
				flex-direction: column;
				gap: 50px;

				.user-chat {
					border-radius: 20px;
					background: var(--bg-color-light);
					padding: 10px 20px;
					width: max-content;
					max-width: 500px;
					margin-left: auto;
					word-break: break-word;
					overflow-wrap: break-word;

					p {
						padding: 0;
						margin: 0;
						font-weight: 300;
						line-height: 30px;
					}
				}

				.llm-container {
					display: flex;
					gap: 20px;

					.gpt-icon-container {
						width: 28px !important;
						height: 18px !important;
						border-radius: 50%;
						padding: 8px 4px;
						border: 1px solid var(--text-color-light-opacity);
					}

					.claude-icon-container {
						width: 28px !important;
						height: 18px !important;
						padding: 8px 4px;

						img {
							width: 100%;
						}
					}

					.gemini-icon-container {
						width: 28px;
						height: 28px;
					}

					.llm-chat {
						flex: 1;
						width: 420px;
						padding: 3px;

						.content-paragraph {
							font-weight: 300;
							line-height: 30px;
						}
					}
				}
			}

			.code-container {
				overflow: hidden;
				border-radius: 10px;
				margin: 20px 0;

				.code-header {
					display: flex;
					padding: 10px 20px;
					background: rgba(46, 56, 66, 255);

					.copy-code-container {
						display: flex;
						margin-left: auto;
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

					p {
						margin: auto 0;
						line-height: 15px !important;
						color: rgba(255, 255, 255, 0.65);
						font-weight: 300;
						font-size: 12px;
					}
				}
			}

			.prompt-bar-wrapper {
				position: fixed;
				left: 50%;
				bottom: 0%;
				transform: translateX(calc(-50% + 30px));
				width: 900px;
				background: var(--bg-color);
				z-index: 1000;
				display: flex;
				flex-direction: column;

				.prompt-bar {
					position: relative;
					margin: auto auto 0 auto;
					width: 900px;
					height: max-content;
					background: var(--bg-color-light);
					border-radius: 30px;
					display: flex;
					gap: 5px;

					div[contenteditable] {
						max-height: 350px;
						overflow: auto;
						outline: none;
						font-weight: 300;
						padding: 15px 30px;
						margin: 5px 0;
						width: 100%;
					}

					.submit-container {
						width: 40px !important;
						height: 40px !important;
						margin: auto 10px 10px auto;
						background: var(--text-color);
						border-radius: 50%;
						padding: 5px;
						box-sizing: border-box;
						cursor: pointer;
						transition: background 0.1s ease;

						&:hover {
							background: var(--text-color-hover);
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
					position: relative;
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

					.right {
						text-align: right;
					}
				}
			}
		}
	}

	@keyframes rotate360 {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(-360deg);
		}
	}

	.rotate {
		animation: rotate360 0.5s ease-in-out;
	}
</style>
