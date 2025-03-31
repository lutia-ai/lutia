<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import CheckIcon from '$lib/components/icons/TickIcon.svelte';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	import InfoIcon from './icons/InfoIcon.svelte';

	export let show = false;
	export let message = '';
	export let details: string | null = null;
	export let type: 'info' | 'success' = 'info';
	export let duration = 5000;

	let timeoutId: NodeJS.Timeout;
	let progressValue = 100;
	let progressInterval: NodeJS.Timeout;

	export function showNotification(
		newMessage: string,
		newDetails: string | null = null,
		newDuration = 5000,
		newType: 'info' | 'success' = 'info'
	) {
		clearTimeout(timeoutId);
		clearInterval(progressInterval);

		message = newMessage;
		details = newDetails;
		type = newType;
		duration = newDuration;
		progressValue = 100;
		show = true;

		if (duration > 0) {
			// Set up progress bar
			const startTime = Date.now();
			const endTime = startTime + duration;

			progressInterval = setInterval(() => {
				const currentTime = Date.now();
				const remaining = Math.max(0, endTime - currentTime);
				progressValue = (remaining / duration) * 100;

				if (progressValue <= 0) {
					clearInterval(progressInterval);
				}
			}, 10);

			timeoutId = setTimeout(() => {
				show = false;
				clearInterval(progressInterval);
			}, duration);
		}
	}

	function closeNotification() {
		clearTimeout(timeoutId);
		clearInterval(progressInterval);
		show = false;
	}

	onDestroy(() => {
		clearTimeout(timeoutId);
		clearInterval(progressInterval);
	});
</script>

{#if show}
	<div class="notification-container" transition:fade={{ duration: 300 }}>
		<div class="notification-content {type}" transition:fly={{ y: -20, duration: 300 }}>
			<div class="icon-container">
				{#if type === 'success'}
					<CheckIcon color="var(--success-color, #4CAF50)" />
				{:else}
					<InfoIcon color="var(--info-color, #2196F3)" />
				{/if}
			</div>

			<div class="message-container">
				<p class="message">{message}</p>
				{#if details}
					<p class="details">{details}</p>
				{/if}
			</div>

			<button class="close-button" on:click={closeNotification}>
				<CrossIcon color="var(--text-color-light)" />
			</button>

			{#if duration > 0}
				<div class="progress-container">
					<div class="progress-bar" style="height: {progressValue}%"></div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.notification-container {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 500px;
		z-index: 10000;
		pointer-events: none;
		display: flex;
		justify-content: center;
		padding: 0 16px;
		box-sizing: border-box;
	}

	.notification-content {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		padding: 16px 20px;
		border-radius: 8px;
		background: var(--bg-color-light);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		pointer-events: auto;
		/* border-left: 4px solid; */
		overflow: hidden;
	}

	.notification-content.success {
		border-left-color: var(--success-color, #4caf50);
	}

	.notification-content.info {
		border-left-color: var(--info-color, #2196f3);
	}

	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		margin-right: 16px;
		flex-shrink: 0;
	}

	.message-container {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.message {
		font-size: 16px;
		font-weight: 500;
		margin: 0;
		color: var(--text-color);
		word-break: break-word;
	}

	.details {
		font-size: 14px;
		font-weight: 300;
		margin: 4px 0 0 0;
		color: var(--text-color-light);
		word-break: break-word;
	}

	.close-button {
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		margin-left: 16px;
		opacity: 0.7;
		transition: opacity 0.2s;
	}

	.close-button:hover {
		opacity: 1;
	}

	.progress-container {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 4px;
		background: rgba(0, 0, 0, 0.1);
	}

	.progress-bar {
		width: 100%;
		position: absolute;
		bottom: 0;
		transition: height 0.1s linear;
		border-top-left-radius: 80px;
		border-top-right-radius: 80px;
	}

	.success .progress-bar {
		background: var(--success-color, #4caf50);
	}

	.info .progress-bar {
		background: var(--info-color, #2196f3);
	}

	@media (max-width: 480px) {
		.notification-container {
			top: 10px;
		}

		.notification-content {
			padding: 12px 16px;
		}

		.message {
			font-size: 14px;
		}

		.details {
			font-size: 12px;
		}

		.icon-container {
			width: 20px;
			height: 20px;
			margin-right: 12px;
		}

		.close-button {
			width: 20px;
			height: 20px;
			margin-left: 12px;
		}
	}
</style>
