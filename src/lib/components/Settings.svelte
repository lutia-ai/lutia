<script lang="ts">
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import ContextWindowIcon from '$lib/components/icons/ContextWindowIcon.svelte';
	import DollarIcon from '$lib/components/icons/DollarIcon.svelte';
	import UsageIcon from '$lib/components/icons/UsageIcon.svelte';

	export let isOpen: boolean;

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

<svelte:window use:wheel={{ isOpen }} />

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
				<div class="sidebar-option">
					<div class="icon-container">
						<SettingsIcon color="var(--text-color-light)" />
					</div>
					<p>General</p>
				</div>
				<div class="sidebar-option">
					<div class="icon-container">
						<DollarIcon color="var(--text-color-light)" />
					</div>
					<p>Billing</p>
				</div>
				<div class="sidebar-option">
					<div class="icon-container">
						<UsageIcon color="var(--text-color-light)" />
					</div>
					<p>Usage</p>
				</div>
				<div class="sidebar-option">
					<div class="icon-container">
						<ContextWindowIcon color="var(--text-color-light)" />
					</div>
					<p>Context</p>
				</div>
			</div>
			<div class="settings-page"></div>
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
			background: var(--bg-color-light);
			max-width: 1200px;
			width: 80%;
			min-width: 800px;
			height: 800px;
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
						background: var(--text-color-light-opacity);
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
					overflow: hidden;
					flex: 1;

					.sidebar-option {
						width: 100%;
						padding: 15px 5px 15px 10px;
						box-sizing: border-box;
						display: flex;
						gap: 15px;
						cursor: pointer;
						border-radius: 5px;

						&:hover {
							background-color: var(--bg-color);
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
					flex: 4;
				}
			}
		}
	}
</style>
