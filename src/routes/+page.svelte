<script lang="ts">
	import { onMount } from 'svelte';
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import { marked } from 'marked';
	import synthMidnightTerminalDark from 'svelte-highlight/styles/synth-midnight-terminal-dark';
	import { chatHistory, numberPrevMessages, inputPricing, chosenCompany } from '$lib/stores.ts';
	import type {
		FullPrompt,
		Model,
		UserChat,
		Component,
		CodeComponent,
		ChatComponent,
		ModelDictionary
	} from '$lib/types';

	import { isCodeComponent, isLlmChatComponent } from '$lib/typeGuards';
	import { sanitizeHtml, generateFullPrompt } from '$lib/promptFunctions.ts';
	import { modelDictionary } from '$lib/modelDictionary.ts';
	import { countTokens, roundToFirstTwoNonZeroDecimals } from '$lib/tokenizer.ts';
	import Sidebar from '$lib/components/Sidebar.svelte';

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

	let prompt: string;
	let fullPrompt: FullPrompt | string;
	let input_tokens: number = 0;
	let input_price: number = 0;
	let mounted: boolean = false;
	let placeholderVisible: boolean = true;
    let promptBar: HTMLDivElement;
    let promptBarHeight: number = 0;
    let scrollAnimationFrame: number | null = null;

	let companySelection: string[] = Object.keys(modelDictionary);
	companySelection = companySelection.filter((c) => c !== $chosenCompany);

	let gptModelSelection: Model[] = Object.values(modelDictionary[$chosenCompany].models);
	let chosenModel = gptModelSelection[0];

	$: if ((prompt || prompt === '') || $numberPrevMessages) {
		if (mounted) {
            fullPrompt = sanitizeHtml(prompt);
            if ($numberPrevMessages > 0) fullPrompt = generateFullPrompt(prompt, $chatHistory, $numberPrevMessages);
			handleCountTokens(fullPrompt, chosenModel);
		}
	}

	async function handleCountTokens(fullPrompt: FullPrompt | string, chosenModel: Model) {
		const result = await countTokens(fullPrompt, chosenModel);
		input_tokens = result.tokens;
		input_price = result.price;
	}

	function handlePaste(event: ClipboardEvent): void {
		event.preventDefault();
		if (!event.clipboardData) return;

		const text = event.clipboardData.getData('text/plain');
		document.execCommand('insertText', false, text);
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

	function updateChatHistoryToCopiedState(chatIndex: number, componentIndex: number): void {
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

	function extractCodeBlock(inputString: string): string {
		const match = inputString.match(/```[a-zA-Z]+\n([\s\S]*)/);
		if (!match) {
			return '';
		}
		return match[1];
	}

	function calculateTabWidth(code: string): number {
		const lines = code.split('\n');
		let tabWidth: number = 0;

		for (const line of lines) {
			const match = line.match(/^( *)/);
			if (match) {
				const leadingSpaces = match[0];
				const currentLevel = leadingSpaces.length;
				if (currentLevel !== 0) {
					tabWidth = currentLevel;
					break;
				}
			}
		}
		return tabWidth;
	}

	function changeTabWidth(code: string, tabWidth: number = 4): string {
		const lines = code.split('\n');
		let originalIndentationLevel: number | null = null;

		const adjustedLines = lines.map((line) => {
			const match = line.match(/^( *)/);
			if (match) {
				const leadingSpaces = match[0];
				const currentLevel = leadingSpaces.length;

				// Initialize originalIndentationLevel if it's null and currentLevel is greater than 0
				if (currentLevel > 0 && originalIndentationLevel === null) {
					originalIndentationLevel = currentLevel;
				}

				// Ensure originalIndentationLevel is not null before performing division
				if (originalIndentationLevel !== null) {
					if (currentLevel === 0) {
						return line;
					} else {
						const indentationUnits =
							(currentLevel / originalIndentationLevel) * tabWidth;
						const newIndentation = ' '.repeat(indentationUnits);
						return newIndentation + line.trim();
					}
				}
			}

			// Return line as is if no match was found
			return line;
		});

		return adjustedLines.join('\n');
	}

	function closeAllTabWidths(): void {
		chatHistory.update((history) => {
			return history.map((item) => {
				if (isLlmChatComponent(item)) {
					item.price_open = false;
					if (Array.isArray(item.components)) {
						item.components.forEach((component: Component) => {
							if (isCodeComponent(component)) {
								component.tabWidthOpen = false;
							}
						});
					}
				}
				return item;
			});
		});
	}

	async function submitPrompt(): Promise<void> {
		const plainText = prompt;
		prompt = '';
        handleCountTokens(prompt, chosenModel);
		if (plainText.trim()) {
			let userPrompt: UserChat = {
				by: 'user',
				text: plainText.trim()
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

                console.log(fullPrompt);

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

				placeholderVisible = true;

				if (!response.body) {
					throw new Error('Response body is null');
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
							// extract any text before codeBlock
							if (lastComponent && lastComponent.type === 'text') {
								lastComponent.content += text.split('```')[0];
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
									code: codeBlockContent.trimStart(),
									copied: false,
									tabWidthOpen: false,
									tabWidth: null
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
								codeComponent.tabWidth = calculateTabWidth(codeComponent.code);
								codeComponent.code = codeComponent.code.trim();
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
						} else if (isInCodeBlock) {
							if (lastComponent && lastComponent.type === 'code') {
								const codeComponent = lastComponent as CodeComponent;
								lastComponent.code = codeComponent.code.trimStart() + text;
							} else {
								responseComponents.push({
									type: 'code',
									language,
									code: text.trimStart(),
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
				chatHistory.update((history) => {
					return history.map((item, index) => {
						if (index === history.length - 1) {
							return {
								...item,
								input_cost: inputPriceResult.price,
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
        const scrollStep = function() {
            const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            const targetPosition = document.documentElement.scrollHeight;
            const distanceToScroll = targetPosition - currentScrollPosition - window.innerHeight;

            // Check if the end is reached, we can stop scrolling
            if (distanceToScroll > 0 && isScrollingProgrammatically) {
                // Calculate a variable scroll distance, using easing
                const scrollDistance = Math.min(distanceToScroll, Math.max(1, distanceToScroll / 20)); // Dynamic distance based on remaining distance

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

    $: if (promptBarHeight) {
        if (isAtBottom()) {
            scrollToBottom();
        }
    }

	onMount(() => {
		mounted = true;
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
    on:scroll={() => {handleScroll();}}
/>

<div class="main">
	<Sidebar {companySelection} {gptModelSelection} bind:chosenModel />
	<div class="body">
		<div 
            class="chat-history"
            style="padding-bottom: {100 + (promptBarHeight*.3)}px;"
        >
			{#each $chatHistory as chat, chatIndex}
				{#if chat.by === 'user'}
					<div class="user-chat">
						<p>
							{@html chat.text}
						</p>
					</div>
				{:else}
					<div class="llm-container">
						{#if isLlmChatComponent(chat)}
							{#if isModelAnthropic(chat.by)}
								<div
									class="claude-icon-container {chat.loading
										? 'rotateLoading'
										: ''}"
								>
									<img src={ClaudeIcon} alt="Claude's icon" />
								</div>
							{:else if isModelOpenAI(chat.by)}
								<div class="gpt-icon-container {chat.loading
                                    ? 'rotateLoading'
                                    : ''}"
                                >
									<ChatGPTIcon color="var(--text-color)" />
								</div>
							{:else if isModelGoogle(chat.by)}
								<div
									class="gemini-icon-container {chat.loading
										? 'rotateLoading'
										: ''}"
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
												component.content ? component.content.trim() : ''
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
                                                                <div class="tab-width-open-container">
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
                                                                                if (e.key === 'Enter') {
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
                                                                            <p>Tab width: {tabWidth}</p>
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
                                                                    component.code ? component.code : ''
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
                                                        <p>{component.copied ? 'copied' : 'copy'}</p>
                                                    </div>
                                                </div>
											</div>
											<div class="code-content">
												<HighlightAuto
													code={component.code}
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
											<p>{chat.by}</p>
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
					margin: {$inputPricing ? '' : 'auto auto 30px auto'};
				"
			>
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
					<p class="right">Input cost: ${roundToFirstTwoNonZeroDecimals(input_price)}</p>
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
		margin: 0 20px 0px 20px;
		padding: 10px 0 0 0;
	}

	:global(li) {
		margin: 0 0 10px 0;
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
                height: 100%;
				margin: 50px auto 0 auto;
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
						position: relative;
						flex: 1;
						width: 420px;
						padding: 3px;

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
							transform: translateY(-20px);
							opacity: 0;
							display: flex;
							gap: 10px;
							transition: all 0.3s ease-in-out;
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
					}
				}
			}

			.gpt-loading-dot {
				position: relative;
				width: 15px !important;
				height: 15px !important;
				background: var(--text-color);
				border-radius: 50%;
				display: flex;
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
