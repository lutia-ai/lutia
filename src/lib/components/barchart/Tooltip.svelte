<script lang="ts">
	import { formatModelEnumToReadable } from '$lib/chatHistory';
	import { roundToTwoSignificantDigits } from '$lib/tokenizer';

	export let model: string;
	export let cost: number;
	export let input_tokens: number;
	export let output_tokens: number;
	export let x: number;
	export let y: number;
	export let showCost: boolean = true;
	export let request_count: number;
</script>

<div class="tooltip" style="left: {x}px; top: {y}px;">
	<p><span>Model:</span> {formatModelEnumToReadable(model)}</p>
	<p><span>Input tokens:</span> {input_tokens.toLocaleString()}</p>
	<p><span>Output tokens:</span> {output_tokens.toLocaleString()}</p>
	<p><span>Requests:</span> {request_count.toLocaleString()}</p>
	{#if showCost}
		<p><span>Cost: </span> ${roundToTwoSignificantDigits(cost)}</p>
	{/if}
</div>

<style lang="scss">
	.tooltip {
		position: fixed;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 5px;
		border-radius: 3px;
		font-size: 12px;
		pointer-events: none;
		z-index: 10000;
		transform: translate(10px, 10px);

		p {
			margin: 0;
			font-weight: 600;

			span {
				font-size: 11px;
				font-weight: 300;
			}
		}
	}
</style>
