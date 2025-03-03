import type { ModelDictionary } from './types.d';

export const modelDictionary: ModelDictionary = {
	openAI: {
		models: {
            o3mini: {
				name: 'GPT_o3_mini',
				param: 'o3-mini',
				legacy: false,
				input_price: 1.1 * 1.1,
				output_price: 4.4 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
                reasons: true,
                description: 'Fast, flexible reasoning model'
			},
            o1: {
				name: 'GPT_o1',
				param: 'o1',
				legacy: false,
				input_price: 15 * 1.1,
				output_price: 60 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
                reasons: true,
                description: 'High intelligence reasoning model'
			},
			o1preview: {
				name: 'GPT_o1_preview',
				param: 'o1-preview',
				legacy: true,
				input_price: 15 * 1.1,
				output_price: 60 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
                reasons: true,
                description: 'Preview version of o1'
			},
			o1mini: {
				name: 'GPT_o1_mini',
				param: 'o1-mini',
				legacy: true,
				input_price: 1.1 * 1.1,
				output_price: 4.4 * 1.1,
				context_window: 128000,
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
                reasons: true,
                description: ''
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
				generatesImages: false,
                description: 'Versatile, high-intelligence flagship model'
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
				generatesImages: false,
                description: 'Fast, affordable small model'
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
				generatesImages: false,
                description: ''
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
				generatesImages: false,
                description: ''
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
				generatesImages: false,
                description: ''
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
				generatesImages: true,
                description: 'Generate photo-realistic images'
			}
		}
	},
	anthropic: {
		models: {
            claude37Sonnet: {
				name: 'Claude_3_7_Sonnet',
				param: 'claude-3-7-sonnet-latest',
				legacy: false,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000,
                max_tokens: 8192,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
                reasons: true,
                extendedThinking: true,
                description: 'Smartest model with extended thinking'
			},
			claude35Sonnet: {
				name: 'Claude_3_5_Sonnet',
				param: 'claude-3-5-sonnet-latest',
				legacy: true,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000,
                max_tokens: 8192,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
                description: 'Highest level of intelligence and capability'
			},
			claude35Haiku: {
				name: 'Claude_3_5_Haiku',
				param: 'claude-3-5-haiku-latest',
				legacy: false,
				input_price: 1 * 1.1,
				output_price: 5 * 1.1,
				context_window: 200000,
                max_tokens: 8192,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
                description: 'Intelligence at blazing speeds'
			},
			claude3Opus: {
				name: 'Claude_3_Opus',
				param: 'claude-3-opus-20240229',
				legacy: false,
				input_price: 15 * 1.1,
				output_price: 75 * 1.1,
				context_window: 200000,
                max_tokens: 4096,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
                description: 'Top-level intelligence, fluency, and understanding'
			},
			claude3Sonnet: {
				name: 'Claude_3_Sonnet',
				param: 'claude-3-sonnet-20240229',
				legacy: true,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000,
                max_tokens: 4096,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
                description: ''
			},
			claude3Haiku: {
				name: 'Claude_3_Haiku',
				param: 'claude-3-haiku-20240307',
				legacy: true,
				input_price: 0.25 * 1.1,
				output_price: 1.25 * 1.1,
				context_window: 200000,
                max_tokens: 4096,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
                description: 'Quick and accurate targeted performance'
			}
		}
	},
	google: {
		models: {
            gemini20Flash: {
				name: 'Gemini_2_0_Flash',
				param: 'gemini-2.0-flash',
				legacy: false,
				input_price: 0.1 * 1.1,
				output_price: 0.4 * 1.1,
				context_window: 1048576,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false,
                description: 'Fast and versatile performance'
			},
            gemini20FlashLite: {
				name: 'Gemini_2_0_Flash_Lite',
				param: 'gemini-2.0-flash-lite-preview-02-05',
				legacy: false,
				input_price: 0.075 * 1.1,
				output_price: 0.3 * 1.1,
				context_window: 1048576,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false,
                description: 'Cost efficient and low latency'
			},
			gemini15Pro: {
				name: 'Gemini_1_5_Pro',
				param: 'gemini-1.5-pro',
				legacy: false,
				input_price: 3.5 * 1.1,
				output_price: 10.5 * 1.1,
				input_price_large: 7, // Price increases for prompts 128k or longer
				output_price_large: 21, // Price increases for prompts 128k or longer
				context_window: 2097152,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false,
                description: 'Complex reasoning tasks requiring more intelligence'
			},
			gemini15Flash: {
				name: 'Gemini_1_5_Flash',
				param: 'gemini-1.5-flash',
				legacy: true,
				input_price: 0.35 * 1.1,
				output_price: 1.05 * 1.1,
				input_price_large: 0.7, // Price increases for prompts 128k or longer
				output_price_large: 2.1, // Price increases for prompts 128k or longer
				context_window: 1048576,
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false,
                description: 'Fast and versatile performance across a diverse variety of tasks'
			},
			// gemini1Pro: {
			// 	name: 'Gemini_1_0_Pro',
			// 	param: 'gemini-1.0-pro',
			// 	legacy: true,
			// 	input_price: 0.5 * 1.1,
			// 	output_price: 1.5 * 1.1,
			// 	context_window: 1000000,
			// 	hub: 'Xenova/gpt-4o',
			// 	handlesImages: false,
			// 	maxImages: 1,
			// 	generatesImages: false,
            //     description: ''
			// }
		}
	},
	xAI: {
		models: {
            grok2: {
				name: 'Grok_2',
				param: 'grok-2-1212',
				legacy: false,
				input_price: 2 * 1.1,
				output_price: 10 * 1.1,
				context_window: 131072,
				hub: undefined,
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
                description: 'Unfiltered intelligence, blazing speed'
			},
            grok2Vision: {
                name: 'Grok_2_vision',
				param: 'grok-2-vision',
				legacy: false,
				input_price: 2 * 1.1,
				output_price: 10 * 1.1,
				context_window: 32768,
				hub: undefined,
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
                description: 'Unfiltered intelligence with image-understanding'
			},
            grokBeta: {
                name: 'Grok_beta',
                param: 'grok-beta',
                legacy: true,
                input_price: 5 * 1.1,
                output_price: 15 * 1.1,
                context_window: 131072,
                hub: undefined,
                handlesImages: false,
                maxImages: 0,
                generatesImages: false,
                description: ''
            },
		}
	},
    deepSeek: {
		models: {
            r1: {
				name: 'R1',
				param: 'deepseek-reasoner',
				legacy: false,
				input_price: 0.55 * 1.1,
				output_price: 2.19 * 1.1,
				context_window: 64000,
				hub: undefined,
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
                reasons: true,
                description: 'Cost effective intelligence and reasoning'
			},
            v3: {
                name: 'V3',
				param: 'deepseek-chat',
				legacy: false,
				input_price: 0.27 * 1.1,
				output_price: 1.1 * 1.1,
				context_window: 64000,
				hub: undefined,
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
                description: 'Fast, affordable intelligence'
			},
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
