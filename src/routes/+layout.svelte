<script>
	import { darkMode } from '$lib/stores.js';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	/** @type {boolean} */
	let darkModeOn;

	/**
	 * Checks the current color scheme preference and updates the dark mode state.
	 */
	function checkColorScheme() {
		const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
		darkModeOn = prefersDarkScheme;
		toggle(darkModeOn);
	}

	/**
	 * Toggles the dark mode state and updates the body class.
	 * @param {boolean} darkModeOn - Whether dark mode should be enabled.
	 */
	function toggle(darkModeOn) {
		darkMode.set(darkModeOn);
		window.document.body.classList.toggle('dark');
	}

	/**
	 * Initializes the dark mode state and sets up event listeners.
	 */
	onMount(() => {
		if (typeof window !== 'undefined') {
			const hasDarkClass = document.body.classList.contains('dark');
			darkMode.set(hasDarkClass);
			darkModeOn = hasDarkClass;
		}

		// Add event listener for color scheme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', checkColorScheme);

		return () => {
			mediaQuery.removeEventListener('change', checkColorScheme);
		};
	});
</script>

<svelte:head>
	{#if typeof window !== 'undefined'}
		<script>
			// Check for dark mode preference and apply it immediately
			if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
				document.body.classList.add('dark');
			}
		</script>
	{/if}
</svelte:head>

<body>
	<slot />
</body>

<style>
	:root {
		--bg-color: rgba(255, 255, 255, 1);
		--bg-color-light: rgba(233, 238, 246, 1);
		--bg-color-light-alt: rgba(233, 238, 246, 1);
		--bg-color-light-opacity: rgba(233, 238, 246, 0.5);
		--bg-color-dark: rgba(200, 205, 213, 1);

		--text-color: rgba(0, 0, 0, 1);
		--text-color-light: rgba(82, 83, 86, 1);
		--text-color-light-opacity: rgba(82, 83, 86, 0.5);
		--text-color-hover: rgba(46, 56, 66, 0.9);
	}

	:global(body) {
		background: var(--bg-color);
		color: var(--text-color);
	}

	:global(body.dark) {
		--bg-color: rgba(25, 25, 25, 255);
		--bg-color-light: rgba(42, 42, 42, 1);
		--bg-color-light-alt: rgba(80, 80, 80, 1);
		--bg-color-light-opacity: rgba(42, 42, 42, 0.5);
		--bg-color-dark: rgba(80, 80, 80, 1);

		--text-color: rgba(255, 255, 255, 1);
		--text-color-light: rgba(173, 172, 169, 1);
		--text-color-light-opacity: rgba(173, 172, 169, 0.5);
		--text-color-hover: rgba(220, 220, 220, 0.9);
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
</style>
