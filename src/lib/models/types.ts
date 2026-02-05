/**
 * Model Types
 * Types related to AI models and model configuration
 */

import type { ApiModel, ApiProvider } from '@prisma/client';

export type Model = {
	name: ApiModel;
	param: string; // The model name used in the API call
	legacy: boolean; // Whether the model is legacy (not the latest version)
	input_price: number; // The price per input 1m tokens
	output_price: number; // The price per output 1m tokens
	context_window: number; // The maximum number of tokens that can be inputted in a single request
	max_tokens?: number; // The maximum number of tokens that can be outputted in a single request
	handlesImages: boolean; // Whether the model can handle images
	maxImages: number; // The maximum number of images that can be inputted in a single request
	generatesImages: boolean; // Whether the model can generate images
	reasons: boolean; // Whether the model can generate reasoning
	extendedThinking: boolean; // Whether the model can generate extended thinking
	description: string; // A description of the model
	max_input_per_request: number; // The maximum number of tokens that can be inputted in a single request
	web_search: boolean; // Whether the model can use web search
	web_search_price?: number; // The price per web search
};

export type ModelLogos = Record<string, { logo: any }>;

interface ModelDetails {
	models: Record<string, Model>;
}

export type ModelDictionary = Record<ApiProvider, ModelDetails>;
