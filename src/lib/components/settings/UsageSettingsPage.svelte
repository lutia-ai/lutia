<script lang="ts">
	import { onMount } from 'svelte';
	import StackedBarChart from '$lib/components/barchart/StackedBarChart.svelte';
	import type { UsageObject, Company, UserWithSettings } from '$lib/types';
	import { modelLogos } from '$lib/modelLogos';
	import PieChart from '$lib/components/barchart/PieChart.svelte';
	import { capitalizeFirstLetter } from '$lib/components/barchart/utils';
	import { PaymentTier, type ApiModel, type ApiProvider } from '@prisma/client';

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
		},
		deepSeek: {
			colors: ['rgba(77,107,254,1)', 'rgba(77,107,254,0.8)'],
			layout: 'stacked'
		}
	};

	const pieColors: Record<Company, string> = Object.fromEntries(
		Object.entries(companyVars).map(([company, data]) => [company, data.colors[0]])
	) as Record<Company, string>;

	async function getMonthlyUsage(startDate: Date, endDate: Date): Promise<void> {
		try {
			const formatDate = (date: Date) => {
				return date.toLocaleString('en-CA', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false // Use 24-hour format
				});
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
		input_tokens: number;
		output_tokens: number;
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

		// Define an interface for the token data
		interface ModelData {
			value: number;
			input_tokens: number;
			output_tokens: number;
			request_count: number; // Add request count
		}

		// Process each provider
		for (const [provider, objects] of Object.entries(groupedByProvider)) {
			result[provider] = [];

			// Create a map to store data for each day and model
			const dayModelMap = new Map<string, Map<ApiModel, ModelData>>();

			// Initialize the map with all days of the month
			for (let day = 1; day <= daysInMonth; day++) {
				dayModelMap.set(day.toString(), new Map<ApiModel, ModelData>());
			}

			// Process each object
			for (const obj of objects) {
				const day = new Date(obj.request_timestamp).getDate().toString();
				const model = obj.api_model;
				const value = parseFloat(obj.total_cost);
				const input_tokens = obj.input_tokens;
				const output_tokens = obj.output_tokens;

				const modelMap = dayModelMap.get(day)!;

				if (!modelMap.has(model)) {
					modelMap.set(model, {
						value: 0,
						input_tokens: 0,
						output_tokens: 0,
						request_count: 0 // Initialize request count
					});
				}

				const currentData = modelMap.get(model)!;
				currentData.value += value;
				currentData.input_tokens += input_tokens;
				currentData.output_tokens += output_tokens;
				currentData.request_count += 1; // Increment request count
			}

			// Convert the map to the desired format
			for (let day = 1; day <= daysInMonth; day++) {
				const dayStr = day.toString();
				const modelMap = dayModelMap.get(dayStr)!;

				for (const [model, data] of modelMap) {
					result[provider].push({
						date: dayStr,
						model: model,
						value: data.value > 0 ? data.value : 0,
						input_tokens: data.input_tokens,
						output_tokens: data.output_tokens,
						request_count: data.request_count // Add to result
					});
				}

				// Add entries for models with no data on this day
				const allModels = new Set(objects.map((obj) => obj.api_model));
				for (const model of allModels) {
					if (!modelMap.has(model)) {
						result[provider].push({
							date: dayStr,
							model: model,
							value: 0,
							input_tokens: 0,
							output_tokens: 0,
							request_count: 0 // Add with 0 count
						});
					}
				}
			}
		}

		return result;
	}

	function getCurrentMonthDates(): { startDate: Date; endDate: Date } {
		const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		const endDate = new Date(
			new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).setHours(
				23,
				59,
				59,
				999
			)
		);
		return { startDate, endDate };
	}

	// Add this function at an appropriate location in your script
	function getColorForModel(company: Company, modelIndex: number): string {
		const baseColors = companyVars[company].colors;

		// If we have a color for this index, use it
		if (modelIndex < baseColors.length) {
			return baseColors[modelIndex];
		}

		// Otherwise, generate a new color based on the company's color palette
		// Take the first color and modify it
		const baseColor = baseColors[0];

		// Initialize r, g, b, and a with default values
		let r = 0,
			g = 0,
			b = 0,
			a = 1; // Default values for rgba components

		if (baseColor.startsWith('rgba')) {
			const match = baseColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
			if (match) {
				[, r, g, b, a] = match.map((v, i) => (i > 0 ? parseFloat(v) : v)) as [
					string,
					number,
					number,
					number,
					number
				];
			}
		} else if (baseColor.startsWith('rgb')) {
			const match = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			if (match) {
				[, r, g, b] = match.map((v, i) => (i > 0 ? parseFloat(v) : v)) as [
					string,
					number,
					number,
					number
				];
			}
		} else if (baseColor.startsWith('#')) {
			const hex = baseColor.substring(1);
			r = parseInt(hex.substring(0, 2), 16);
			g = parseInt(hex.substring(2, 4), 16);
			b = parseInt(hex.substring(4, 6), 16);
		} else {
			// Use a fallback color with some variation
			return `hsl(${(modelIndex * 137) % 360}, 70%, 50%)`;
		}

		// Create a variation based on the model index
		// Different strategies based on company to maintain palette feel
		if (company === 'openAI') {
			// Vary the green hue slightly and decrease opacity for additional models
			return `rgba(17, ${150 + (modelIndex % 5) * 10}, ${120 + (modelIndex % 3) * 10}, ${Math.max(0.2, 1 - (modelIndex - baseColors.length) * 0.15)})`;
		} else if (company === 'anthropic') {
			// Vary the warm tones for anthropic
			return `rgba(${200 + (modelIndex % 3) * 15}, ${150 + (modelIndex % 4) * 10}, ${110 + (modelIndex % 5) * 10}, ${Math.max(0.2, 1 - (modelIndex - baseColors.length) * 0.15)})`;
		} else if (company === 'google') {
			// Cycle through Google's brand colors with variations
			const googleBaseColors = [
				[234, 68, 53], // Red
				[251, 189, 4], // Yellow
				[52, 168, 84], // Green
				[66, 133, 245] // Blue
			];
			const baseIdx = modelIndex % googleBaseColors.length;
			const [baseR, baseG, baseB] = googleBaseColors[baseIdx];
			// Add a slight variation
			return `rgba(${Math.min(255, baseR + (modelIndex % 3) * 10)}, ${Math.min(255, baseG + (modelIndex % 4) * 10)}, ${Math.min(255, baseB + (modelIndex % 5) * 10)}, ${Math.max(0.35, 1 - (modelIndex - baseColors.length) * 0.1)})`;
		} else if (company === 'deepSeek') {
			// Vary the blue for deepSeek
			return `rgba(${70 + (modelIndex % 3) * 10}, ${100 + (modelIndex % 4) * 10}, ${240 + (modelIndex % 5) * 5}, ${Math.max(0.3, 1 - (modelIndex - baseColors.length) * 0.15)})`;
		} else {
			// Default approach for other companies
			// Create a slight variation in the color with the same hue family
			const variation = modelIndex * 20;
			r = Math.min(255, Math.max(0, r + ((modelIndex % 3) - 1) * variation));
			g = Math.min(255, Math.max(0, g + ((modelIndex % 5) - 2) * variation));
			b = Math.min(255, Math.max(0, b + ((modelIndex % 7) - 3) * variation));
			a = Math.max(0.2, a - (modelIndex - baseColors.length) * 0.1);

			return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
		}
	}

	// Now, modify the getCompanyColors function to use this
	function getCompanyColors(company: string): string[] {
		if (!isValidCompany(company)) {
			return [];
		}

		// Get the base colors
		const baseColors = companyVars[company as Company].colors;

		// Check how many models we have for this company
		const models = usageData[company as Company];
		if (!models || models.length === 0) {
			return baseColors;
		}

		// Get unique model names
		const uniqueModels = [...new Set(models.map((item) => item.model))];
		const numModels = uniqueModels.length;

		// If we have enough colors, return them directly
		if (numModels <= baseColors.length) {
			return baseColors;
		}

		// Otherwise, create an extended color array
		const extendedColors = [...baseColors];

		// Generate additional colors
		for (let i = baseColors.length; i < numModels; i++) {
			extendedColors.push(getColorForModel(company as Company, i));
		}

		return extendedColors;
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
				<PieChart
					{usageData}
					companyColors={pieColors}
					showCost={user.payment_tier === PaymentTier.PayAsYouGo}
				/>
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
			<StackedBarChart
				{data}
				keyColors={getCompanyColors(company)}
				layout={currentLayout}
				showCost={user.payment_tier === PaymentTier.PayAsYouGo}
			/>
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
