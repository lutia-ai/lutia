import { modelDictionary } from '$lib/modelDictionary';
import type { Model } from '$lib/types';
import type { ApiModel } from '@prisma/client';

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
