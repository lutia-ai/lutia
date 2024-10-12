import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { ChatComponent } from '$lib/types';
import type { ApiProvider } from '@prisma/client';

function createPersistentStore<T>(key: string, startValue: T): Writable<T> {
	// Create the store with the start value
	const store = writable(startValue);

	if (browser) {
		// Check if the value exists in localStorage
		const storedValue = localStorage.getItem(key);

		// If a value is stored, use it to initialize the store
		if (storedValue !== null) {
			store.set(JSON.parse(storedValue) as T);
		}

		// Subscribe to the store and update localStorage when it changes
		store.subscribe((value) => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return store;
}

// Persistent store for the chosenCompany setting
export const chosenCompany = createPersistentStore<ApiProvider>('chosenCompany', 'anthropic');

// Persistent store for the dark mode setting
export const darkMode = createPersistentStore<boolean>('darkMode', false);

// store for the chat history
export const chatHistory = writable<ChatComponent[]>([]);

// Persistent store for the number of previous messages
export const numberPrevMessages = createPersistentStore<number>('numberPrevMessages', 0);

// Persistent store for showing the pricing in the LLM dropdown
export const showPricing = createPersistentStore<boolean>('showPricing', false);

// Persistent store for controlling the legacy models are shown in the LLM dropdown container
export const showLegacyModels = createPersistentStore<boolean>('showLegacyModels', false);
