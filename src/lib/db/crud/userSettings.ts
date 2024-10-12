import prisma from '$lib/prisma';
import type { UserSettings } from '@prisma/client';

export async function createUserSettings(userId: number) {
	try {
		// Create user settings for a user with the given `userId`
		const userSettings = await prisma.userSettings.create({
			data: {
				user_id: userId,
				company_menu_open: true,
				prompt_pricing_visible: true,
				show_context_window_button: true,
				context_window: 3
			}
		});

		return userSettings;
	} catch (error) {
		console.error('Error creating user settings:', error);
		throw error;
	}
}

export async function updateUserSettings(userId: number, data: Partial<UserSettings>) {
	try {
		// Update user settings for a user with the given `userId`
		const userSettings = await prisma.userSettings.update({
			where: {
				user_id: userId
			},
			data: {
				company_menu_open: data.company_menu_open,
				prompt_pricing_visible: data.prompt_pricing_visible,
				context_window: data.context_window,
				show_context_window_button: data.show_context_window_button
			}
		});

		return userSettings;
	} catch (error) {
		console.error('Error updating user settings:', error);
		throw error;
	}
}
