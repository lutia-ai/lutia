import { group } from 'd3-array';

// Returns an array of m psuedorandom, smoothly-varying non-negative numbers.
// Inspired by Lee Byron’s test data generator.
// http://leebyron.com/streamgraph/
export function bumps(m: number) {
	const values = [];

	// Initialize with uniform random values in [0.1, 0.2).
	for (let i = 0; i < m; ++i) {
		values[i] = 0.1 + 0.1 * Math.random();
	}

	// Add five random bumps.
	for (let j = 0; j < 5; ++j) {
		const x = 1 / (0.1 + Math.random());
		const y = 2 * Math.random() - 0.5;
		const z = 10 / (0.1 + Math.random());
		for (let i = 0; i < m; i++) {
			const w = (i / m - y) * z;
			values[i] += x * Math.exp(-w * w);
		}
	}

	// Ensure all values are positive.
	for (let i = 0; i < m; ++i) {
		values[i] = Math.max(0, values[i]);
	}

	return values;
}

/**
 * Group and pivot from taller to wider (d3.stack structure)
 *   - adapted from: https://observablehq.com/@john-guerra/d3-stack-with-d3-group
 *   - see also: https://pbeshai.github.io/tidy/docs/api/pivot
 *   - see also: https://svelte.dev/repl/f41b33967fcd4df390ea2b4914761373?version=3.38.3
 */
export function pivot(
	data: any,
	groupKey: any,
	stackKey: any,
	reducer = (vals: any) => vals.length
) {
	const groupedMap = group(
		data,
		(d: any) => d[groupKey],
		(d) => d[stackKey]
	);

	const stackKeys: any[] = Array.from(new Set(data.map((d: any) => d[stackKey])).values());

	return Array.from(groupedMap.entries()).map((g) => {
		const obj = {};
		// @ts-ignore
		obj[groupKey] = g[0];
		for (let col of stackKeys) {
			const vals = g[1].get(col);
			// @ts-ignore
			obj[col] = !vals ? 0 : reducer(Array.from(vals.values()));
		}
		return obj;
	});
}

export function capitalizeFirstLetter(word: string): string {
	if (word.length === 0) {
		return word;
	}
	return word.charAt(0).toUpperCase() + word.slice(1);
}
