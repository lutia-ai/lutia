<script lang="ts">
	import { deserialize } from '$app/forms';
	import { signIn } from '@auth/sveltekit/client';
	import { darkMode, numberPrevMessages } from '$lib/stores.ts';
	import { get } from 'svelte/store';
	import { signOut } from '@auth/sveltekit/client';

	import MoonIcon from '$lib/components/icons/MoonIcon.svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
	import LogOutIcon from '$lib/components/icons/LogOutIcon.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import type { UserWithSettings } from '$lib/types';
	import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import MouseCircleIcon from '../icons/MouseCircleIcon.svelte';
	import { saveUserSettings } from '$lib/chatHistory';
	import { PaymentTier } from '@prisma/client';

	export let user: UserWithSettings;

	let darkModeOn: boolean = get(darkMode);
	let companyDropdownOpen: boolean = user.user_settings?.company_menu_open ?? true;
	let promptPricingVisible: boolean = user.user_settings?.prompt_pricing_visible ?? true;
	let showContextWindowButton: boolean = user.user_settings?.show_context_window_button ?? true;

	$: if (companyDropdownOpen || !companyDropdownOpen) {
		// makes sure it only runs when there is a change
		if (user.user_settings!.company_menu_open !== companyDropdownOpen) {
			user.user_settings!.company_menu_open = companyDropdownOpen;
			saveUserSettings(user.user_settings!);
		}
	}

	$: if (promptPricingVisible || !promptPricingVisible) {
		// makes sure it only runs when there is a change
		if (user.user_settings!.prompt_pricing_visible !== promptPricingVisible) {
			user.user_settings!.prompt_pricing_visible = promptPricingVisible;
			saveUserSettings(user.user_settings!);
		}
	}

	$: if (showContextWindowButton || !showContextWindowButton) {
		// makes sure it only runs when there is a change
		if (user.user_settings!.show_context_window_button !== showContextWindowButton) {
			user.user_settings!.show_context_window_button = showContextWindowButton;
			saveUserSettings(user.user_settings!);
		}
	}

	// Toggles dark mode and updates the body class.
	function toggleDarkMode(darkModeOn: boolean) {
		darkMode.set(darkModeOn);
	}

	// Handles the toggle event from the Switch component.
	function handleToggle(event: CustomEvent) {
		toggleDarkMode(event.detail.on);
	}

	// handles the save user settings from the slider change
	function handleSaveSettings() {
		saveUserSettings(user.user_settings!);
	}

	async function linkGoogle() {
		const response = await fetch('/api/link-google', { method: 'GET' });
		const data = await response.json();
		if (data.linkingToken) {
			const callbackUrl = `/?linkingToken=${data.linkingToken}`;
			signIn(
				'google',
				{ callbackUrl, linkingToken: data.linkingToken },
				{ linkingToken: data.linkingToken }
			);
		} else {
			// Handle error
			console.error('Failed to initiate Google linking');
		}
	}
</script>

<div class="general-settings-body">
	<h1>Appearance</h1>
	<div
		class="setting"
		role="button"
		tabindex="0"
		on:click|stopPropagation={() => {
			darkModeOn = !darkModeOn;
			toggleDarkMode(darkModeOn);
		}}
		on:keydown|stopPropagation={(e) => {
			if (e.key === 'Enter') {
				darkModeOn = !darkModeOn;
				toggleDarkMode(darkModeOn);
			}
		}}
	>
		<div class="icon-container">
			<MoonIcon color="var(--text-color-light)" />
		</div>
		<p>Dark mode</p>
		<div class="switch-wrapper">
			<Switch bind:on={darkModeOn} on:toggle={handleToggle} />
		</div>
	</div>
	<div
		class="setting"
		role="button"
		tabindex="0"
		on:click|stopPropagation={() => {
			promptPricingVisible = !promptPricingVisible;
		}}
		on:keydown|stopPropagation={(e) => {
			if (e.key === 'Enter') {
				promptPricingVisible = !promptPricingVisible;
			}
		}}
	>
		<div class="icon-container">
			<DollarIcon color="var(--text-color-light)" />
		</div>
		<p>Prompt pricing</p>
		<div class="switch-wrapper">
			<Switch bind:on={promptPricingVisible} />
		</div>
	</div>
	<h4>Sidebar</h4>
	<div
		class="setting"
		role="button"
		tabindex="0"
		on:click|stopPropagation={() => {
			companyDropdownOpen = !companyDropdownOpen;
		}}
		on:keydown|stopPropagation={(e) => {
			if (e.key === 'Enter') {
				companyDropdownOpen = !companyDropdownOpen;
			}
		}}
	>
		<div class="icon-container">
			<MouseCircleIcon color="var(--text-color-light)" />
		</div>
		<p>Always show companies</p>
		<div class="switch-wrapper">
			<Switch bind:on={companyDropdownOpen} />
		</div>
	</div>
	<!-- {#if user.payment_tier === PaymentTier.PayAsYouGo}
		<div
			class="setting"
			role="button"
			tabindex="0"
			on:click|stopPropagation={() => {
				showContextWindowButton = !showContextWindowButton;
			}}
			on:keydown|stopPropagation={(e) => {
				if (e.key === 'Enter') {
					showContextWindowButton = !showContextWindowButton;
				}
			}}
		>
			<div class="icon-container">
				<ContextWindowIcon color="var(--text-color-light)" />
			</div>
			<p>Show Context window button</p>
			<div class="switch-wrapper">
				<Switch bind:on={showContextWindowButton} />
			</div>
		</div>
		<h1>Context window</h1>
		<h2>
			The context window adjusts how many of your previous messages will get sent with your
			prompt.<br /><br />
			The more previous messages you include, the more memory the AI will have of your conversation,
			but the higher the cost of the message.
		</h2>
		<div class="context setting">
			<div class="icon-container">
				<ContextWindowIcon color="var(--text-color-light)" />
			</div>
			<p style="font-weight: 600;">Shortcut:</p>
			<p style="font-weight: 600;">CTRL + [0-9]</p>
		</div>
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
	{/if} -->
	<h1>Account</h1>
	{#if user.oauth !== 'google'}
		<div
			class="setting"
			tabindex="0"
			role="button"
			on:click|stopPropagation={() => {
				linkGoogle();
			}}
			on:keydown|stopPropagation={(e) => {
				if (e.key === 'Enter') {
					linkGoogle();
				}
			}}
		>
			<div class="google-icon-container">
				<GoogleIcon padding="2px" />
			</div>
			<p>Link Google account <span>Must link with {user.email}</span></p>
		</div>
	{/if}
	<div
		class="setting"
		role="button"
		tabindex="0"
		on:click|stopPropagation={() => {
			signOut();
		}}
		on:keydown|stopPropagation={(e) => {
			if (e.key === 'Enter') {
				signOut();
			}
		}}
	>
		<div class="icon-container">
			<LogOutIcon color="var(--text-color-light)" />
		</div>
		<p>Log out</p>
	</div>
</div>

<style lang="scss">
	.general-settings-body {
		position: relative;
		width: 100%;
		height: 100%;
		overflow-y: scroll !important;
		padding: 0 20px;
		padding-bottom: 40px;
		box-sizing: border-box;

		h1 {
			font-size: 20px;
			margin: 30px 35px 20px 35px;
		}

		h4 {
			margin: 35px 35px 0 35px;
			font-size: 16px;
		}

		h2 {
			margin: 0px 35px;
			font-size: 16px;
			font-weight: 300;
			color: var(--text-color-light);
		}

		.setting {
			color: var(--text-color);
			cursor: pointer;
			display: flex;
			gap: 10px;
			padding: 20px 35px;
			transition: none;

			&:hover {
				background: var(--bg-color-light-opacity-alt);

				span {
					opacity: 1;
				}
			}

			.icon-container {
				width: 20px;
				height: 20px;
			}

			.google-icon-container {
				margin: auto 0;
				width: 30px;
				height: 30px;
				transform: translateX(-5px);
			}

			p {
				flex: 1;
				margin: auto 0;
				font-size: 15px;
				color: var(--text-color-light);
				display: flex;

				span {
					font-size: 12px;
					color: var(--text-color-light);
					margin: auto 0 auto auto;
					opacity: 0;
					transition: all 0.3s ease;
				}
			}

			.switch-wrapper {
				margin: auto auto auto 20px;
			}
		}
	}

	/* Scrollbar track */
	::-webkit-scrollbar {
		width: 10px;
	}

	/* Scrollbar handle */
	::-webkit-scrollbar-thumb {
		background-color: #888;
		border-radius: 6px;
	}

	/* Scrollbar track background */
	::-webkit-scrollbar-track {
		background-color: var(--bg-color-light);
	}

	@media (max-width: 810px) {
		.general-settings-body {
			height: calc(100% - 65px);
			padding: 0 0;
			padding-bottom: 80px;
		}
	}
</style>
