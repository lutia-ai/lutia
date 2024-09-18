<script lang="ts">
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
	import UsageIcon from '$lib/components/icons/UsageIcon.svelte';

	import GeneralSettingsPage from '$lib/components/settings/GeneralSettingsPage.svelte';
	import BillingSettingsPage from '$lib/components/settings/BillingSettingsPage.svelte';
	import UsageSettingsPage from '$lib/components/settings/UsageSettingsPage.svelte';

	export let isOpen: boolean;

	const settingsTabs = [
		{
			name: 'General',
			icon: SettingsIcon,
			window: GeneralSettingsPage
		},
		{
			name: 'Billing',
			icon: DollarIcon,
			window: BillingSettingsPage
		},
		{
			name: 'Usage',
			icon: UsageIcon,
			window: UsageSettingsPage
		}
	];

	let selectedTab = settingsTabs[0];

	// @ts-ignore
	const wheel = (node: HTMLElement, options) => {
		let { scrollable } = options;

		// @ts-ignore
		const handler = (e) => {
			if (!scrollable) e.preventDefault();
		};

		node.addEventListener('wheel', handler, { passive: false });

		return {
			// @ts-ignore
			update(options) {
				scrollable = options.scrollable;
			},
			destroy() {
				// @ts-ignore
				node.removeEventListener('wheel', handler, { passive: false });
			}
		};
	};
</script>

<!-- <svelte:window use:wheel={{ isOpen }} /> -->

<div class="settings-container">
	<div class="settings-panel">
		<div class="title-container">
			<h1>Settings</h1>
			<button on:click={() => (isOpen = false)}>
				<CrossIcon color="var(--text-color)" />
			</button>
		</div>
		<div class="settings-body">
			<div class="settings-sidebar">
				{#each settingsTabs as tab}
					<div
						class="sidebar-option"
						style="background: {selectedTab.name === tab.name
							? 'var(--bg-color-light-opacity-alt)'
							: ''};"
						tabindex="0"
						role="button"
						on:click={() => (selectedTab = tab)}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') {
								selectedTab = tab;
							}
						}}
					>
						<div class="icon-container">
							<svelte:component this={tab.icon} color="var(--text-color-light)" />
						</div>
						<p>{tab.name}</p>
					</div>
				{/each}
			</div>
			<div class="settings-page">
				<svelte:component this={selectedTab.window} />
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.settings-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		z-index: 100000;
		background-color: rgba(0, 0, 0, 0.5);
		overflow: hidden;

		.settings-panel {
			position: relative;
			background: var(--bg-color-light-alt-opp);
			max-width: 1200px;
			width: 80%;
			min-width: 800px;
			height: 850px;
			margin: auto;
			border-radius: 10px;
			padding: 40px;
			box-sizing: border-box;
			display: flex;
			flex-direction: column;

			.title-container {
				position: relative;
				display: flex;
				flex: 1;
				padding: 10px;
				box-sizing: border-box;
				border-bottom: 1px solid var(--text-color-light-opacity);

				h1 {
					margin: auto 0;
				}

				button {
					background: transparent;
					border: none;
					width: 40px;
					height: 40px;
					margin-left: auto;
					cursor: pointer;
					border-radius: 10px;
					padding: 0;

					&:hover {
						background: var(--bg-color-light-opacity-alt);
					}
				}
			}

			.settings-body {
				position: relative;
				display: flex;
				height: 100%;
				width: 100%;
				flex: 12;

				.settings-sidebar {
					border-right: 1px solid var(--text-color-light-opacity);
					height: 100%;
					border-radius: 10px;
					border-top-left-radius: 0;
					overflow: hidden;
					flex: 1;
					min-width: 130px;

					.sidebar-option {
						width: 100%;
						padding: 15px 5px 15px 10px;
						box-sizing: border-box;
						display: flex;
						gap: 15px;
						cursor: pointer;
						border-radius: 5px 0 0 5px;

						&:hover {
							background-color: var(--bg-color-light-opacity-alt);
						}

						&:first-child {
							border-top-left-radius: 0;
						}

						.icon-container {
							width: 25px;
							height: 25px;
							margin: auto 0;
						}

						p {
							margin: auto 0;
							font-size: clamp(14px, 1.4vw, 16px);
						}
					}
				}

				.settings-page {
					width: 100%;
					height: 680px;
					padding: 10px;
					flex: 4;
				}
			}
		}
	}
</style>
