import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import type { UserConfig } from 'vite';

const config: UserConfig = {
	plugins: [sveltekit(), visualizer({ open: false }) as PluginOption],
	resolve: {
		alias: {
			'.prisma/client/index-browser': './node_modules/.prisma/client/index-browser.js'
		}
	},
	test: {
		// Jest-like globals
		globals: true,
		// Use JSDOM for component testing
		environment: 'jsdom',
		// Where to find test files
		include: ['src/**/*.{test,spec}.{js,ts,svelte}'],
		// Add custom matchers from jest-dom
		setupFiles: ['./src/setupTest.ts'],
		// Coverage configuration
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: ['src/setupTest.ts']
		}
	}
};

export default defineConfig(config);
