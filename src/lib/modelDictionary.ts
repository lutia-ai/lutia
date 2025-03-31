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
				context_window: 128000, // max input cost $0.1408
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
				reasons: true,
				description: 'Fast, flexible reasoning model',
				max_input_per_request: 10000
			},
			o1: {
				name: 'GPT_o1',
				param: 'o1',
				legacy: false,
				input_price: 15 * 1.1,
				output_price: 60 * 1.1,
				context_window: 128000, // max input cost $1.92
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
				reasons: true,
				description: 'High intelligence reasoning model',
				max_input_per_request: 3000
			},
			o1preview: {
				name: 'GPT_o1_preview',
				param: 'o1-preview',
				legacy: true,
				input_price: 15 * 1.1,
				output_price: 60 * 1.1,
				context_window: 128000, // max input cost $1.92
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
				reasons: true,
				description: 'Preview version of o1',
				max_input_per_request: 3000
			},
			o1mini: {
				name: 'GPT_o1_mini',
				param: 'o1-mini',
				legacy: true,
				input_price: 1.1 * 1.1,
				output_price: 4.4 * 1.1,
				context_window: 128000, // max input cost $0.1408
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
				reasons: true,
				description: '',
				max_input_per_request: 10000
			},
			gpt45preview: {
				name: 'GPT_4_5_preview',
				param: 'gpt-4.5-preview',
				legacy: false,
				input_price: 75 * 1.1,
				output_price: 150 * 1.1,
				context_window: 128000, // max input cost $9.60
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				description: 'Largest and most capable GPT model (preview)',
				max_input_per_request: 1000
			},
			gpt4o: {
				name: 'GPT_4o',
				param: 'gpt-4o',
				legacy: false,
				input_price: 2.5 * 1.1,
				output_price: 10 * 1.1,
				context_window: 128000, // max input cost $0.32
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				description: 'Versatile, high-intelligence flagship model',
				max_input_per_request: 10000
			},
			gpt4mini: {
				name: 'GPT_4o_mini',
				param: 'gpt-4o-mini',
				legacy: false,
				input_price: 0.15 * 1.1,
				output_price: 0.6 * 1.1,
				context_window: 128000, // max input cost $0.0192
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				description: 'Fast, affordable small model',
				max_input_per_request: 15000
			},
			gpt4turbo: {
				name: 'GPT_4_Turbo',
				param: 'gpt-4-turbo',
				legacy: true,
				input_price: 10 * 1.1,
				output_price: 30 * 1.1,
				context_window: 128000, // max input cost $1.28
				hub: 'Xenova/gpt-4',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				description: '',
				max_input_per_request: 3000
			},
			gpt4: {
				name: 'GPT_4',
				param: 'gpt-4',
				legacy: true,
				input_price: 30 * 1.1,
				output_price: 60 * 1.1,
				context_window: 8000, // max input cost $0.24
				hub: 'Xenova/gpt-4',
				handlesImages: false,
				generatesImages: false,
				description: '',
				max_input_per_request: 2000
			},
			gpt35turbo: {
				name: 'GPT_3_5_Turbo',
				param: 'gpt-3.5-turbo-0125',
				legacy: true,
				input_price: 0.5 * 1.1,
				output_price: 1.5 * 1.1,
				context_window: 16385, // max input cost $0.0081925
				hub: 'Xenova/gpt-3.5-turbo',
				handlesImages: false,
				generatesImages: false,
				description: '',
				max_input_per_request: 15000
			},
			dalle3: {
				name: 'DALL_E',
				param: 'dall-e-3',
				legacy: false,
				input_price: 0 * 1.1,
				output_price: 0.04 * 1.1,
				context_window: 4032, // max input cost $0
				hub: '',
				handlesImages: false,
				generatesImages: true,
				description: 'Generate photo-realistic images',
				max_input_per_request: 4000
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
				context_window: 200000, // max input spend $0.6
				max_tokens: 8192,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: true,
				extendedThinking: true,
				description: 'Smartest model with extended thinking',
				max_input_per_request: 5000
			},
			claude35Sonnet: {
				name: 'Claude_3_5_Sonnet',
				param: 'claude-3-5-sonnet-latest',
				legacy: true,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000, // max input spend $0.6
				max_tokens: 8192,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: false,
				description: 'Highest level of intelligence and capability',
				max_input_per_request: 5000
			},
			claude35Haiku: {
				name: 'Claude_3_5_Haiku',
				param: 'claude-3-5-haiku-latest',
				legacy: false,
				input_price: 1 * 1.1,
				output_price: 5 * 1.1,
				context_window: 200000, // max input spend $0.2
				max_tokens: 8192,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
				reasons: false,
				description: 'Intelligence at blazing speeds',
				max_input_per_request: 15000
			},
			claude3Opus: {
				name: 'Claude_3_Opus',
				param: 'claude-3-opus-20240229',
				legacy: false,
				input_price: 15 * 1.1,
				output_price: 75 * 1.1,
				context_window: 200000, // max input spend $3
				max_tokens: 4096,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: false,
				description: 'Top-level intelligence, fluency, and understanding',
				max_input_per_request: 2000
			},
			claude3Sonnet: {
				name: 'Claude_3_Sonnet',
				param: 'claude-3-sonnet-20240229',
				legacy: true,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000, // max input spend $0.6
				max_tokens: 4096,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: false,
				description: '',
				max_input_per_request: 5000
			},
			claude3Haiku: {
				name: 'Claude_3_Haiku',
				param: 'claude-3-haiku-20240307',
				legacy: true,
				input_price: 0.25 * 1.1,
				output_price: 1.25 * 1.1,
				context_window: 200000, // max input spend $0.05
				max_tokens: 4096,
				hub: 'Xenova/claude-tokenizer',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: false,
				description: 'Quick and accurate targeted performance',
				max_input_per_request: 15000
			}
		}
	},
	google: {
		models: {
			gemini25Pro: {
				name: 'Gemini_2_5_Pro',
				param: 'gemini-2.5-pro-exp-03-25',
				legacy: false,
				input_price: 0.1 * 1.1,
				output_price: 0.4 * 1.1,
				context_window: 1048576, // max input cost $0.1048576
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				reasons: true,
				generatesImages: false,
				description: 'State of the art reasoning model',
				max_input_per_request: 15000
			},
			gemini20Flash: {
				name: 'Gemini_2_0_Flash',
				param: 'gemini-2.0-flash',
				legacy: false,
				input_price: 0.1 * 1.1,
				output_price: 0.4 * 1.1,
				context_window: 1048576, // max input cost $0.1048576
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				reasons: false,
				generatesImages: false,
				description: 'Fast and versatile performance',
				max_input_per_request: 15000
			},
			gemini20FlashLite: {
				name: 'Gemini_2_0_Flash_Lite',
				param: 'gemini-2.0-flash-lite-preview-02-05',
				legacy: false,
				input_price: 0.075 * 1.1,
				output_price: 0.3 * 1.1,
				context_window: 1048576, // max input cost $0.0786432
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false,
				description: 'Cost efficient and low latency',
				max_input_per_request: 15000
			},
			gemini15Pro: {
				name: 'Gemini_1_5_Pro',
				param: 'gemini-1.5-pro',
				legacy: true,
				input_price: 3.5 * 1.1,
				output_price: 10.5 * 1.1,
				input_price_large: 7, // Price increases for prompts 128k or longer
				output_price_large: 21, // Price increases for prompts 128k or longer
				context_window: 2097152, // max input cost $7.340032 for <128k prompts, $14.680064 for >=128k prompts
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false,
				description: 'Complex reasoning tasks requiring more intelligence',
				max_input_per_request: 3000
			},
			gemini15Flash: {
				name: 'Gemini_1_5_Flash',
				param: 'gemini-1.5-flash',
				legacy: true,
				input_price: 0.35 * 1.1,
				output_price: 1.05 * 1.1,
				input_price_large: 0.7, // Price increases for prompts 128k or longer
				output_price_large: 2.1, // Price increases for prompts 128k or longer
				context_window: 1048576, // max input cost $0.3670016 for <128k prompts, $0.7340032 for >=128k prompts
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 1,
				generatesImages: false,
				description: 'Fast and versatile performance across a diverse variety of tasks',
				max_input_per_request: 10000
			}
			// gemini1Pro: {
			// name: 'Gemini_1_0_Pro',
			// param: 'gemini-1.0-pro',
			// legacy: true,
			// input_price: 0.5 * 1.1,
			// output_price: 1.5 * 1.1,
			// context_window: 1000000,
			// hub: 'Xenova/gpt-4o',
			// handlesImages: false,
			// maxImages: 1,
			// generatesImages: false,
			// description: ''
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
				context_window: 131072, // max input cost $0.262144
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
				description: 'Unfiltered intelligence, blazing speed',
				max_input_per_request: 5000
			},
			grok2Vision: {
				name: 'Grok_2_vision',
				param: 'grok-2-vision',
				legacy: false,
				input_price: 2 * 1.1,
				output_price: 10 * 1.1,
				context_window: 32768, // max input cost $0.065536
				hub: 'Xenova/gpt-4o',
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				description: 'Unfiltered intelligence with image-understanding',
				max_input_per_request: 5000
			},
			grokBeta: {
				name: 'Grok_beta',
				param: 'grok-beta',
				legacy: true,
				input_price: 5 * 1.1,
				output_price: 15 * 1.1,
				context_window: 131072, // max input cost $0.65536
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
				description: '',
				max_input_per_request: 3000
			}
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
				context_window: 64000, // max input cost $0.0352
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
				reasons: true,
				description: 'Cost effective intelligence and reasoning',
				max_input_per_request: 15000
			},
			v3: {
				name: 'V3',
				param: 'deepseek-chat',
				legacy: false,
				input_price: 0.27 * 1.1,
				output_price: 1.1 * 1.1,
				context_window: 64000, // max input cost $0.01728
				hub: 'Xenova/gpt-4o',
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
				description: 'Fast, affordable intelligence',
				max_input_per_request: 20000
			}
		}
	}
	// meta: {
	// models: {
	// llama32: {
	// name: "Llama_3_2_90b_Vision",
	// param: "llama3.2-90b-vision",
	// legacy: false,
	// input_price: 2.8,
	// output_price: 2.8,
	// context_window: 128000,
	// hub: "unsloth/Llama-3.2-1B",
	// handlesImages: true,
	// maxImages: 1,
	// generatesImages: false
	// },
	// // llama31: {
	// // name: "Llama_3_1",
	// // param: "llama-3.1",
	// // legacy: true,
	// // input_price: 4,
	// // output_price: 9,
	// // context_window: 128000,
	// // hub: "Xenova/Meta-Llama-3.1-Tokenizer",
	// // },
	// // llama2: {
	// // name: "Llama_2",
	// // param: "llama-2",
	// // legacy: true,
	// // input_price: 0.5,
	// // output_price: 1.5,
	// // context_window: 4096,
	// // hub: "Xenova/llama2-tokenizer",
	// // },
	// }
	// }
};
