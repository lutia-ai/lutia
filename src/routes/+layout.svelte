<script lang="ts">
	import { browser } from '$app/environment';
	import { darkMode } from '$lib/stores.ts';
	import { onMount } from 'svelte';
	import '@fontsource-variable/raleway';
	import Analytics from '$lib/components/Analytics.svelte';

	export let data: { colorScheme: string };

	let darkModeOn: boolean = data.colorScheme === 'dark';

	function checkColorScheme(event?: MediaQueryListEvent) {
		const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
		darkModeOn = prefersDarkScheme;
		setColorScheme(prefersDarkScheme);
	}

	function setColorScheme(isDark: boolean) {
		if (browser) {
			darkModeOn = isDark;
			darkMode.set(isDark);
			document.cookie = `color-scheme=${isDark ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`;
			if (isDark) {
				document.body.classList.add('dark');
			} else {
				document.body.classList.remove('dark');
			}
		}
	}

	darkMode.subscribe((value) => {
		setColorScheme(value);
	});

	onMount(() => {
		checkColorScheme();

		// Add event listener for color scheme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', checkColorScheme);

		return () => {
			mediaQuery.removeEventListener('change', checkColorScheme);
		};
	});
</script>

<Analytics />

<body class={darkModeOn ? 'dark' : ''}>
	<slot />
</body>

<style>
	:root {
		--bg-color: rgba(255, 255, 255, 1);
		--bg-color-light: rgba(233, 238, 246, 1);
		--bg-color-light-alt: rgba(233, 238, 246, 1);
		--bg-color-light-alt-opp: rgba(255, 255, 255, 1);
		--bg-color-light-opacity: rgba(233, 238, 246, 0.5);
		--bg-color-light-opacity-alt: rgba(233, 238, 246, 0.5);
		--bg-color-dark: rgba(200, 205, 213, 1);
		--bg-color-code: rgba(233, 238, 246, 1);

		--text-color: rgba(0, 0, 0, 1);
		--text-color-light: rgba(82, 83, 86, 1);
		--text-color-light-opacity: rgba(82, 83, 86, 0.5);
		--text-color-hover: rgba(46, 56, 66, 0.9);
		/* --text-code:  */
	}

	:global(body) {
		background: var(--bg-color);
		color: var(--text-color);
	}

	:global(body.dark) {
		--bg-color: rgba(25, 25, 25, 255);
		--bg-color-light: rgba(42, 42, 42, 1);
		--bg-color-light-alt: rgba(80, 80, 80, 1);
		--bg-color-light-alt-opp: rgba(42, 42, 42, 1);
		--bg-color-light-opacity: rgba(42, 42, 42, 0.5);
		--bg-color-light-opacity-alt: rgba(80, 80, 80, 1);
		--bg-color-dark: rgba(80, 80, 80, 1);
		--bg-color-code: rgba(46, 56, 66, 255);

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
