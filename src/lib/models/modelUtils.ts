import type { Model } from '$lib/types/types';
import type { ApiModel } from '@prisma/client';
import { modelDictionary } from '$lib/models/modelDictionary';

/**
 * Converts a model enum value to a human-readable format
 * @param enumValue The raw model enum value (e.g. "GPT_3_5")
 * @returns Formatted string with spaces and appropriate periods (e.g. "GPT 3.5")
 */
export function formatModelEnumToReadable(enumValue: string): string {
	// Replace underscores with spaces
	let readable = enumValue.replace(/_/g, ' ');

	// Add periods where appropriate (e.g., replace "3 5" with "3.5")
	readable = readable.replace(/(\d) (\d)/g, '$1.$2');

	return readable;
}

// Function to convert ApiModel enum value to a complete Model object
export const getModelFromName = (modelName: ApiModel): Model | null => {
	// Iterate through all providers and their models in the modelDictionary
	for (const provider of Object.values(modelDictionary)) {
		for (const model of Object.values(provider.models) as Model[]) {
			if (model.name === modelName) {
				return model;
			}
		}
	}
	return null; // Return null if model not found
};
