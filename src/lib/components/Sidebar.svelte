<script>
	import { fly } from 'svelte/transition';
	import { page } from "$app/stores";
	import {
		numberPrevMessages,
		clearChatHistory,
		darkMode,
		showPricing,
		showLegacyModels,
		chosenCompany
	} from '$lib/stores.js';
	import { modelDictionary } from '$lib/modelDictionary.ts';

	import SettingsContainer from '$lib/components/SettingsContainer.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import Switch from '$lib/components/Switch.svelte';

	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import DropdownIcon from '$lib/components/icons/DropdownIcon.svelte';
	import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';

	export let companySelection;
	export let gptModelSelection;
	export let chosenModel;

	/**
	 * Controls the visibility of the model dropdown.
	 * @type {boolean}
	 */
	let modelDropdownOpen = false;

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
	 * Updates the chosen company and resets the model selection based on the new company.
	 * @param {string} company - The name of the selected company.
	 */
	function selectCompany(company) {
		chosenCompany.set(company);
		companySelection = Object.keys(modelDictionary);
		companySelection = companySelection.filter((c) => c !== company);
		gptModelSelection = Object.keys(modelDictionary[$chosenCompany].models);
		gptModelSelection = Object.values(modelDictionary[$chosenCompany].models);
		chosenModel = gptModelSelection[0];
	}

	/**
	 * Updates the chosen model and resets the model selection list.
	 * @param {string} model - The name of the selected model.
	 */
	function selectModel(model) {
		chosenModel = model;
		gptModelSelection = Object.values(modelDictionary[$chosenCompany].models);
	}
	
</script>

<svelte:window
	on:click={() => {
		modelDropdownOpen = false;
		companyDropdownOpen = false;
		settingsOpen = false;
		contextOpen = false;
	}}
/>

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
					<svelte:component this={modelDictionary[$chosenCompany].logo} />
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
			on:click|stopPropagation={() => (modelDropdownOpen = !modelDropdownOpen)}
			on:keydown|stopPropagation={(e) => {
				if (e.key === 'Enter') modelDropdownOpen = !modelDropdownOpen;
			}}
		>
			<div
				class="options-container chosen-llm"
				style="
					background: {modelDropdownOpen ? 'var(--bg-color-light)' : ''};
				"
			>
				<p class="chosen-model-p">{chosenModel.name}</p>
				<div class="dropdown-icon">
					<DropdownIcon color="var(--text-color)" />
				</div>
			</div>
			{#if modelDropdownOpen}
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
									modelDropdownOpen = false;
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
					isRotating = true;
					setTimeout(() => {
						isRotating = false;
					}, 500);
				}}
				on:keydown|stopPropagation={(e) => {
					if (e.key === 'Enter') {
						clearChatHistory();
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
								on:change={(e) => numberPrevMessages.set(e.detail.value)}
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
				{#if $page.data.session}
			        <img class="user-profile-img" src={$page.data.session.user?.image} alt="User profile" />
			    {:else}
					<SettingsIcon color="var(--text-color-light)" />
			    {/if}
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


<style lang="scss">
	.sidebar {
		position: fixed;
		display: flex;
		flex-direction: column;
		height: 100%;
		z-index: 10001;
		padding: 10px 0px;
		width: 65px;

		.company-and-llm-container {
			position: relative;
			display: flex;

			.company-container {
				position: relative;
				display: flex;
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

					.user-profile-img {
						position: absolute;
						width: 100%;
						left: 50%;
						top: 50%;
						transform: translate(-50%, -50%);
						border-radius: 50%;
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