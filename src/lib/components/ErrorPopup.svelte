<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	export let message: string = '';
	export let subMessage: string | null = '';
    export let color: 'success' | 'error' = 'error';

	let visible = false;

	onMount(() => {
		if (message) {
			showError(message, subMessage);
		}
	});

	export function showError(
        msg: string, 
        subMsg: string | null = null, 
        duration: number = 5000,
        colorParam: 'success' | 'error' = 'error'
    ) {
		message = msg;
		subMessage = subMsg;
        color = colorParam;
		visible = true;
		setTimeout(() => {
			visible = false;
		}, duration);
	}
</script>

{#if visible}
	<div 
        class="error-container" 
        style="
            background: {color === 'success' ? 'rgb(27, 201, 27)' : '#ff4136'}
        "
        transition:fade={{ duration: 300 }}
    >
		<h1>{message}</h1>
		{#if subMessage}
			<p>{subMessage}</p>
		{/if}
	</div>
{/if}

<style lang="scss">
	.error-container {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		color: white;
		padding: 10px 20px;
		border-radius: 4px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
		z-index: 1000000;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		gap: 10px;

		h1 {
			font-size: 18px;
			margin: 0;
			font-weight: 400;
			text-align: center;
		}

		p {
			font-size: 14px;
			margin: 0;
			font-weight: 400;
			text-align: center;
		}
	}
</style>
