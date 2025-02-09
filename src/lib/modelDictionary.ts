import type { ModelDictionary } from './types.d';

export const modelDictionary: ModelDictionary = {
	openAI: {
		models: {
			o1preview: {
				name: 'GPT_o1_preview',
				param: 'o1-preview',
				legacy: false,
				input_price: 15 * 1.1,
				output_price: 60 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 5
			},
			o1mini: {
				name: 'GPT_o1_mini',
				param: 'o1-mini',
				legacy: false,
				input_price: 1.1 * 1.1,
				output_price: 4.4 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 5
			},
			gpt4o: {
				name: 'GPT_4o',
				param: 'gpt-4o',
				legacy: false,
				input_price: 2.5 * 1.1,
				output_price: 10 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false
			},
			gpt4mini: {
				name: 'GPT_4o_mini',
				param: 'gpt-4o-mini',
				legacy: false,
				input_price: 0.15 * 1.1,
				output_price: 0.6 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false
			},
			gpt4turbo: {
				name: 'GPT_4_Turbo',
				param: 'gpt-4-turbo',
				legacy: true,
				input_price: 10 * 1.1,
				output_price: 30 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false
			},
			gpt4: {
				name: 'GPT_4',
				param: 'gpt-4',
				legacy: true,
				input_price: 30 * 1.1,
				output_price: 60 * 1.1,
				context_window: 8000,
				hub: 'Xenova/gpt-4',
				handlesImages: false,
				generatesImages: false
			},
			gpt35turbo: {
				name: 'GPT_3_5_Turbo',
				param: 'gpt-3.5-turbo-0125',
				legacy: true,
				input_price: 0.5 * 1.1,
				output_price: 1.5 * 1.1,
				context_window: 16385,
				hub: 'Xenova/gpt-3.5-turbo',
				handlesImages: false,
				generatesImages: false
			},
			dalle3: {
				name: 'DALL_E',
				param: 'dall-e-3',
				legacy: false,
				input_price: 0 * 1.1,
				output_price: 0.04 * 1.1,
				context_window: 4032,
				hub: '',
				handlesImages: false,
				generatesImages: true
			}
		}
	},
	anthropic: {
		models: {
			claude35Sonnet: {
				name: 'Claude_3_5_Sonnet',
				param: 'claude-3-5-sonnet-latest',
				legacy: false,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false
			},
			claude35Haiku: {
				name: 'Claude_3_5_Haiku',
				param: 'claude-3-5-haiku-latest',
				legacy: false,
				input_price: 1 * 1.1,
				output_price: 5 * 1.1,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: false,
				maxImages: 0,
				generatesImages: false
			},
			claude3Opus: {
				name: 'Claude_3_Opus',
				param: 'claude-3-opus-20240229',
				legacy: false,
				input_price: 15 * 1.1,
				output_price: 75 * 1.1,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false
			},
			claude3Sonnet: {
				name: 'Claude_3_Sonnet',
				param: 'claude-3-sonnet-20240229',
				legacy: true,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false
			},
			claude3Haiku: {
				name: 'Claude_3_Haiku',
				param: 'claude-3-haiku-20240307',
				legacy: true,
				input_price: 0.25 * 1.1,
				output_price: 1.25 * 1.1,
				context_window: 200000,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false
			}
		}
	},
	google: {
		models: {
			gemini15Pro: {
				name: 'Gemini_1_5_Pro',
				param: 'gemini-1.5-pro',
				legacy: false,
				input_price: 3.5 * 1.1,
				output_price: 10.5 * 1.1,
				input_price_large: 7, // Price increases for prompts 128k or longer
				output_price_large: 21, // Price increases for prompts 128k or longer
				context_window: 2000000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false
			},
			gemini15Flash: {
				name: 'Gemini_1_5_Flash',
				param: 'gemini-1.5-flash',
				legacy: false,
				input_price: 0.35 * 1.1,
				output_price: 1.05 * 1.1,
				input_price_large: 0.7, // Price increases for prompts 128k or longer
				output_price_large: 2.1, // Price increases for prompts 128k or longer
				context_window: 1000000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false
			},
			gemini1Pro: {
				name: 'Gemini_1_0_Pro',
				param: 'gemini-1.0-pro',
				legacy: true,
				input_price: 0.5 * 1.1,
				output_price: 1.5 * 1.1,
				context_window: 1000000,
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 1,
				generatesImages: false
			}
		}
	},
	xAI: {
		models: {
			grokBeta: {
				name: 'Grok_beta',
				param: 'grok-beta',
				legacy: false,
				input_price: 5 * 1.1,
				output_price: 15 * 1.1,
				context_window: 131072,
				hub: undefined,
				handlesImages: false,
				maxImages: 0,
				generatesImages: false
			}
		}
	}
	// meta: {
	//     models: {
	//         llama32: {
	//             name: "Llama_3_2_90b_Vision",
	//             param: "llama3.2-90b-vision",
	//             legacy: false,
	// 			input_price: 2.8,
	// 			output_price: 2.8,
	//             context_window: 128000,
	//             hub: "unsloth/Llama-3.2-1B",
	//             handlesImages: true,
	// 			maxImages: 1,
	// 			generatesImages: false
	//         },
	//         // llama31: {
	//         //     name: "Llama_3_1",
	//         //     param: "llama-3.1",
	//         //     legacy: true,
	// 		// 	input_price: 4,
	// 		// 	output_price: 9,
	//         //     context_window: 128000,
	//         //     hub: "Xenova/Meta-Llama-3.1-Tokenizer",
	//         // },
	//         // llama2: {
	//         //     name: "Llama_2",
	//         //     param: "llama-2",
	//         //     legacy: true,
	// 		// 	input_price: 0.5,
	// 		// 	output_price: 1.5,
	//         //     context_window: 4096,
	//         //     hub: "Xenova/llama2-tokenizer",
	//         // },
	//     }
	// }
};
