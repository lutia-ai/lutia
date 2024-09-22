<script lang="ts">
	import { onMount } from 'svelte';
	import { signIn } from '@auth/sveltekit/client';
	import { darkMode, inputPricing, numberPrevMessages } from '$lib/stores.ts';
	import { get } from 'svelte/store';
	import { signOut } from '@auth/sveltekit/client';

	import MoonIcon from '$lib/components/icons/MoonIcon.svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
	import LogOutIcon from '$lib/components/icons/LogOutIcon.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import type { User } from '$lib/types';
	import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte';
	import Slider from '$lib/components/Slider.svelte';

	let darkModeOn: boolean = get(darkMode);
	let userDetails: User;

	// Toggles dark mode and updates the body class.
	function toggleDarkMode(darkModeOn: boolean) {
		darkMode.set(darkModeOn);
		// window.document.body.classList.toggle('dark');
	}

	// Handles the toggle event from the Switch component.
	function handleToggle(event: CustomEvent) {
		toggleDarkMode(event.detail.on);
	}

	async function getAccountDetails() {
		try {
			const response = await fetch('?/getAccountDetails', {
				method: 'POST',
				body: new FormData()
			});
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				const user = result.data;
				userDetails = {
					id: user.id,
					name: user.name,
					email: user.email,
					oauth: user.oauth
				};
			} else if (result.type === 'failure' && result.data) {
				console.error('Failed to fetch account details');
			}
		} catch (error) {
			console.error('Error clearing chat history:', error);
		}
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

	onMount(async () => {
		getAccountDetails();
	});
</script>

<div>
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
			inputPricing.set(!$inputPricing);
		}}
		on:keydown|stopPropagation={(e) => {
			if (e.key === 'Enter') {
				inputPricing.set(!$inputPricing);
			}
		}}
	>
		<div class="icon-container">
			<DollarIcon color="var(--text-color-light)" />
		</div>
		<p>Input pricing</p>
		<div class="switch-wrapper">
			<Switch bind:on={$inputPricing} />
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
			on:change={(e) => numberPrevMessages.set(e.detail.value)}
		/>
		<p>max</p>
	</div>
	<h1>Account</h1>
	{#if userDetails && userDetails.oauth !== 'google'}
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
			<p>Link Google account <span>Must link with {userDetails.email}</span></p>
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
	h1 {
		font-size: 20px;
		margin: 30px 35px 20px 35px;
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

	.context {
		color: var(--text-color);
		display: flex;
		gap: 10px;
		padding: 35px 35px 0 35px;
		transition: none;
		cursor: default;

		&:hover {
			background: inherit !important;
		}

		p {
			flex: none;
		}
	}

	.slider-container {
		display: flex;
		gap: 5px;
		padding: 20px 35px;
		--track-bgcolor: var(--text-color-light-opacity);
		--track-highlight-bg: linear-gradient(90deg, var(--text-color), var(--text-color-light));
		--tooltip-bgcolor: var(--text-color);
		--tooltip-bg: linear-gradient(90deg, var(--text-color), var(--text-color-light));
		--tooltip-text: var(--bg-color);
	}
</style>
