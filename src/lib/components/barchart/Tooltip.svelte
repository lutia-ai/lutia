<script lang="ts">
	import { formatModelEnumToReadable } from '$lib/chatHistory';
	import { roundToFirstTwoNonZeroDecimals } from '$lib/tokenizer';

	export let model: string;
	export let cost: number;
	export let x: number;
	export let y: number;
</script>

<div class="tooltip" style="left: {x}px; top: {y}px;">
	<p>Model: {formatModelEnumToReadable(model)}</p>
	<p>Cost: ${roundToFirstTwoNonZeroDecimals(cost)}</p>
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
		}
	}
</style>
