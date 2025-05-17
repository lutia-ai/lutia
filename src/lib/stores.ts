import { writable, type Writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { ChatComponent, Message, Model } from '$lib/types/types';
import type { ApiProvider } from '@prisma/client';
import { modelDictionary } from './models/modelDictionary';

function createPersistentStore<T>(key: string, startValue: T): Writable<T> {
	// Create the store with the start value
	const store = writable(startValue);

	if (browser) {
		// Check if the value exists in localStorage
		const storedValue = localStorage.getItem(key);

		// If a value is stored, use it to initialize the store
		if (storedValue !== null) {
			try {
				const parsedValue = JSON.parse(storedValue);
				// Check if our special null marker is used (for undefined values)
				if (
					parsedValue === null &&
					storedValue === 'null' &&
					(startValue === undefined || typeof startValue === 'undefined')
				) {
					store.set(undefined as unknown as T);
				} else {
					store.set(parsedValue as T);
				}
			} catch (e) {
				console.error(`Error parsing stored value for ${key}:`, e);
				store.set(startValue);
			}
		}

		// Subscribe to the store and update localStorage when it changes
		store.subscribe((value) => {
			if (value === undefined) {
				// Store null as a marker for undefined
				localStorage.setItem(key, 'null');
			} else {
				localStorage.setItem(key, JSON.stringify(value));
			}
		});
	}

	return store;
}

// Persistent store for the chosenCompany setting
export const chosenCompany = createPersistentStore<ApiProvider>('chosenCompany', 'anthropic');

// Persistent store for the companySelection setting
export const companySelection = createPersistentStore<ApiProvider[]>(
	'companySelection',
	Object.keys(modelDictionary) as ApiProvider[]
);

// Persistent store for the gptModelSelection setting
export const gptModelSelection = createPersistentStore<Model[]>(
	'gptModelSelection',
	Object.values(modelDictionary['anthropic'].models)
);

// Persistent store for the chosenModel setting
export const chosenModel = createPersistentStore<Model>(
	'chosenModel',
	modelDictionary.anthropic.models.claude37Sonnet
);

// Persistent store for the conversationId setting
export const conversationId = createPersistentStore<string | undefined>('conversationId', 'new');

// Persistent store for the fullPrompt setting
export const fullPrompt = createPersistentStore<Message[] | string>('fullPrompt', '');

// Persistent store for the contextWindowOpen setting
export const contextWindowOpen = createPersistentStore<boolean>('contextWindowOpen', true);

// Persistent store for the mobileSidebarOpen setting
export const mobileSidebarOpen = createPersistentStore<boolean>('mobileSidebarOpen', false);

// Persistent store for the isLargeScreen setting
export const isLargeScreen = createPersistentStore<boolean>('isLargeScreen', true);

// Persistent store for the isSettingsOpen setting
export const isSettingsOpen = createPersistentStore<boolean>('isSettingsOpen', false);

// Persistent store for the conversationsOpen setting
export const conversationsOpen = createPersistentStore<boolean>('conversationsOpen', false);

// Persistent store for the files sidebar open state
export const filesSidebarOpen = createPersistentStore<boolean>('filesSidebarOpen', false);

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

// Persistent store for controlling if the context window is set to automatic or manual
export const isContextWindowAuto = createPersistentStore<boolean>('isContextWindowAuto', true);

// Store for controlling body scroll lock
export const bodyScrollLocked = writable<boolean>(false);

// Store for controlling if the dragover event is triggered
export const isDragging = writable<boolean>(false);

// Derived store to check if any sidebar is open
export const isSidebarOpen = derived(
	[conversationsOpen, contextWindowOpen, filesSidebarOpen],
	([$conversationsOpen, $contextWindowOpen, $filesSidebarOpen]) => {
		return $conversationsOpen || $contextWindowOpen || $filesSidebarOpen;
	}
);
