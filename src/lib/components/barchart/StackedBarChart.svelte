<script lang="ts">
	// 	Note: Due to REPL limitations, full responsiveness may not work here. Download the example from here or from the website (https://layercake.graphics/example/ColumnStacked) and run locally to get all features.
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand, scaleOrdinal } from 'd3-scale';
	import { format } from 'd3-format';
	import { stackOffsetExpand } from 'd3-shape';
	import { sum } from 'd3-array';

	import Bar, { getStackExtents } from './Bar.svelte';
	import AxisX from '$lib/components/barchart/AxisX.svelte';
	import AxisY from '$lib/components/barchart/AxisY.svelte';

	import tempData from '$lib/components/barchart/fruitOrdinal.js';
	import { pivot } from '$lib/components/barchart/utils.ts';
	import Tooltip from './Tooltip.svelte';

	interface DataItem {
		[groupBy: string]: string | number;
	}

	export let data = tempData;
	export let keyColors: string[];
	export let layout = 'stacked'; // stacked, grouped, percent, or separated
	export let showCost = true;

	let hoveredItem: any;
	let tooltipX = 0;
	let tooltipY = 0;

	$: options =
		layout === 'grouped'
			? { layout: 'grouped' }
			: layout === 'stacked'
				? { layout: 'stacked' }
				: layout === 'percent'
					? { layout: 'stacked', offset: stackOffsetExpand }
					: {};

	const groupBy = 'date';
	const stackBy = 'model';
	const pivotData = pivot(data, groupBy, stackBy, (items) => sum(items, (d: any) => d.value));
	const stackKeys = Object.keys(pivotData[0]).filter((d) => d !== groupBy);
	const formatTickY = (d: any) =>
		layout === 'percent' ? format('.0%')(d) : '$' + format('.2f')(d);
	const yAccessor = (d: DataItem) => d;
	const rAccessor = (d: DataItem) => d;

	let extents: any;
	$: extents = {
		y: getStackExtents(data, groupBy, stackBy, options.offset)
	};
</script>

<div class="chart-container">
	<LayerCake
		{data}
		{extents}
		x={groupBy}
		xScale={scaleBand().paddingInner(0.1)}
		xDomain={data.map((d) => d[groupBy])}
		y={yAccessor}
		yNice
		r={rAccessor}
		rScale={scaleOrdinal()}
		rDomain={stackKeys}
		rRange={keyColors}
		padding={{ top: 20, bottom: 20, left: 30 }}
	>
		<Svg>
			<AxisX gridlines={false} />
			<AxisY ticks={4} gridlines={true} formatTick={formatTickY} />

			<Bar {groupBy} {stackBy} {...options} bind:hoveredItem bind:tooltipX bind:tooltipY />
		</Svg>
	</LayerCake>
	{#if hoveredItem}
		<Tooltip
			model={hoveredItem.key}
			cost={hoveredItem.values[1] - hoveredItem.values[0]}
			input_tokens={hoveredItem.input_tokens}
			output_tokens={hoveredItem.output_tokens}
			request_count={hoveredItem.request_count}
			{showCost}
			x={tooltipX}
			y={tooltipY}
		/>
	{/if}
</div>

<style>
	/*
		The wrapper div needs to have an explicit width and height in CSS.
		It can also be a flexbox child or CSS grid element.
		The point being it needs dimensions since the <LayerCake> element will
		expand to fill it.
	*/
	.chart-container {
		width: 100%;
		height: 250px;
		_background-color: rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}
</style>
