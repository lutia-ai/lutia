<script lang="ts">
	import { darkMode, inputPricing } from '$lib/stores.ts';
	import { get } from 'svelte/store';
    import { signOut } from '@auth/sveltekit/client';

	import MoonIcon from '$lib/components/icons/MoonIcon.svelte';
	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
    import LogOutIcon from '$lib/components/icons/LogOutIcon.svelte';
    import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import Switch from '$lib/components/Switch.svelte';

    export let isSettingsOpen: boolean 

	let darkModeOn: boolean = get(darkMode);

	// Toggles dark mode and updates the body class.
	function toggleDarkMode(darkModeOn: boolean) {
		darkMode.set(darkModeOn);
		window.document.body.classList.toggle('dark');
	}

	// Handles the toggle event from the Switch component.
	function handleToggle(event: CustomEvent) {
		toggleDarkMode(event.detail.on);
	}
</script>

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
<div
	class="setting"
	role="button"
	tabindex="0"
	on:click|stopPropagation={() => {
		isSettingsOpen = true;
	}}
	on:keydown|stopPropagation={(e) => {
		if (e.key === 'Enter') {
			isSettingsOpen = true;
		}
	}}
>
	<div class="icon-container">
		<SettingsIcon color="var(--text-color-light)" />
	</div>
	<p>Settings</p>
</div>
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

<style lang="scss">
	.setting {
		color: var(--text-color);
		cursor: pointer;
		display: flex;
		gap: 10px;
		padding: 15px 25px;
		transition: none;

		&:hover {
			background: var(--bg-color-light-opacity);
		}

		.icon-container {
			width: 20px;
			height: 20px;
		}

		p {
			flex: 1;
			margin: auto 0;
			font-size: 15px;
			color: var(--text-color-light);
		}

		.switch-wrapper {
			margin: auto auto auto 20px;
		}
	}
</style>
