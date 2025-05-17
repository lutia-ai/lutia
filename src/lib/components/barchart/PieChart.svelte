<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import type { UsageObject, Company, UserWithSettings } from '$lib/types/types';
	import { capitalizeFirstLetter } from './utils';
	import { PaymentTier } from '@prisma/client';

	type PieData = {
		company: string;
		value: number;
		request_count: number;
	};

	export let showCost: boolean = true;
	export let usageData: Record<Company, UsageObject[]>;
	export let companyColors: Record<Company, string>;

	let chartCanvas: HTMLCanvasElement;
	let chart: any = null;
	let data: PieData[] = [];

	$: if (usageData) {
		processUsageData(usageData);
		updateChart();
	}

	function processUsageData(usageData: Record<Company, UsageObject[]>) {
		data = Object.entries(usageData).map(([company, usageObject]) => ({
			company,
			// The reduce function iterates over each item in usageObject, accumulating the total value.
			// It starts with an initial total of 0 and adds each item's value to this total.
			value: usageObject.reduce((total, item) => total + item.value, 0),
			// Here, we are also accumulating the request_count from each UsageObject.
			// The reduce function will sum up the request_count for all items in usageObject.
			request_count: usageObject.reduce((total, item) => total + item.request_count, 0)
		}));

		// If data is empty, add a default gray slice
		if (data.length === 0) {
			data = [{ company: 'No data', value: 1, request_count: 0 }];
		}
	}

	function createChart() {
		if (!chartCanvas) return;
		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		const labels = data.map((item) => capitalizeFirstLetter(item.company));
		const values = data.map((item) => item.value);
		const colors =
			data.length === 1 && data[0].company === 'No data'
				? ['rgb(200, 200, 200)'] // Gray color for empty data
				: data.map(
						(item) => companyColors[item.company as Company] || 'rgb(128, 128, 128)'
					);

		chart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: labels,
				datasets: [
					{
						data: values,
						backgroundColor: colors
					}
				]
			},
			options: {
				responsive: true,
				plugins: {
					legend: {
						display: false
					},
					title: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function (context) {
								if (data.length === 1 && data[0].company === 'No data') {
									return 'No data';
								}

								// Get the corresponding data item for this tooltip
								const dataIndex = context.dataIndex;
								const dataItem = data[dataIndex];

								let label = context.label || '';

								// Format the value based on showCost flag
								if (showCost) {
									label = '$' + context.parsed.toFixed(2);
								} else {
									label = dataItem.request_count.toLocaleString(); // Format with commas
								}
								return label;
							}
						}
					}
				}
			}
		});
	}

	function updateChart() {
		if (chart) {
			const labels = data.map((item) => capitalizeFirstLetter(item.company));
			const values = data.map((item) => item.value);
			const colors =
				data.length === 1 && data[0].company === 'No data'
					? ['rgb(200, 200, 200)'] // Gray color for empty data
					: data.map(
							(item) => companyColors[item.company as Company] || 'rgb(128, 128, 128)'
						);

			chart.data.labels = labels;
			chart.data.datasets[0].data = values;
			chart.data.datasets[0].backgroundColor = colors;
			chart.update();
		} else {
			createChart();
		}
	}

	onMount(() => {
		createChart();
	});
</script>

<div class="chart-container">
	<div class="total-container">
		{#if showCost}
			<p>Total</p>
			<span>
				{#if data.length === 1 && data[0].company === 'No data'}
					$0.00
				{:else}
					${data.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
				{/if}
			</span>
		{:else}
			<p>Total requests</p>
			<span>
				{#if data.length === 1 && data[0].company === 'No data'}
					0
				{:else}
					{data.reduce((sum, item) => sum + item.request_count, 0).toLocaleString()}
				{/if}
			</span>
		{/if}
	</div>
	<canvas bind:this={chartCanvas}></canvas>
</div>

<style lang="scss">
	.chart-container {
		position: relative;
		width: 100%;
		height: 100%;

		.total-container {
			position: absolute;
			left: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			min-width: 50px;
			display: flex;
			flex-direction: column;

			p,
			span {
				margin: 0;
				text-align: center;
				color: var(--text-color);
			}

			p {
				font-size: 20px;
				font-weight: 400;
			}

			span {
				font-size: 24px;
			}
		}
	}
</style>
