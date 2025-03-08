<script lang="ts">
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
	import UsageIcon from '$lib/components/icons/UsageIcon.svelte';

	import GeneralSettingsPage from '$lib/components/settings/GeneralSettingsPage.svelte';
	import BillingSettingsPage from '$lib/components/settings/BillingSettingsPage.svelte';
	import UsageSettingsPage from '$lib/components/settings/UsageSettingsPage.svelte';
	import type { ComponentType } from 'svelte';
	import type { UserWithSettings } from '$lib/types';

	export let isOpen: boolean;
	export let user: UserWithSettings;

	interface TabProps {
		user?: UserWithSettings;
	}

	interface SettingsTab {
		name: string;
		icon: ComponentType;
		window: ComponentType;
		props: TabProps;
	}

	const settingsTabs: SettingsTab[] = [
		{
			name: 'General',
			icon: SettingsIcon,
			window: GeneralSettingsPage,
			props: { user }
		},
		{
			name: 'Billing',
			icon: DollarIcon,
			window: BillingSettingsPage,
			props: { user }
		},
		{
			name: 'Usage',
			icon: UsageIcon,
			window: UsageSettingsPage,
			props: { user }
		}
	];

	let selectedTab = settingsTabs[0];
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
						style="
                            background: {selectedTab.name === tab.name
							? 'var(--bg-color-light-opacity-alt)'
							: ''};
                        "
						tabindex="0"
						role="button"
						on:click={() => (selectedTab = tab)}
						on:keydown={(e) => {
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
				<svelte:component this={selectedTab.window} {...selectedTab.props} />
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
		padding: 6% 0;
		box-sizing: border-box;
		z-index: 100000;
		background-color: rgba(0, 0, 0, 0.5);
		overflow: hidden;

		.settings-panel {
			position: relative;
			background: var(--bg-color-light-alt-opp);
			max-width: 1200px;
			width: 80%;
			min-width: 700px;
			height: 100%;
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
				height: 96%;
				width: 100%;
				// flex: 12;

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
					height: 100%;
					padding: 10px;
					box-sizing: border-box;
					flex: 4;
				}
			}
		}
	}

	@media (max-width: 810px) {
		.settings-container {
			padding: 3% 0;

			.settings-panel {
				min-width: 420px;
				padding: 40px 10px;

				.settings-body {
					flex-direction: column;

					.settings-sidebar {
						height: 60px;
						flex: none;
						display: flex;
						border-radius: 0;
						border: none;

						.sidebar-option {
							border-radius: 5px;

							&:first-child {
								border-top-left-radius: 5px;
							}
						}
					}

					.settings-page {
						padding: 0px;
					}
				}
			}
		}
	}
</style>
