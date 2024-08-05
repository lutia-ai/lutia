<script>
	import { darkMode } from '$lib/stores.js';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';

	import MoonIcon from '$lib/components/icons/MoonIcon.svelte';
	import Switch from '$lib/components/Switch.svelte';

	/** @type {boolean} */
	let darkModeOn = get(darkMode);

	/**
	 * Toggles dark mode and updates the body class.
	 * @param {boolean} darkModeOn - Whether dark mode should be enabled.
	 */
	function toggle(darkModeOn) {
		darkMode.set(darkModeOn);
		window.document.body.classList.toggle('dark');
	}

	/**
	 * Handles the toggle event from the Switch component.
	 * @param {CustomEvent} event - The custom event from the Switch component.
	 */
	function handleToggle(event) {
		toggle(event.detail.on);
	}
</script>

<div
	class="dark-mode-container"
	role="button"
	tabindex="0"
	on:click|stopPropagation={() => {
		darkModeOn = !darkModeOn;
		toggle(darkModeOn);
	}}
	on:keydown|stopPropagation={(e) => {
		if (e.key === 'Enter') {
			darkModeOn = !darkModeOn;
			toggle(darkModeOn);
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

<style lang="scss">
	.dark-mode-container {
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
			margin: auto 0;
			font-size: 15px;
			color: var(--text-color-light);
		}

		.switch-wrapper {
			margin: auto 0 auto 20px;
		}
	}
</style>
