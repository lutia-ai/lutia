<script lang="ts">
	import { tweened } from 'svelte/motion';

	export let x;
	export let y;
	export let width;
	export let height;
	export let tweenOptions: any = undefined;
	export let item;
	export let hoveredItem: any;
	export let tooltipX = 0;
	export let tooltipY = 0;

	function handleMouseEnter(event: MouseEvent, item: any) {
		hoveredItem = item;
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	function handleMouseLeave() {
		hoveredItem = null;
	}

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
	on:mouseenter={(e) => handleMouseEnter(e, item)}
	on:mouseleave={handleMouseLeave}
/>
<!-- {#if hoveredItem}
    <g transform={`translate(${tooltipX + 10}, ${tooltipY - 10})`}>
        <rect
            x="0"
            y="0"
            width="120"
            height="50"
            fill="white"
            stroke="black"
            stroke-width="1"
        />
        <text x="5" y="15" font-size="12">{hoveredItem.key}</text>
        <text x="5" y="30" font-size="12">Value: {hoveredItem.values[1]}</text>
        <text x="5" y="45" font-size="12">Date: {hoveredItem.data.date}</text>
    </g>
{/if} -->
