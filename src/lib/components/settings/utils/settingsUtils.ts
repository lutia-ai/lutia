import { deserialize } from "$app/forms";
import type { UserSettings } from "@prisma/client";
import type { ActionResult } from "@sveltejs/kit";

/**
 * Saves user settings to the server via form submission
 * Serializes the settings object and sends as a POST request
 * @param userSettings - Partial user settings object to save
 * @returns Promise that resolves when the save operation completes
 */
export async function saveUserSettings(userSettings: Partial<UserSettings>) {
	try {
		const body = new FormData();
		body.append('user_settings', JSON.stringify(userSettings));

		const response = await fetch('?/saveUserSettings', {
			method: 'POST',
			body
		});
		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success' && result.data) {
		} else if (result.type === 'failure' && result.data) {
			console.error('Failed to save user settings');
		}
	} catch (error) {
		console.error('Failed to save user settings');
	}
}