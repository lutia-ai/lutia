import { writable } from 'svelte/store';
import type { Model } from '$lib/types/types';
import type { ApiProvider } from '@prisma/client';
import { chosenCompany, companySelection, gptModelSelection, chosenModel } from '$lib/stores';
import { modelDictionary } from '$lib/models/modelDictionary';

/**
 * Updates the chosen company and resets the model selection based on the new company.
 * @param company The API provider to select
 */
export function selectCompany(company: ApiProvider) {
	chosenCompany.set(company);
	companySelection.set(Object.keys(modelDictionary) as ApiProvider[]);
	companySelection.set(getCompanySelection(company));
	gptModelSelection.set(Object.values(modelDictionary[company].models));
	chosenModel.set(getGptModelSelection(company)[0]);
}

/**
 * Updates the chosen model and resets the model selection list.
 * @param model The model to select
 */
export function selectModel(model: Model) {
	chosenModel.set(model);
	const company = getCompanyFromStore();
	gptModelSelection.set(Object.values(modelDictionary[company].models));
}

/**
 * Gets the current company selection
 * @param selectedCompany The currently selected company
 * @returns Array of API providers excluding the selected company
 */
function getCompanySelection(selectedCompany: ApiProvider): ApiProvider[] {
	return (Object.keys(modelDictionary) as ApiProvider[]).filter((c) => c !== selectedCompany);
}

/**
 * Gets the models for a given company
 * @param company The API provider
 * @returns Array of models for the given company
 */
function getGptModelSelection(company: ApiProvider): Model[] {
	return Object.values(modelDictionary[company].models);
}

/**
 * Helper function to get the current company from the store
 * @returns The current company from the store
 */
function getCompanyFromStore(): ApiProvider {
	let result: ApiProvider = 'anthropic'; // Default

	// Get the current value from the store
	const unsubscribe = chosenCompany.subscribe((value) => {
		result = value;
	});

	// Unsubscribe to avoid memory leaks
	unsubscribe();

	return result;
}
