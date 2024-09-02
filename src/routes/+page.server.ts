import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { retrieveApiRequestsWithMessage } from '$lib/db/crud/apiRequest';
import { serializeApiRequest } from '$lib/chatHistory';
import { deleteAllUserMessages } from '$lib/db/crud/message';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/customErrors';
import type { User } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session || !session.user || !session.user.email) {
		throw redirect(307, '/auth');
	}

	const apiRequests = await retrieveApiRequestsWithMessage(session.user!.email);

	const serializedApiRequests = apiRequests.map(serializeApiRequest);

	// User is authenticated, continue with the load function
	return {
		user: session.user,
		apiRequests: serializedApiRequests
	};
};

export const actions = {
	clearChatHistory: async ({ locals }) => {
		// Access the auth object from locals
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		await deleteAllUserMessages(parseInt(userId!, 10));

		return { success: true };
	},
	getAccountDetails: async ({ locals }) => {
		// Access the auth object from locals
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userEmail = session.user.email;

		let user: User;
		try {
			user = await retrieveUserByEmail(userEmail!);
		} catch (error) {
			if (error instanceof UserNotFoundError) {
				throw error;
			}
		}

		return {
			name: user!.name,
			email: user!.email,
			oauth: user!.oauth ? user!.oauth : ''
		};
	}
} satisfies Actions;
