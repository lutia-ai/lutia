import { modelDictionary } from '$lib/models/modelDictionary';
import type { ModelDictionary, Model } from '$lib/models/types';

/**
 * Checks if a model belongs to a specific company/provider
 */
export function isModelByCompany(company: keyof ModelDictionary, modelName: string): boolean {
	return Object.values(modelDictionary[company].models).some(
		(model) => (model as Model).name === modelName
	);
}

/**
 * Checks if the model is an Anthropic model
 */
export function isModelAnthropic(modelName: string): boolean {
	return isModelByCompany('anthropic', modelName);
}

/**
 * Checks if the model is an OpenAI model
 */
export function isModelOpenAI(modelName: string): boolean {
	return isModelByCompany('openAI', modelName);
}

/**
 * Checks if the model is a Google model
 */
export function isModelGoogle(modelName: string): boolean {
	return isModelByCompany('google', modelName);
}

/**
 * Checks if the model is a Meta model
 */
export function isModelMeta(modelName: string): boolean {
	return isModelByCompany('meta', modelName);
}

/**
 * Checks if the model is an xAI model
 */
export function isModelXAI(modelName: string): boolean {
	return isModelByCompany('xAI', modelName);
}

/**
 * Checks if the model is a DeepSeek model
 */
export function isModelDeepSeek(modelName: string): boolean {
	return isModelByCompany('deepSeek', modelName);
}
