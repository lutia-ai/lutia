import type { ModelDictionary } from '$lib/types';

export const modelDictionary: ModelDictionary = {
	openAI: {
		models: {
			gpt4o: {
				name: 'GPT_4o',
				param: 'gpt-4o-2024-08-06',
				legacy: false,
				input_price: 2.5,
				output_price: 10,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5
			},
			gpt4mini: {
				name: 'GPT_4o_mini',
				param: 'gpt-4o-mini',
				legacy: false,
				input_price: 0.15,
				output_price: 0.6,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5
			},
			gpt4turbo: {
				name: 'GPT_4_Turbo',
				param: 'gpt-4-turbo',
				legacy: true,
				input_price: 10,
				output_price: 30,
				context_window: 128000,
				hub: 'Xenova/gpt-4',
				handlesImages: true,
				maxImages: 5
			},
			gpt4: {
				name: 'GPT_4',
				param: 'gpt-4',
				legacy: true,
				input_price: 30,
				output_price: 60,
				context_window: 8000,
				hub: 'Xenova/gpt-4',
				handlesImages: false
			},
			gpt35turbo: {
				name: 'GPT_3_5_Turbo',
				param: 'gpt-3.5-turbo-0125',
				legacy: true,
				input_price: 0.5,
				output_price: 1.5,
				context_window: 16385,
				hub: 'Xenova/gpt-3.5-turbo',
				handlesImages: false
			}
		}
	},
	anthropic: {
		models: {
			claude35Sonnet: {
				name: 'Claude_3_5_Sonnet',
				param: 'claude-3-5-sonnet-20240620',
				legacy: false,
				input_price: 3,
				output_price: 15,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5
			},
			claude3Opus: {
				name: 'Claude_3_Opus',
				param: 'claude-3-opus-20240229',
				legacy: false,
				input_price: 15,
				output_price: 75,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5
			},
			claude3Sonnet: {
				name: 'Claude_3_Sonnet',
				param: 'claude-3-sonnet-20240229',
				legacy: true,
				input_price: 3,
				output_price: 15,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5
			},
			claude3Haiku: {
				name: 'Claude_3_Haiku',
				param: 'claude-3-haiku-20240307',
				legacy: false,
				input_price: 0.25,
				output_price: 1.25,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5
			}
		}
	},
	google: {
		models: {
			gemini15Pro: {
				name: 'Gemini_1_5_Pro',
				param: 'gemini-1.5-pro',
				legacy: false,
				input_price: 3.5,
				output_price: 10.5,
				input_price_large: 7, // Price increases for prompts 128k or longer
				output_price_large: 21, // Price increases for prompts 128k or longer
				context_window: 2000000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1
			},
			gemini15Flash: {
				name: 'Gemini_1_5_Flash',
				param: 'gemini-1.5-flash',
				legacy: false,
				input_price: 0.35,
				output_price: 1.05,
				input_price_large: 0.7, // Price increases for prompts 128k or longer
				output_price_large: 2.1, // Price increases for prompts 128k or longer
				context_window: 1000000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1
			},
			gemini1Pro: {
				name: 'Gemini_1_0_Pro',
				param: 'gemini-1.0-pro',
				legacy: true,
				input_price: 0.5,
				output_price: 1.5,
				context_window: 1000000,
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 1
			}
		}
	}
};
