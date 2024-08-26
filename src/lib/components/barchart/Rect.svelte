<script lang="ts">
	import { tweened } from 'svelte/motion';

	export let x;
	export let y;
	export let width;
	export let height;
	export let tweenOptions: any = undefined;

	let tweened_x = tweened(x, tweenOptions?.x);
	let tweened_y = tweened(y, tweenOptions?.y);
	let tweened_width = tweened(width, tweenOptions?.width);
	let tweened_height = tweened(height, tweenOptions?.height);

	$: tweened_x.set(x, tweenOptions?.x);
	$: tweened_y.set(y, tweenOptions?.y);
	$: tweened_width.set(width, tweenOptions?.width);
	$: tweened_height.set(height, tweenOptions?.height);
</script>

<rect
	role="region"
	x={$tweened_x}
	y={$tweened_y}
	width={$tweened_width}
	height={$tweened_height}
	{...$$restProps}
/>
