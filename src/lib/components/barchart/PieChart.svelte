<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { UsageObject, Company } from '$lib/types';
	import { capitalizeFirstLetter } from './utils';
	import { roundToFirstTwoNonZeroDecimals } from '$lib/tokenizer';

	type PieData = {
		company: string;
		value: number;
	};

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
			value: usageObject.reduce((total, item) => total + item.value, 0)
		}));

		// If data is empty, add a default gray slice
		if (data.length === 0) {
			data = [{ company: 'No data', value: 1 }];
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
								let label = '';
								if (context.parsed !== null) {
									label = ' $' + context.parsed.toFixed(2);
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
		<p>Total</p>
		<span>
			{#if data.length === 1 && data[0].company === 'No data'}
				$0.00
			{:else}
				${data.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
			{/if}
		</span>
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
