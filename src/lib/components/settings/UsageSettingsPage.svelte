<script lang="ts">
	import { onMount } from 'svelte';
	import StackedBarChart from '$lib/components/barchart/StackedBarChart.svelte';
	import { modelDictionary } from '$lib/modelDictionary';
	import { ApiRequest } from '$lib/db/entities/ApiRequest';
	import type { UsageObject } from '$lib/types';
	import { modelLogos } from '$lib/modelLogos';

	type Company = 'openAI' | 'anthropic' | 'google';
	let usageData: Record<Company, UsageObject[]>;
	let mounted = false;

	const companyColors = {
		openAI: [
			'rgba(17,169,131,1)',
			'rgba(10,149,111,0.8)',
			'rgba(17,169,131,0.6)',
			'rgba(17,169,131,0.4)',
			'rgba(17,169,131,0.2)'
		],
		anthropic: [
			'rgba(254,215,174,1)',
			'rgba(204,155,122,1)',
			'rgba(204,155,122,0.6)',
			'rgba(204,155,122,0.4)',
			'rgba(204,155,122,0.2)'
		],
		google: ['rgba(234,68,53,255)', '#fbbd04', '#34a854', '#4285f5', 'var(--color-text)']
	};

	async function getMonthlyUsage(startDate: Date, endDate: Date): Promise<void> {
		try {
			const params = new URLSearchParams({
				startDate: startDate.toISOString().split('T')[0],
				endDate: endDate.toISOString().split('T')[0]
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
		apiProvider: string;
		apiModel: string;
		requestTimestamp: string;
		totalCost: string;
	}

	function processData(inputArray: PartialApiRequest[]): Record<string, UsageObject[]> {
		const { startDate, endDate } = getCurrentMonthDates();
		const daysInMonth = endDate.getDate();

		// Initialize the result object with empty arrays for each day
		const result: Record<string, UsageObject[]> = {};

		// Group by apiProvider
		const groupedByProvider = inputArray.reduce(
			(acc, curr) => {
				if (!acc[curr.apiProvider]) {
					acc[curr.apiProvider] = [];
				}
				acc[curr.apiProvider].push(curr);
				return acc;
			},
			{} as Record<string, PartialApiRequest[]>
		);

		// Process each provider
		for (const [provider, objects] of Object.entries(groupedByProvider)) {
			result[provider] = [];

			// Create a map to store data for each day and model
			const dayModelMap = new Map<string, Map<string, number>>();

			// Initialize the map with all days of the month
			for (let day = 1; day <= daysInMonth; day++) {
				dayModelMap.set(day.toString(), new Map<string, number>());
			}

			// Process each object
			for (const obj of objects) {
				const day = new Date(obj.requestTimestamp).getDate().toString();
				const model = obj.apiModel;
				const value = parseFloat(obj.totalCost) * 1000;

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
				const allModels = new Set(objects.map((obj) => obj.apiModel));
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
		const now = new Date();
		const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return { startDate, endDate };
	}

	function capitalizeFirstLetter(word: string): string {
		if (word.length === 0) {
			return word;
		}
		return word.charAt(0).toUpperCase() + word.slice(1);
	}

	function getCompanyColors(company: string): string[] {
		return companyColors[company as keyof typeof companyColors];
	}

	onMount(async () => {
		const { startDate, endDate } = getCurrentMonthDates();
		await getMonthlyUsage(startDate, endDate);
		mounted = true;
	});
</script>

<div class="usage-body">
	{#if mounted}
		{#each Object.entries(usageData) as [company, data]}
			<div class="title">
				<div class="company-logo-container">
					<svelte:component this={modelLogos[company].logo} />
				</div>
				<h1>{capitalizeFirstLetter(company)}</h1>
			</div>
			<StackedBarChart {data} keyColors={getCompanyColors(company)} />
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

		.title {
			display: flex;
			gap: 10px;
			margin: 20px 0;

			.company-logo-container {
				width: 60px;
				height: 60px !important;
				margin: auto 0;
				border-radius: 50%;
				padding: 5px;
				box-sizing: border-box;
				transition: all 0.3s ease;

				&:hover {
					background: var(--bg-color-light);
				}
			}

			h1 {
				font-size: 22px;
				margin: auto 0;
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
</style>
