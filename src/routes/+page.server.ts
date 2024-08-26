import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { retrieveApiRequestsWithMessage } from '$lib/db/crud/apiRequest';
import { serializeApiRequest } from '$lib/chatHistory';
import { deleteAllUserMessages } from '$lib/db/crud/message';
import type { User as UserEntity } from '$lib/db/entities/User';
import { retrieveUserByEmail } from '$lib/db/crud/user';

export const load: PageServerLoad = async (event: RequestEvent) => {
	const session = await event.locals.auth();

	if (!session || !session.user || !session.user.email) {
		throw redirect(307, '/auth');
	}

	const apiRequests = await retrieveApiRequestsWithMessage(session.user?.email);
	const serializedApiRequests = apiRequests.map(serializeApiRequest);

	// User is authenticated, continue with the load function
	return {
		apiRequests: serializedApiRequests
	};
};

export const actions = {
	clearChatHistory: async (event) => {
		// Access the auth object from locals
		const session = await event.locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		await deleteAllUserMessages(parseInt(userId!, 10));

		return { success: true };
	},
	getAccountDetails: async (event) => {
		// Access the auth object from locals
		const session = await event.locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userEmail = session.user.email;

		const user: UserEntity = await retrieveUserByEmail(userEmail!);

		return {
			name: user.name,
			email: user.email,
			oauth: user.oauth ? user.oauth : ''
		};
	}
} satisfies Actions;
