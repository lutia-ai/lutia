<script context="module" lang="ts">
	import { extent, max } from 'd3-array';
	import { stackOffsetNone, stackOffsetExpand } from 'd3-shape';

	import Rect from '$lib/components/barchart/Rect.svelte';

	export function getGroupExtents(data: Record<string, number>[], keys: string[]): [any, any] {
		const values = data.flatMap((d: Record<string, number>) =>
			keys.map((key: string) => d[key])
		);
		return extent(values);
	}

	export function getStackExtents(
		data: { [key: string]: number | string }[],
		groupBy: string,
		stackBy: string,
		offset: any
	): [number, number] {
		const pivotData = pivot(data, groupBy, stackBy, (items: { value: number }[]) =>
			sum(items, (d: { value: number }) => d.value)
		);

		const stackKeys = Object.keys(pivotData[0]).filter((d) => d !== groupBy);
		const stackData = stack<{ [key: string]: number }, string>().offset(offset).keys(stackKeys)(
			pivotData as any
		);

		return extent(stackData.flat(2)) as [number, number];
	}

	/**
	 * Function to offset each layer by the maximum of the previous layer
	 *   - see: https://observablehq.com/@mkfreeman/separated-bar-chart
	 */
	export function stackOffsetSeparated(series: any, order: any) {
		// TODO: Determine way to pass in as option (curry?)
		const gap = 100;

		if (!((n = series.length) > 1)) return;

		// Standard series
		for (var i = 1, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
			(s0 = s1), (s1 = series[order[i]]);
			// @ts-ignore
			let base = max(s0, (d) => d[1]) + gap; // here is where you calculate the maximum of the previous layer
			for (var j = 0; j < m; ++j) {
				// Set the height based on the data values, shifted up by the previous layer
				let diff = s1[j][1] - s1[j][0];
				s1[j][0] = base;
				s1[j][1] = base + diff;
			}
		}
	}
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import { cubicInOut as easing } from 'svelte/easing';
	import { scaleBand } from 'd3-scale';
	import { stack } from 'd3-shape';
	import { pivot } from '$lib/components/barchart/utils.ts';
	import { sum } from 'd3-array';
	// @ts-ignore
	const { data, xGet, xScale, yScale, rGet } = getContext('LayerCake');

	export let groupBy; // = []; TODO: Support array
	export let stackBy; // = []; TODO: Support array
	export let layout = 'stacked'; // stacked or grouped
	export let offset = stackOffsetNone;
	export let delay = 300;
	export let hoveredItem: any;
	export let tooltipX = 0;
	export let tooltipY = 0;

	$: pivotData = pivot($data, groupBy, stackBy, (items) => sum(items, (d: any) => d.value));
	$: stackKeys = Object.keys(pivotData[0]).filter((d) => d !== groupBy);

	$: grouped = layout === 'grouped';

	$: stackData = stack().offset(offset).keys(stackKeys)(pivotData as any);

	$: chartData = grouped
		? pivotData.flatMap((d: any) => {
				return stackKeys.map((key) => {
					return {
						key,
						values: [0, d[key]],
						data: d
					};
				});
			})
		: stackData.flatMap((series) => {
				return series.map((d) => {
					return {
						key: series.key,
						values: [d[0], d[1]],
						data: d.data
					};
				});
			});

	$: x1Scale = scaleBand().domain(stackKeys).range([0, $xScale.bandwidth()]).paddingInner(0.05);

	$: getDimensions = (item: any) => {
		return {
			x: $xGet(item.data) + (grouped ? x1Scale(item.key) : 0),
			y: $yScale(item.values[1]),
			width: grouped ? x1Scale.bandwidth() : $xScale.bandwidth(),
			height: $yScale(item.values[0]) - $yScale(item.values[1])
		};
	};

	//$: console.log({ chartData })
</script>

<!-- TODO: Pass in top-level groupKey (or slice off of groupKeys) instead of using year directly -->
<g class="column-group">
	{#each chartData as item, i (`${item.data.date}-${item.key}`)}
		<Rect
			class="group-rect"
			fill={$rGet(item.key)}
			tweenOptions={{
				x: { easing, delay: grouped ? 0 : delay },
				y: { easing, delay: grouped ? delay : 0 },
				width: { easing, delay: grouped ? 0 : delay },
				height: { easing, delay: grouped ? delay : 0 }
			}}
			{...getDimensions(item)}
			{...$$restProps}
			{item}
			bind:hoveredItem
			bind:tooltipX
			bind:tooltipY
		/>
	{/each}
</g>
