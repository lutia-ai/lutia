import type { ModelDictionary } from '$lib/models/types';

export const modelDictionary: ModelDictionary = {
	openAI: {
		models: {
			gpt52: {
				name: 'GPT_5_2',
				param: 'gpt-5.2',
				legacy: false,
				input_price: 1.75 * 1.1,
				output_price: 14 * 1.1,
				context_window: 400000,
				handlesImages: true,
				maxImages: 50,
				reasons: false,
				extendedThinking: false,
				generatesImages: false,
				description: 'Latest GPT-5.2 with enhanced reasoning',
				max_input_per_request: 15000,
				web_search: true,
				web_search_price: 0.035
			},
			gpt52Pro: {
				name: 'GPT_5_2_Pro',
				param: 'gpt-5.2-pro',
				legacy: false,
				input_price: 21 * 1.1,
				output_price: 168 * 1.1,
				context_window: 400000,
				handlesImages: true,
				maxImages: 50,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'Most capable GPT-5.2 for complex tasks',
				max_input_per_request: 5000,
				web_search: true,
				web_search_price: 0.035
			},
			o1: {
				name: 'GPT_o1',
				param: 'o1',
				legacy: false,
				input_price: 15 * 1.1,
				output_price: 60 * 1.1,
				context_window: 128000,
				handlesImages: true,
				maxImages: 5,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'High intelligence reasoning model',
				max_input_per_request: 3000,
				web_search: true,
				web_search_price: 0.035
			},
			o3: {
				name: 'GPT_o3',
				param: 'o3',
				legacy: false,
				input_price: 10 * 1.1,
				output_price: 40 * 1.1,
				context_window: 200000,
				handlesImages: true,
				maxImages: 5,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: "OpenAI's most powerful reasoning model",
				max_input_per_request: 3000,
				web_search: true,
				web_search_price: 0.035
			},
			o1pro: {
				name: 'GPT_o1_pro',
				param: 'o1-pro',
				legacy: false,
				input_price: 150 * 1.1,
				output_price: 600 * 1.1,
				context_window: 128000,
				handlesImages: true,
				maxImages: 5,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'Version of o1 with more compute for better responses',
				max_input_per_request: 3000,
				web_search: true,
				web_search_price: 0.035
			},
			dalle3: {
				name: 'DALL_E',
				param: 'dall-e-3',
				legacy: false,
				input_price: 0 * 1.1,
				output_price: 0.04 * 1.1,
				context_window: 4032,
				handlesImages: false,
				maxImages: 0,
				reasons: false,
				extendedThinking: false,
				generatesImages: true,
				description: 'Generate photo-realistic images',
				max_input_per_request: 4000,
				web_search: false
			}
		}
	},
	anthropic: {
		models: {
			claude45Opus: {
				name: 'Claude_4_5_Opus',
				param: 'claude-opus-4-5',
				legacy: false,
				input_price: 5 * 1.1,
				output_price: 25 * 1.1,
				context_window: 200000,
				max_tokens: 8192,
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: true,
				extendedThinking: true,
				description: 'Most intelligent Claude model for complex tasks',
				max_input_per_request: 2500,
				web_search: true,
				web_search_price: 0.01
			},
			claude45Sonnet: {
				name: 'Claude_4_5_Sonnet',
				param: 'claude-sonnet-4-5',
				legacy: false,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 200000,
				max_tokens: 8192,
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: true,
				extendedThinking: true,
				description: 'Balanced intelligence, cost, and speed',
				max_input_per_request: 10000,
				web_search: true,
				web_search_price: 0.01
			},
			claude45Haiku: {
				name: 'Claude_4_5_Haiku',
				param: 'claude-haiku-4-5',
				legacy: false,
				input_price: 1 * 1.1,
				output_price: 5 * 1.1,
				context_window: 200000,
				max_tokens: 8192,
				handlesImages: true,
				maxImages: 5,
				generatesImages: false,
				reasons: false,
				extendedThinking: false,
				description: 'Fast, cost-effective Claude model',
				max_input_per_request: 15000,
				web_search: true,
				web_search_price: 0.01
			}
		}
	},
	google: {
		models: {
			gemini3Pro: {
				name: 'Gemini_3_Pro',
				param: 'gemini-3-pro-preview',
				legacy: false,
				input_price: 2 * 1.1,
				output_price: 12 * 1.1,
				context_window: 1000000,
				handlesImages: true,
				maxImages: 10,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'Most intelligent Gemini with multimodal understanding',
				max_input_per_request: 15000,
				web_search: false
			},
			gemini3Flash: {
				name: 'Gemini_3_Flash',
				param: 'gemini-3-flash-preview',
				legacy: false,
				input_price: 0.5 * 1.1,
				output_price: 3 * 1.1,
				context_window: 1000000,
				handlesImages: true,
				maxImages: 10,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'Balanced model built for speed and scale',
				max_input_per_request: 20000,
				web_search: false
			},
			gemini3ProImage: {
				name: 'Gemini_3_Pro_Image',
				param: 'gemini-3-pro-image-preview',
				legacy: false,
				input_price: 0,
				output_price: 0.134,
				context_window: 1000000,
				handlesImages: true,
				maxImages: 10,
				reasons: false,
				extendedThinking: false,
				generatesImages: true,
				description: 'Professional image generation and understanding',
				max_input_per_request: 15000,
				web_search: false
			}
		}
	},
	xAI: {
		models: {
			grok41Fast: {
				name: 'Grok_4_1_Fast',
				param: 'grok-4.1-fast',
				legacy: false,
				input_price: 0.2 * 1.1,
				output_price: 0.5 * 1.1,
				context_window: 2000000,
				handlesImages: true,
				maxImages: 5,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'Ultra-fast with 2M token context window',
				max_input_per_request: 20000,
				web_search: false
			},
			grok4: {
				name: 'Grok_4',
				param: 'grok-4',
				legacy: false,
				input_price: 3 * 1.1,
				output_price: 15 * 1.1,
				context_window: 256000,
				handlesImages: true,
				maxImages: 5,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'Flagship Grok model with enhanced reasoning',
				max_input_per_request: 10000,
				web_search: false
			},
			grokCodeFast1: {
				name: 'Grok_Code_Fast_1',
				param: 'grok-code-fast-1',
				legacy: false,
				input_price: 0.2 * 1.1,
				output_price: 0.5 * 1.1,
				context_window: 256000,
				handlesImages: false,
				maxImages: 0,
				reasons: true,
				extendedThinking: false,
				generatesImages: false,
				description: 'Specialized for agentic coding tasks',
				max_input_per_request: 15000,
				web_search: false
			}
		}
	},
	meta: {
		models: {}
		// TODO: Llama provider exists but no models are configured yet
		// Add models here when Llama is ready to be enabled
	},
	deepSeek: {
		models: {
			v32: {
				name: 'V3_2',
				param: 'deepseek-chat',
				legacy: false,
				input_price: 0.28 * 1.1,
				output_price: 0.42 * 1.1,
				context_window: 128000,
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
				reasons: true,
				extendedThinking: false,
				description: 'Latest DeepSeek with improved reasoning',
				max_input_per_request: 20000,
				web_search: false
			},
			r1: {
				name: 'R1',
				param: 'deepseek-reasoner',
				legacy: false,
				input_price: 0.55 * 1.1,
				output_price: 2.19 * 1.1,
				context_window: 64000,
				handlesImages: false,
				maxImages: 0,
				generatesImages: false,
				reasons: true,
				extendedThinking: false,
				description: 'V3.2 with extended reasoning chains',
				max_input_per_request: 15000,
				web_search: false
			}
		}
	}
};
