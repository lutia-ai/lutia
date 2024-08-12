import { writable } from 'svelte/store';
import { browser } from '$app/environment';
// import type { ChatMessage } from 'types';

/**
 * Creates a persistent store that syncs with localStorage.
 * @param {string} key - The key to use for localStorage.
 * @param {*} startValue - The initial value of the store.
 * @returns {import('svelte/store').Writable<Array<*>>} A writable store that persists to localStorage.
 */
function createPersistentStore(key, startValue) {
	// Create the store with the start value
	const store = writable(startValue);

	if (browser) {
		// Check if the value exists in localStorage
		const storedValue = localStorage.getItem(key);

		// If a value is stored, use it to initialize the store
		if (storedValue !== null) {
			store.set(JSON.parse(storedValue));
		}

		// Subscribe to the store and update localStorage when it changes
		store.subscribe((value) => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return store;
}

/**
 * Clears the chat history from both the store and localStorage.
 */
export function clearChatHistory() {
	// Clear the chatHistory store
	chatHistory.set([]);

	// Clear the chatHistory from localStorage
	if (browser) {
		localStorage.removeItem('chatHistory');
	}
}

/**
 * Persistent store for the dark mode setting.
 * @type {import('svelte/store').Writable<*>}
 */
export const chosenCompany = createPersistentStore('chosenCompany', 'anthropic');

/**
 * Persistent store for the dark mode setting.
 * @type {import('svelte/store').Writable<*>}
 */
export const darkMode = createPersistentStore('darkMode', false);

/**
 * Persistent store for showing the input pricing.
 * @type {import('svelte/store').Writable<*>}
 */
export const inputPricing = createPersistentStore('inputPricing', false);

/**
 * Persistent store for the chat history.
 * @type {import('svelte/store').Writable<Array<*>>}
 */
export const chatHistory = createPersistentStore('chatHistory', []);

/**
 * Persistent store for the number of previous messages.
 * @type {import('svelte/store').Writable<*>}
 */
export const numberPrevMessages = createPersistentStore('numberPrevMessages', 0);

/**
 * Persistent store for showing the pricing in the LLM dropdown.
 * @type {import('svelte/store').Writable<*>}
 */
export const showPricing = createPersistentStore('showPricing', false);

/**
 * Persistent store for controlling the legacy models are showed in the LLM dropdown container.
 * @type {import('svelte/store').Writable<*>}
 */
export const showLegacyModels = createPersistentStore('showLegacyModels', false);
