<script>
	/*import Highlight, { LineNumbers } from "svelte-highlight";*/
	import { HighlightAuto, LineNumbers } from "svelte-highlight";
	import typescript from "svelte-highlight/languages/typescript";
	import python from "svelte-highlight/languages/python";
	import ashes from "svelte-highlight/styles/ashes";
	import atelierSeaside from "svelte-highlight/styles/atelier-seaside";
	import atelierSulphurpool from "svelte-highlight/styles/atelier-sulphurpool";
	import base16IrBlack from "svelte-highlight/styles/base16-ir-black";
	import base16Monokai from "svelte-highlight/styles/base16-monokai";
	import bright from "svelte-highlight/styles/bright";
	import colors from "svelte-highlight/styles/colors";
	import githubDark from "svelte-highlight/styles/github-dark";
	import synthMidnightTerminalDark from "svelte-highlight/styles/synth-midnight-terminal-dark";
	import windows10 from "svelte-highlight/styles/windows-10";
	import windowsNt from "svelte-highlight/styles/windows-nt";
	

	import AnthropicIcon from '$lib/components/icons/Anthropic.svelte';
	import OpenAiIcon from '$lib/components/icons/OpenAiIcon.svelte';
	import ClaudeIcon from '$lib/images/claude.png';
	import ChatGPTIcon from '$lib/components/icons/chatGPT.svelte';


	let prompt = '';
	let placeholderVisible = true;

	let chatHistory = [];

	let dropdownOpen = false;
	let companyDropdownOpen = false;

	const modelDictionary = {
		openAI: {
			logo: OpenAiIcon,
			models: {
			    "GPT 4o": "gpt-4o",
			    "GPT 4 Turbo": "gpt-4-turbo",
			    "GPT 4": "gpt-4",
			    "GPT 3.5 Turbo": "gpt-3.5-turbo",
			}
		},
		anthropic: {
			logo: AnthropicIcon,
			models: {
			    "Claude 3.5 Sonnet": "claude-3-5-sonnet-20240620",
			    "Claude 3 Opus": "claude-3-opus-20240229",
			    "Claude 3 Sonnet": "claude-3-sonnet-20240229",
			    "Claude 3 Haiku": "claude-3-haiku-20240307",
			}
		},
	}

	let chosenCompany = "anthropic";
	let companySelection = Object.keys(modelDictionary);
	companySelection = companySelection.filter(c => c !== chosenCompany);

	let gptModelSelection = Object.keys(modelDictionary[chosenCompany].models);
	let chosenModel = gptModelSelection[0];

	function selectCompany(company) {
		chosenCompany=company;
		companySelection = Object.keys(modelDictionary);
		companySelection = companySelection.filter(c => c !== company);
		gptModelSelection=Object.keys(modelDictionary[chosenCompany].models);
		chosenModel = gptModelSelection[0];
        gptModelSelection = gptModelSelection.slice(1); 
	}

	function selectModel(model) {
		chosenModel=model;
		gptModelSelection = Object.keys(modelDictionary[chosenCompany].models);
		gptModelSelection = gptModelSelection.filter(m => m !== model);
	}

	function extractCodeBlock(inputString) {
	    // Use a regular expression to match everything after the first ```
		const match = inputString.match(/```[a-zA-Z]+\n([\s\S]*)/);

		if (!match) {
		    return null
		} 
	    return match[1];
	}

	async function submitPrompt() {

		prompt = prompt.replace(/&nbsp;/g, ' ');
        if (prompt.trim()) {
            let userPrompt = {
                by: 'user',
                text: prompt.trim()
            };

	            // Add user's message to chat history
	        chatHistory = [...chatHistory, userPrompt];
	        
	        // Initialize AI's response in chat history
	        chatHistory = [...chatHistory, { by: chosenCompany, text: '' }];

	        const uri = chosenCompany === "anthropic"
	        	? '/api/claude'
	        	: '/api/chatGPT';
			

            const response = await fetch(uri, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt.trim(), model: modelDictionary[chosenCompany].models[chosenModel] }),
            });

			prompt = '';
	        placeholderVisible = true;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseText = '';

		    let isInCodeBlock = false;
		    let codeBlockContent = '';
		    let language = '';
		    let responseComponents = [];

		    while (true) {
		        const { value, done } = await reader.read();
		        if (done) break;
		        const newText = decoder.decode(value);
		        responseText += newText;

		        // Check for beginning of code block
		        if (newText.includes('```') && !isInCodeBlock) {
		            isInCodeBlock = true;
		            codeBlockContent = extractCodeBlock(newText);
		           	const langMatch = newText.match(/```(\w+)/);
			        language = langMatch ? langMatch[1] : '';
		            if (responseComponents.length > 0 && responseComponents[responseComponents.length - 1].type === 'text') {
		                responseComponents[responseComponents.length - 1].content += newText.split('```')[0];
		            }

		            if (codeBlockContent) {
		            	responseComponents.push({
			                type: 'code',
			                language,
			                code: codeBlockContent
			            });
		            }
		            continue;
		        }

		        // Check for end of code block
		        if (newText.includes('```') && isInCodeBlock) {
		            isInCodeBlock = false;
		            if (newText.split('```')[0]) {
		            	if (responseComponents.length > 0 && responseComponents[responseComponents.length - 1].type === 'code') {
			                responseComponents[responseComponents.length - 1].code += newText.split('```')[0];
			            } 
			                
		            }
		            if (newText.split('```')[1]) {
		                responseComponents.push({
		                    type: 'text',
		                    content: newText.split('```')[1]
		                });
		            }
		            continue;
		        }

		        if (isInCodeBlock) {
		            if (responseComponents.length > 0 && responseComponents[responseComponents.length - 1].type === 'code') {
		                responseComponents[responseComponents.length - 1].code += newText;
		            } else {
		            	responseComponents.push({
		                    type: 'code',
			                language,
			                code: newText
		                });
		            }
		        } else {
		            if (responseComponents.length > 0 && responseComponents[responseComponents.length - 1].type === 'text') {
		                responseComponents[responseComponents.length - 1].content += newText;
		            } else {
		                responseComponents.push({
		                    type: 'text',
		                    content: newText
		                });
		            }
		        }

		        // Update only the AI's response in chat history
		        chatHistory = chatHistory.map((msg, index) => 
		            index === chatHistory.length - 1 ? { ...msg, text: responseText, components: responseComponents } : msg
		        );
		    }

		    console.log(chatHistory[chatHistory.length-1]);
        }
    }


</script>

<svelte:head>
	{@html synthMidnightTerminalDark}
</svelte:head>

<svelte:window on:click={() => {dropdownOpen=false; companyDropdownOpen=false}} />

<div class="main">
	<div class="company-and-model-container">
		<div class="choose-company-container" on:click|stopPropagation={() => companyDropdownOpen=!companyDropdownOpen}>
			<div class="options-container">
				<div class="company-logo-container">
					<svelte:component this={modelDictionary[chosenCompany].logo} />
				</div>
			</div>
			{#if companyDropdownOpen}
				{#each companySelection as company}
					<div class="options-container" on:click={() => {
						selectCompany(company);
					}}>
						<div class="company-logo-container">
							<svelte:component this={modelDictionary[company].logo} />
						</div>
					</div>
				{/each}
			{/if}
		</div>
		<div class="choose-llm-model-container" on:click|stopPropagation={() => dropdownOpen=!dropdownOpen}>
			<div class="options-container chosen-llm">
				<p class="chosen-model-p">{chosenModel}</p>
			</div>
			{#if dropdownOpen}
				{#each gptModelSelection as model}
					<div class="options-container llm-options" on:click={() => {
						selectModel(model);
					}}>
						<p>{model}</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
	<div class="chat-history">
		{#each chatHistory as chat}
			{#if chat.by === 'user'}
				<div class="user-chat">
					<p>{chat.text}</p>
				</div>
			{:else}
				<div class="llm-container">
					{#if chat.by === "anthropic"}
						<div class="claude-icon-container">
							<img src={ClaudeIcon}>
						</div>
					{:else if chat.by === "openAI"}
						<div class="gpt-icon-container">
							<ChatGPTIcon color="black" />
						</div>
					{/if}
					<div class="llm-chat">
						{#each chat.components || [] as component}
				            {#if component.type === 'text'}
				                <p class="content-paragraph">
				                    {component.content.trim()}
				                </p>
				            {:else if component.type === 'code'}
					            <div class="code-container">
					            	<div class="code-header">
					            		<p>{component.language}</p>
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
		<div class="prompt-bar">
			<div 
				contenteditable 
				bind:innerHTML={prompt} 
				on:input={() => placeholderVisible = false}
				on:keydown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						submitPrompt();
					}
				}}
			>
			    
			</div>
			<span 
				class="placeholder" 
				style="display: {placeholderVisible || prompt.length === 0 ? 'block' : 'none'};"
			>
				Enter a prompt here
			</span>
		</div>
	</div>
</div>


<style lang=scss>

	.main {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		font-family: 'Albert Sans', sans-serif;

		.logo-container {
			position: fixed;
			width: 80px;
			padding: 30px;

			img {
				width: 100%;
			}
		}

		.company-and-model-container {
			position: fixed;
			padding: 10px 20px;
			display: flex;
			cursor: pointer;
			z-index: 10;

			.choose-company-container {
				// border-radius: 50%;
				// overflow: hidden;
			}

			.choose-llm-model-container {
				border-radius: 10px !important;
				display: flex;
				flex-direction: column;
				transition: all 0.3s ease;
				cursor: pointer;
				background: white;
			}

			.company-logo-container {
				width: 50px;
				height: 50px;
			}

			.options-container {
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
				}

				.chosen-model-p {
					margin: auto 0;
					font-size: 18px;
				}

				&:hover {
					background: rgba(0, 0, 0, .075);
				}
			}

			.chosen-llm {
				border-radius: 10px !important;
				padding: 5px 15px;
			}

			.llm-options {
				border-radius: 10px !important;
				padding: 5px 15px;

			}

		}

		.chat-history {
			width: 850px;
			margin: 50px auto 0 auto;
			padding-bottom: 200px;
			display: flex;
			flex-direction: column;
			gap: 50px;

			.user-chat {
				border-radius: 20px;
				background: rgba(233,238,246,255);
				padding: 10px 20px;
				width: max-content;
				max-width: 500px;
				margin-left: auto;

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
					border: 1px solid rgba(0,0,0,0.1);
				}

				.claude-icon-container {
					width: 28px !important;
					height: 18px !important;
					padding: 8px 4px;

					img {
						width: 100%;
					}
				}

				.llm-chat {
					flex: 1;
					width: 420px;
					padding: 3px;

					.content-paragraph {
						padding: 0;
						margin: 0;
						font-weight: 300;
						line-height: 30px;
						white-space: pre-wrap;
					}
				}
			}
		}

		.code-container {
			overflow: hidden;
			border-radius: 10px;
			margin: 20px 0;

			.code-header {
				padding: 10px 20px;
				background: rgba(46,56,66,255);

				p {
					margin: 0;
					line-height: 15px !important;
					color: rgba(255,255,255,0.65);
					font-weight: 300;
					font-size: 12px;
				}
			}
		}

		.prompt-bar-wrapper {
			position: fixed;
			left: 50%;
			bottom: 0%;
			transform: translateX(-50%);
			width: 100%;
			background: white;
			z-index: 1000;

			.prompt-bar {
				position: relative;
				margin: auto auto 30px auto;
				width: 900px;
				height: max-content;
				background: rgba(233,238,246,255);
				border-radius: 40px;

				div[contenteditable]{
				    max-height: 350px;
				    overflow: auto;
				    outline: none;
				    font-weight: 300;
				    padding: 20px 30px; 
				}

				.placeholder {
					position: absolute;
					top: 50%;
					left: 30px;
					transform: translateY(-50%);
					color: rgba(0, 0, 0, .65);
					font-weight: 300 !important;
					pointer-events: none;
				}
			}
		}
	}
</style>