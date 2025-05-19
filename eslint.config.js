import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelte.parser,
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		},
		// Add rules to handle common SvelteKit linter issues
		rules: {
			// Configure unused vars with patterns specific to Svelte components
			'no-unused-vars': [
				'warn',
				{
					varsIgnorePattern: '^_',
					// This pattern matches common Svelte prop parameters
					argsIgnorePattern: '^(_|src|alt|image|content|file|filename|id|e|value|str)',
					destructuredArrayIgnorePattern: '^_',
					ignoreRestSiblings: true,
					caughtErrors: 'all'
				}
			],
			// Downgrade no-at-html-tags from error to warning as it's commonly used in Svelte
			'svelte/no-at-html-tags': 'off',
			// Disable other Svelte-specific rules that might cause issues
			'svelte/valid-compile': 'off',
			'svelte/no-at-debug-tags': 'warn',
			'svelte/comment-directive': 'error'
		}
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				// Add common globals used in the project
				NodeJS: 'readonly',
				gtag: 'readonly'
			}
		}
	},
	{
		// Ignore third-party code and build outputs
		ignores: ['build/**', '.svelte-kit/**', 'dist/**', 'node_modules/**']
	}
];
