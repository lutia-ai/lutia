<script lang="ts">
	import BurgerIcon from '$lib/components/icons/BurgerIcon.svelte';
	import SettingsComponent from '$lib/components/settings/Settings.svelte';
	import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import {
		chosenCompany,
		companySelection,
		contextWindowOpen,
		conversationsOpen,
		filesSidebarOpen,
		isContextWindowAuto,
		isLargeScreen,
		isSettingsOpen,
		mobileSidebarOpen
	} from '$lib/stores';
	import { onMount } from 'svelte';
	import ConversationsSideBar from '$lib/components/sidebar/ConversationsSideBar.svelte';
	import ContextWindowSideBar from '$lib/components/sidebar/ContextWindowSideBar.svelte';
	// import FilesSideBar from '$lib/components/sidebar/FilesSideBar.svelte';
	import type { UserWithSettings } from '$lib/types/types.js';

	export let data;

	let user: UserWithSettings = data.user;

	companySelection.set($companySelection.filter((c) => c !== $chosenCompany));

	let windowWidth = browser ? window.innerWidth : 0;

	$: if ($isContextWindowAuto) {
		contextWindowOpen.set(false);
	}

	const handleResize = () => {
		windowWidth = window.innerWidth;
		isLargeScreen.set(windowWidth > 810);
		if ($isLargeScreen) mobileSidebarOpen.set(false);
	};

	onMount(async () => {
		isLargeScreen.set(windowWidth > 810);
		window.addEventListener('resize', handleResize);
	});
</script>

<main>
	<div transition:fade={{ duration: 300, delay: 0 }}>
		{#if $conversationsOpen}
			<ConversationsSideBar paymentTier={data.user.payment_tier} />
		{:else if $contextWindowOpen}
			<ContextWindowSideBar />
		{/if}
		{#if !$mobileSidebarOpen && !$isLargeScreen}
			<div class="floating-sidebar">
				<div
					class="burger-icon"
					transition:fly={{
						delay: 150,
						duration: 300,
						x: -250 // 'x' or 'y'
					}}
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => {
						mobileSidebarOpen.set(true);
						// Close any open sidebars
						conversationsOpen.set(false);
						contextWindowOpen.set(false);
						filesSidebarOpen.set(false);
					}}
					on:keydown|stopPropagation={(e) => {
						if (e.key === 'Enter') {
							mobileSidebarOpen.set(true);
							// Close any open sidebars
							conversationsOpen.set(false);
							contextWindowOpen.set(false);
							filesSidebarOpen.set(false);
						}
					}}
				>
					<BurgerIcon color="var(--text-color)" strokeWidth="1" />
				</div>
			</div>
		{/if}
		<Sidebar {user} userImage={data.userImage} isMobile={!$isLargeScreen} />
		{#if $isSettingsOpen}
			<SettingsComponent bind:user />
		{/if}
	</div>
	<slot />
</main>

<style lang="scss">
	* {
		-webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
	}

	.floating-sidebar {
		position: fixed;
		display: flex;
		flex-direction: column;
		/* // height: 100%; // if height is 100% then floating sidebar covers buttons */
		z-index: 10001;
		width: 65px;
		padding-top: 5px;
		z-index: 10000;

		.burger-icon {
			margin: 0 auto;
			padding: 0 11px;
			background: var(--bg-color);
			border-radius: 25%;
			cursor: pointer;
			width: 53px;
			height: 53px;
			box-sizing: border-box;
		}
	}
</style>
