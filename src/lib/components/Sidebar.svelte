<script lang="ts">
	import { fly } from 'svelte/transition';
	import { page } from '$app/stores';
	import { signIn } from '@auth/sveltekit/client';
	import {
		numberPrevMessages,
		darkMode,
		showPricing,
		showLegacyModels,
		chosenCompany,
		chatHistory
	} from '$lib/stores.ts';
	import { PaymentTier, type ApiProvider } from '@prisma/client';
	import type { Model, UserWithSettings } from '$lib/types';
	import { modelDictionary } from '$lib/modelDictionary.ts';

	import Slider from '$lib/components/Slider.svelte';
	import Switch from '$lib/components/Switch.svelte';

	import TickIcon from '$lib/components/icons/TickIcon.svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import DropdownIcon from '$lib/components/icons/DropdownIcon.svelte';
	import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';
	import AttachmentIcon from '$lib/components/icons/AttachmentIcon.svelte';
	import { modelLogos } from '$lib/modelLogos';
	import {
		clearChatHistory,
		formatModelEnumToReadable,
		saveUserSettings
	} from '$lib/chatHistory';
	import ImageIcon from './icons/ImageIcon.svelte';
	import LightningIcon from './icons/LightningIcon.svelte';
	import LightningReasoningIcon from './icons/LightningReasoningIcon.svelte';
	import CreateIcon from './icons/CreateIcon.svelte';
	import ConversationsIcon from './icons/ConversationsIcon.svelte';
	import ConversationsSideBar from './ConversationsSideBar.svelte';
	import { goto } from '$app/navigation';

	export let companySelection: ApiProvider[];
	export let gptModelSelection: Model[];
	export let chosenModel: Model;
	export let isSettingsOpen: boolean;
	export let user: UserWithSettings; // controls if the menu is always open
	export let userImage;
	export let conversationsOpen: boolean = false; // Add two-way binding for conversations sidebar

	// Controls the visibility of the model dropdown.
	let modelDropdownOpen: boolean = false;

	// Controls the visibility of the company dropdown.
	let companyDropdownOpen: boolean = user.user_settings?.company_menu_open ?? true;

	// Controls the visibility of the settings panel.
	let settingsOpen: boolean = false;

	// Controls the visibility of the context window.
	let contextOpen: boolean = false;

	// Controls if the context window sidebar button shows.
	let showContextWindowButton: boolean = user.user_settings?.show_context_window_button ?? true;

	// Indicates whether an animation is currently rotating.
	let isRotating: boolean = false;

	// handles if the company menu should be always open or open on hover
	$: if (user.user_settings || !user.user_settings) {
		companyDropdownOpen = user.user_settings?.company_menu_open ?? true;
		showContextWindowButton = user.user_settings?.show_context_window_button ?? true;
	}

	// handles the save user settings from the slider change
	function handleSaveSettings() {
		saveUserSettings(user.user_settings!);
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
</script>

<svelte:window
	on:click={() => {
		modelDropdownOpen = false;
		settingsOpen = false;
		contextOpen = false;
	}}
/>

{#if conversationsOpen}
	<ConversationsSideBar bind:conversationsOpen />
{/if}
<div class="sidebar" class:shifted={conversationsOpen}>
	<div class="company-and-llm-container">
		<div
			class="company-container"
			role="button"
			tabindex="0"
			on:click={() => (companyDropdownOpen = true)}
			on:keydown={(e) => {
				if (e.key === 'Enter') companyDropdownOpen = true;
			}}
			on:mouseenter={() => (companyDropdownOpen = true)}
			on:mouseleave={() => {
				if (!user.user_settings?.company_menu_open) {
					companyDropdownOpen = false;
				}
			}}
		>
			<div class="choose-company-container">
				<div
					class="company-logo-container selected"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						companyDropdownOpen = true;
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') companyDropdownOpen = true;
					}}
				>
					<svelte:component this={modelLogos[$chosenCompany].logo} />
				</div>
				{#each companySelection as company, index}
					{#if companyDropdownOpen}
						<div
							role="button"
							tabindex="0"
							on:click|stopPropagation={() => {
								selectCompany(company);
								if (!user.user_settings?.company_menu_open) {
									companyDropdownOpen = false;
								}
							}}
							on:keydown|stopPropagation={(e) => {
								if (e.key === 'Enter') {
									selectCompany(company);
									if (!user.user_settings?.company_menu_open) {
										companyDropdownOpen = false;
									}
								}
							}}
							in:fly={{ y: -50, duration: 600, delay: index * 75 }}
							out:fly={{ y: -50, duration: 450, delay: index * 50 }}
						>
							<div class="company-logo-container">
								<svelte:component this={modelLogos[company].logo} />
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
				<p class="chosen-model-p">{formatModelEnumToReadable(chosenModel.name)}</p>
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
									{#if model.generatesImages}
										<div class="icon">
											<ImageIcon color="var(--text-color)" />
										</div>
									{:else if model.reasons}
										<div class="icon">
											<LightningReasoningIcon color="var(--text-color)" />
										</div>
									{:else}
										<div class="icon">
											<LightningIcon color="var(--text-color)" />
										</div>
									{/if}
									<div class="split">
										<div class="main-content">
											<p>
												{formatModelEnumToReadable(model.name)}
												{#if $showPricing}
													<div class="pricing">
														<span>
															Input: ${Number(
																model.input_price.toFixed(3)
															)}
															{model.input_price > 0 ? '/ 1M' : ''}
														</span>
														<span>
															Output: ${Number(
																model.output_price.toFixed(3)
															)}
															/ {model.generatesImages
																? 'Image'
																: '1M'}
														</span>
													</div>
												{/if}
											</p>
										</div>
										<div class="description">
											{#if !model.legacy && model.description}
												<span>{model.description}</span>
											{/if}
										</div>
									</div>
									<div class="image">
										{#if model.handlesImages}
											<AttachmentIcon color="var(--text-color" />
										{/if}
									</div>
									{#if model.legacy}
										<div class="legacy">
											<p>Legacy</p>
										</div>
									{/if}
									<div
										class="selected-container"
										style="margin-left: {model.handlesImages ? '0' : 'auto'}"
									>
										{#if chosenModel.name === model.name}
											<div class="selected">
												<TickIcon color="var(--bg-color)" strokeWidth={3} />
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					{/each}
					<div class="toggles-container">
						<div class="toggle">
							<p style="color: {!$showLegacyModels ? 'var(--text-color-light)' : ''}">
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
		<!-- Conversations button -->
		{#if user.payment_tier === PaymentTier.Premium}
			<div class="settings-wrapper">
				<div
					class="settings-icon"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						conversationsOpen = !conversationsOpen;
						if (conversationsOpen) {
							contextOpen = false;
							settingsOpen = false;
						}
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							conversationsOpen = !conversationsOpen;
							if (conversationsOpen) {
								contextOpen = false;
								settingsOpen = false;
							}
						}
					}}
					style="padding: 8px;"
				>
					<div style="transform: scale(1.2);">
						<ConversationsIcon color="var(--text-color-light)" />
					</div>
					<p class="tag">View history</p>
				</div>
			</div>
			<div class="settings-wrapper">
				<div
					class="settings-icon"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						chatHistory.set([]);
						goto('/chat/new', { replaceState: true });
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							chatHistory.set([]);
							goto('/chat/new', { replaceState: true });
						}
					}}
					style="padding: 8px;"
				>
					<div>
						<CreateIcon color="var(--text-color-light)" />
					</div>
					<p class="tag">New chat</p>
				</div>
			</div>
		{:else}
			<div class="settings-wrapper">
				<div
					class="settings-icon"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						clearChatHistory();
						isRotating = true;
						goto('/chat/new', { replaceState: true });
						setTimeout(() => {
							isRotating = false;
						}, 500);
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							clearChatHistory();
							isRotating = true;
							goto('/chat/new', { replaceState: true });
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
		{/if}
		{#if showContextWindowButton}
			<div class="settings-wrapper">
				<div
					class="settings-icon"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						contextOpen = !contextOpen;
						settingsOpen = false;
					}}
					on:keydown={(e) => {
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
						on:keydown
					>
						<div class="open-container">
							<p>Previous messages included</p>
							<div class="slider-container">
								<p>0</p>
								<Slider
									value={$numberPrevMessages}
									on:change={(e) => {
										if (e.detail.value !== $numberPrevMessages) {
											numberPrevMessages.set(e.detail.value);
											handleSaveSettings();
										}
									}}
								/>
								<p>max</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
		<div class="settings-wrapper">
			<div
				class="settings-icon"
				role="button"
				tabindex="0"
				on:click|stopPropagation={() => {
					if ($page.data.user) {
						isSettingsOpen = true;
						contextOpen = false;
					} else {
						signIn('google');
					}
				}}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						isSettingsOpen = true;
						contextOpen = false;
					}
				}}
				style="
					pointer-events: {settingsOpen ? 'none' : ''};
					cursor: {settingsOpen ? 'default' : ''} !important;
                "
			>
				{#if userImage}
					<img class="user-profile-img" src={userImage} alt="User profile" />
				{:else}
					<div class="user-profile-noimg">
						<h1>
							{user.name[0]}
						</h1>
					</div>
				{/if}
				<p class="tag">Settings</p>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	* {
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
			Segoe UI Symbol !important;
	}
	.sidebar {
		position: fixed;
		display: flex;
		flex-direction: column;
		height: 100%;
		z-index: 10001;
		padding: 10px 0px;
		width: 65px;
		left: 0;
		transition: left 0.3s ease;

		&.shifted {
			left: 300px; /* Match the width of the conversations sidebar */
		}

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
					margin-left: 8px;
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

				.selected {
					background: var(--bg-color-light);
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
					user-select: none;
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
				left: calc(100% + 5px);
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
					border-radius: 6px !important;
					padding: 4px 12px;

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
					box-shadow:
						0 0 #0000,
						0 0 #0000,
						0 9px 9px 0px rgba(0, 0, 0, 0.01),
						0 2px 5px 0px rgba(0, 0, 0, 0.06);
					border-radius: 10px;
					display: flex;
					flex-direction: column;
					z-index: inherit;
					padding: 10px;
					min-width: 300px;
					cursor: default;
					max-height: calc(100vh - 120px);
					// height: 100%;
					overflow-y: auto;

					.llm-options {
						display: flex;
						flex-direction: column; /* Change to column for a list layout */
						min-height: 62px; /* Set a fixed height for uniformity */
						width: 100%; /* Ensure full width for each option */
						overflow: hidden;
						transition: all 0.3s ease;
						// margin: 5px 0; /* Add margin for spacing between options */
						gap: 5px;
						box-sizing: border-box; /* Include padding and border in the element's total width and height */

						// margin: 10px;

						.record {
							display: flex;
							gap: 20px;
							align-items: center;
							width: 100%;
							height: 100%;
							// padding: 0 10px;
							border-radius: 10px;
							color: var(--text-color);
							cursor: pointer;
							padding: 8px 2px;
							box-sizing: border-box;

							&:hover {
								background: var(--bg-color-light-alt);
							}

							.icon {
								display: flex;
								margin-left: 10px;
								width: 30px;
								height: 30px;
							}

							.split {
								display: flex;
								flex-direction: column;
								height: max-content;
								gap: 2px;
								// width: 80px;

								.main-content {
									display: flex;
									gap: 10px;
									align-items: center;
									width: 100%;
									height: 100%;
									// max-height: 30px;

									p {
										display: flex;
										// gap: 5px;
										flex-direction: column;
										margin: 0;
										padding: 0;
										width: 220px;

										.pricing {
											display: flex;
											gap: 10px;
											width: max-content;
											margin-top: 2px;

											span {
												text-align: left;
												color: var(--text-color-light);
												font-size: 12px;
											}
										}
									}
								}

								.description {
									display: flex;
									margin-right: 4px;

									span {
										width: 220px;
										font-size: 13px;
										color: var(--text-color-light);
									}
								}
							}

							.legacy {
								display: flex;
								border-radius: 20px;
								border: 1px solid var(--text-color-light-opacity);
								background: var(--bg-color-light);
								padding: 5px 10px;
								color: var(--text-color);

								p {
									width: max-content;
									font-size: 12px;
									color: var(--text-color-light);
									margin: 0;
								}
							}

							.image {
								display: flex;
								width: 20px;
								height: 20px;
							}

							.selected-container {
								width: 20px;
								height: 20px;
								margin: 0 10px;

								.selected {
									width: inherit;
									height: inherit;
									padding: 2px;
									box-sizing: border-box;
									border-radius: 50%;
									background: var(--text-color);
								}
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
					width: 45px;
					height: 45px;
					box-sizing: border-box;
					transition: all 0.3s ease-in-out;
					cursor: pointer;

					&:hover {
						background: var(--bg-color-light);

						.tag {
							opacity: 1;
						}
					}

					.tag {
						position: absolute;
						top: 50%;
						left: 120%;
						pointer-events: none;
						transform: translateY(-50%);
						opacity: 0;
						border-radius: 10px;
						padding: 10px;
						width: max-content;
						background: var(--bg-color-light);
						transition: all 0.1s ease;
					}

					.user-profile-img,
					.user-profile-noimg {
						position: absolute;
						width: 100%;
						left: 50%;
						top: 50%;
						transform: translate(-50%, -50%);
						border-radius: 50%;
					}

					.user-profile-noimg {
						background: #008080;
						width: inherit;
						height: inherit;
						display: flex;

						h1 {
							position: relative;
							margin: auto;
							padding: 0;
							width: max-content;
							font-size: 24px;
							font-weight: 400;
							color: var(--bg-color);
						}
					}
				}

				.settings-open-container {
					position: absolute;
					border: 1px solid var(--bg-color-dark);
					background: var(--bg-color);
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
