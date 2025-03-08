import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	plugins: [sveltekit(), visualizer({ open: false }) as PluginOption],
	resolve: {
		alias: {
			'.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js',
		},
	},
});
