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
		inputPricing,
		chosenCompany
	} from '$lib/stores.js';

	import { sanitizeHtml, generateFullPrompt } from '$lib/promptFunctions.ts';
	import { modelDictionary } from '$lib/modelDictionary.ts';
	import { updateTokens } from '$lib/tokenizer.ts';
	import Sidebar from '$lib/components/Sidebar.svelte';

	import GeminiIcon from '$lib/components/icons/GeminiIcon.svelte';
	import ClaudeIcon from '$lib/images/claude.png';
	import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';
	import CopyIcon from '$lib/components/icons/CopyIcon.svelte';
	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import ArrowIcon from '$lib/components/icons/Arrow.svelte';

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
	 * Indicates whether the request to the LLM is loading/waiting for response.
	 * @type {boolean}
	 */
	let requestLoading = false;

	/**
	 * List of available company selections.
	 * @type {string[]}
	 */
	let companySelection = Object.keys(modelDictionary);
	companySelection = companySelection.filter((c) => c !== $chosenCompany);

	/**
	 * List of available models for the chosen company.
	 * @type {Array<*>}
	 */
	let gptModelSelection = Object.values(modelDictionary[$chosenCompany].models);

	/**
	 * The currently selected AI model.
	 * @type {*}
	 */
	let chosenModel = gptModelSelection[0];

	$: if (prompt || $numberPrevMessages !== null) {
		if (mounted) {
			fullPrompt = generateFullPrompt(prompt, $chatHistory, $numberPrevMessages);
			handleUpdateTokens(fullPrompt, chosenModel);
		}
	}

	async function handleUpdateTokens(fullPrompt, chosenModel) {
		const result = await updateTokens(fullPrompt, chosenModel);
		input_tokens = result.tokens;
		input_price = result.price;
	}

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

			requestLoading = true;

			// Add user's message to chat history
			chatHistory.update((history) => [...history, userPrompt]);

			// Initialize AI's response in chat history
			chatHistory.update((history) => [
				...history,
				{ by: chosenModel.name, text: '', output_cost: 0 }
			]);


			const uri =
				$chosenCompany === 'anthropic'
					? '/api/claude'
					: $chosenCompany === 'openAI'
						? '/api/chatGPT'
						: '/api/gemini';

			const fullPrompt = generateFullPrompt(plainText, $chatHistory, $numberPrevMessages);

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

			requestLoading = false;
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
			chatHistory.update((history) => {
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

	onMount(() => {
		mounted = true;
	})
</script>

<svelte:head>
	{@html synthMidnightTerminalDark}
</svelte:head>



<div class="main">
	<Sidebar {companySelection} {gptModelSelection} bind:chosenModel />
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
							<div class="gemini-icon-container {requestLoading ? 'rotateLoading' : ''}">
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
</style>
