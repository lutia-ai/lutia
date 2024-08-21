import type { ModelDictionary } from '$lib/types';
// @ts-ignore
import AnthropicIcon from '$lib/components/icons/Anthropic.svelte';
// @ts-ignore
import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte';
// @ts-ignore
import OpenAiIcon from '$lib/components/icons/OpenAiIcon.svelte';
// @ts-ignore
import MetaIcon from '$lib/components/icons/MetaIcon.svelte';

export const modelDictionary: ModelDictionary = {
	openAI: {
		logo: OpenAiIcon,
		models: {
			gpt4o: {
				name: 'GPT 4o',
				param: 'gpt-4o-2024-08-06',
				legacy: false,
				input_price: 2.5,
				output_price: 10,
				context_window: 128000,
				hub: 'Xenova/gpt-4o'
			},
			gpt4mini: {
				name: 'GPT 4o mini',
				param: 'gpt-4o-mini',
				legacy: false,
				input_price: 0.15,
				output_price: 0.6,
				context_window: 128000,
				hub: 'Xenova/gpt-4o'
			},
			gpt4turbo: {
				name: 'GPT 4 Turbo',
				param: 'gpt-4-turbo',
				legacy: true,
				input_price: 10,
				output_price: 30,
				context_window: 128000,
				hub: 'Xenova/gpt-4'
			},
			gpt4: {
				name: 'GPT 4',
				param: 'gpt-4',
				legacy: true,
				input_price: 30,
				output_price: 60,
				context_window: 8000,
				hub: 'Xenova/gpt-4'
			},
			gpt35turbo: {
				name: 'GPT 3.5 Turbo',
				param: 'gpt-3.5-turbo-0125',
				legacy: true,
				input_price: 0.5,
				output_price: 1.5,
				context_window: 16385,
				hub: 'Xenova/gpt-3.5-turbo'
			}
		}
	},
	anthropic: {
		logo: AnthropicIcon,
		models: {
			claude35Sonnet: {
				name: 'Claude 3.5 Sonnet',
				param: 'claude-3-5-sonnet-20240620',
				legacy: false,
				input_price: 3,
				output_price: 15,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer'
			},
			claude3Opus: {
				name: 'Claude 3 Opus',
				param: 'claude-3-opus-20240229',
				legacy: false,
				input_price: 15,
				output_price: 75,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer'
			},
			claude3Sonnet: {
				name: 'Claude 3 Sonnet',
				param: 'claude-3-sonnet-20240229',
				legacy: true,
				input_price: 3,
				output_price: 15,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer'
			},
			claude3Haiku: {
				name: 'Claude 3 Haiku',
				param: 'claude-3-haiku-20240307',
				legacy: false,
				input_price: 0.25,
				output_price: 1.25,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer'
			}
		}
	},
	google: {
		logo: GoogleIcon,
		models: {
			gemini15Pro: {
				name: 'Gemini 1.5 Pro',
				param: 'gemini-1.5-pro',
				legacy: false,
				input_price: 3.5,
				output_price: 10.5,
				input_price_large: 7, // Price increases for prompts 128k or longer
				output_price_large: 21, // Price increases for prompts 128k or longer
				context_window: 2000000,
				hub: 'Xenova/gpt-4o'
			},
			gemini15Flash: {
				name: 'Gemini 1.5 Flash',
				param: 'gemini-1.5-flash',
				legacy: false,
				input_price: 0.35,
				output_price: 1.05,
				input_price_large: 0.7, // Price increases for prompts 128k or longer
				output_price_large: 2.1, // Price increases for prompts 128k or longer
				context_window: 1000000,
				hub: 'Xenova/gpt-4o'
			},
			gemini1Pro: {
				name: 'Gemini 1.0 Pro',
				param: 'gemini-1.0-pro',
				legacy: true,
				input_price: 0.5,
				output_price: 1.5,
				context_window: 1000000,
				hub: 'Xenova/gpt-4o'
			}
		}
	}
	// meta: {
	// 	logo: MetaIcon,
	// 	models: {
	// 		gemini15Pro: {
	// 			name: 'Gemini 1.5 Pro',
	// 			param: 'gemini-1.5-pro',
	// 			legacy: false,
	// 			input_price: 3.5,
	// 			output_price: 10.5,
	// 			input_price_large: 7, // Price increases for prompts 128k or longer
	// 			output_price_large: 21, // Price increases for prompts 128k or longer
	// 			context_window: 2000000
	// 		},
	// 		gemini15Flash: {
	// 			name: 'Gemini 1.5 Flash',
	// 			param: 'gemini-1.5-flash',
	// 			legacy: false,
	// 			input_price: 0.35,
	// 			output_price: 1.05,
	// 			input_price_large: 0.7, // Price increases for prompts 128k or longer
	// 			output_price_large: 2.1, // Price increases for prompts 128k or longer
	// 			context_window: 1000000
	// 		},
	// 		gemini1Pro: {
	// 			name: 'Gemini 1.0 Pro',
	// 			param: 'gemini-1.0-pro',
	// 			legacy: true,
	// 			input_price: 0.5,
	// 			output_price: 1.5,
	// 			context_window: 1000000
	// 		}
	// 	}
	// }
};
