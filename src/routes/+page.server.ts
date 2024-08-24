import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { retrieveApiRequestsWithMessage } from '$lib/db/crud/apiRequest';
import { serializeApiRequest } from '$lib/chatHistory';
import { deleteAllUserMessages } from '$lib/db/crud/message';

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

		// Now you can use the session information
		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		console.log(userId);

		await deleteAllUserMessages(parseInt(userId!, 10));

		return { success: true };
	}
} satisfies Actions;
