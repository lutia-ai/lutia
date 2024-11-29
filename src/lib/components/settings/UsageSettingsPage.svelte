<script lang="ts">
	import { onMount } from 'svelte';
	import StackedBarChart from '$lib/components/barchart/StackedBarChart.svelte';
	import type { UsageObject, Company, UserWithSettings } from '$lib/types';
	import { modelLogos } from '$lib/modelLogos';
	import PieChart from '$lib/components/barchart/PieChart.svelte';
	import { capitalizeFirstLetter } from '$lib/components/barchart/utils';
	import type { ApiModel, ApiProvider } from '@prisma/client';

	export let user: UserWithSettings;

	let mounted = false;

	type Layout = 'stacked' | 'grouped' | 'percent';
	let usageData: Record<Company, UsageObject[]>;
	let currentDate = new Date();

	let companyVars: Record<Company, { colors: string[]; layout: string }> = {
		openAI: {
			colors: [
				'rgba(17,169,131,1)',
				'rgba(10,149,111,0.8)',
				'rgba(17,169,131,0.6)',
				'rgba(17,169,131,0.4)',
				'rgba(17,169,131,0.2)'
			],
			layout: 'stacked'
		},
		anthropic: {
			colors: [
				'rgba(204,155,122,1)',
				'rgba(254,215,174,1)',
				'rgba(204,155,122,0.6)',
				'rgba(204,155,122,0.4)',
				'rgba(204,155,122,0.2)'
			],
			layout: 'stacked'
		},
		google: {
			colors: ['rgba(234,68,53,255)', '#fbbd04', '#34a854', '#4285f5', 'var(--color-text)'],
			layout: 'stacked'
		},
		xAI: {
			colors: ['var(--text-color)'],
			layout: 'stacked'
		}
	};

	const pieColors: Record<Company, string> = Object.fromEntries(
		Object.entries(companyVars).map(([company, data]) => [company, data.colors[0]])
	) as Record<Company, string>;

	async function getMonthlyUsage(startDate: Date, endDate: Date): Promise<void> {
		try {
			const formatDate = (date: Date) => {
				return date.toLocaleDateString('en-CA'); // 'en-CA' uses YYYY-MM-DD format
			};

			const params = new URLSearchParams({
				startDate: formatDate(startDate),
				endDate: formatDate(endDate)
			});

			const response = await fetch(`/api/usage?${params.toString()}`, {
				method: 'GET'
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			usageData = processData(data.apiRequests);
		} catch (err) {
			console.error('Error retrieving usage details: ', err);
		}
	}

	interface PartialApiRequest {
		api_provider: ApiProvider;
		api_model: ApiModel;
		request_timestamp: string;
		total_cost: string;
	}

	function processData(inputArray: PartialApiRequest[]): Record<string, UsageObject[]> {
		const { startDate, endDate } = getCurrentMonthDates();
		const daysInMonth = endDate.getDate();

		// Initialize the result object with empty arrays for each day
		const result: Record<string, UsageObject[]> = {};
		// Group by apiProvider
		const groupedByProvider = inputArray.reduce(
			(acc, curr) => {
				if (!acc[curr.api_provider]) {
					acc[curr.api_provider] = [];
				}
				acc[curr.api_provider].push(curr);
				return acc;
			},
			{} as Record<string, PartialApiRequest[]>
		);

		// Process each provider
		for (const [provider, objects] of Object.entries(groupedByProvider)) {
			result[provider] = [];

			// Create a map to store data for each day and model
			const dayModelMap = new Map<string, Map<ApiModel, number>>();

			// Initialize the map with all days of the month
			for (let day = 1; day <= daysInMonth; day++) {
				dayModelMap.set(day.toString(), new Map<ApiModel, number>());
			}

			// Process each object
			for (const obj of objects) {
				const day = new Date(obj.request_timestamp).getDate().toString();
				const modelString = obj.api_model;
				const model = modelString; // Convert string to enum value
				const value = parseFloat(obj.total_cost);

				const modelMap = dayModelMap.get(day)!;
				modelMap.set(model, (modelMap.get(model) || 0) + value);
			}

			// Convert the map to the desired format
			for (let day = 1; day <= daysInMonth; day++) {
				const dayStr = day.toString();
				const modelMap = dayModelMap.get(dayStr)!;

				for (const [model, value] of modelMap) {
					result[provider].push({
						date: dayStr,
						model: model,
						value: value > 0 ? value : 0 // Ensure we don't push negative or zero values
					});
				}

				// Add entries for models with no data on this day
				const allModels = new Set(objects.map((obj) => obj.api_model));
				for (const model of allModels) {
					if (!modelMap.has(model)) {
						result[provider].push({
							date: dayStr,
							model: model,
							value: 0
						});
					}
				}
			}
		}

		return result;
	}

	function getCurrentMonthDates(): { startDate: Date; endDate: Date } {
		const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
		return { startDate, endDate };
	}

	function getCompanyColors(company: string): string[] {
		return companyVars[company as keyof typeof companyVars].colors;
	}

	function setLayout(company: string, layout: Layout): void {
		companyVars[company as keyof typeof companyVars].layout = layout;
	}

	function isValidCompany(company: string): company is Company {
		return company in companyVars;
	}

	async function changeMonth(amount: number) {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + amount, 1);
		const { startDate, endDate } = getCurrentMonthDates();
		await getMonthlyUsage(startDate, endDate);
	}

	function formatMonth(date: Date): string {
		return date.toLocaleString('default', { month: 'long', year: 'numeric' });
	}

	onMount(async () => {
		const { startDate, endDate } = getCurrentMonthDates();
		await getMonthlyUsage(startDate, endDate);
		mounted = true;
	});
</script>

<div class="usage-body">
	<div class="usage-top-panel">
		<div class="month-selector">
			<button on:click={() => changeMonth(-1)} aria-label="Previous month">&lt;</button>
			<span>{formatMonth(currentDate)}</span>
			<button on:click={() => changeMonth(1)} aria-label="Next month">&gt;</button>
		</div>
		{#if mounted}
			<div class="doughnut-container">
				<PieChart {usageData} companyColors={pieColors} />
			</div>
		{/if}
	</div>
	{#if mounted}
		{#each Object.entries(usageData) as [company, data]}
			{@const currentLayout = isValidCompany(company) ? companyVars[company].layout : ''}
			<div class="title">
				<div class="title-container">
					<div class="company-logo-container">
						<svelte:component this={modelLogos[company].logo} />
					</div>
					<h1>{capitalizeFirstLetter(company)}</h1>
				</div>
				<div class="layout-options-container">
					<div
						class="option"
						style="background: {currentLayout === 'stacked'
							? 'var(--text-color)'
							: ''};"
						role="button"
						tabindex="0"
						on:click={() => setLayout(company, 'stacked')}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') {
								setLayout(company, 'stacked');
							}
						}}
					>
						<p style="color: {currentLayout === 'stacked' ? 'var(--bg-color)' : ''};">
							Stacked
						</p>
					</div>
					<div
						class="option"
						style="background: {currentLayout === 'grouped'
							? 'var(--text-color)'
							: ''};"
						role="button"
						tabindex="0"
						on:click={() => setLayout(company, 'grouped')}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') {
								setLayout(company, 'grouped');
							}
						}}
					>
						<p style="color: {currentLayout === 'grouped' ? 'var(--bg-color)' : ''};">
							Grouped
						</p>
					</div>
					<div
						class="option"
						style="background: {currentLayout === 'percent'
							? 'var(--text-color)'
							: ''};"
						role="button"
						tabindex="0"
						on:click={() => setLayout(company, 'percent')}
						on:keydown|stopPropagation={(e) => {
							if (e.key === 'Enter') {
								setLayout(company, 'percent');
							}
						}}
					>
						<p style="color: {currentLayout === 'percent' ? 'var(--bg-color)' : ''};">
							Percent
						</p>
					</div>
				</div>
			</div>
			<StackedBarChart {data} keyColors={getCompanyColors(company)} layout={currentLayout} />
		{/each}
	{/if}
</div>

<style lang="scss">
	.usage-body {
		position: relative;
		width: 100%;
		height: 100%;
		overflow-y: scroll !important;
		padding: 0 20px;
		padding-bottom: 40px;
		box-sizing: border-box;

		.usage-top-panel {
			display: flex;
			gap: 20px;
			flex-direction: column;
			margin-bottom: 50px;
			width: 100%;

			.month-selector {
				display: flex;
				gap: 30px;
				color: var(--bg-color);
				padding: 10px;
				border-radius: 10px;
				height: max-content;
				border: 1px solid var(--text-color);
				width: 220px;
				background: var(--text-color);

				button {
					background: none;
					border: none;
					color: var(--bg-color);
					font-size: 15px;
					cursor: pointer;
				}

				span {
					flex: 1;
					font-size: 15px;
					margin: auto;
					text-align: center;
				}
			}

			.doughnut-container {
				width: 300px;
				height: 300px;
				margin: auto;
			}
		}

		.title {
			display: flex;
			flex-direction: column;
			gap: 10px;
			margin: 20px 0;

			.title-container {
				display: flex;
				gap: 10px;
			}

			.company-logo-container {
				width: 60px;
				height: 60px !important;
				margin: auto 0;
				border-radius: 50%;
				padding: 5px;
				box-sizing: border-box;
				transition: all 0.3s ease;
			}

			h1 {
				font-size: 22px;
				margin: auto 0;
			}

			.layout-options-container {
				margin: auto 0 auto auto;
				display: flex;
				border: 1px solid var(--text-color-light);
				border-radius: 8px;
				overflow: hidden;

				.option {
					display: flex;
					padding: 6px 14px;
					cursor: pointer;

					&:hover {
						background: var(--bg-color-light-opacity-alt);
					}

					p {
						font-size: 15px;
						color: var(--text-color);
						margin: auto 0;
					}
				}
			}
		}
	}

	/* Scrollbar track */
	::-webkit-scrollbar {
		width: 10px;
	}

	/* Scrollbar handle */
	::-webkit-scrollbar-thumb {
		background-color: #888;
		border-radius: 6px;
	}

	/* Scrollbar track background */
	::-webkit-scrollbar-track {
		background-color: var(--bg-color-light);
	}

	@media (max-width: 810px) {
		.usage-body {
			height: calc(100% - 65px);
			padding: 30px 10px;
			padding-bottom: 40px;

			.title {
				.layout-options-container {
					margin: auto auto auto 0;
				}
			}
		}
	}
</style>
