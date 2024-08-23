import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { retrieveApiRequests } from '$lib/db/crud/apiRequest';
import { serializeApiRequest } from '$lib/chatHistory';

export const load: PageServerLoad = async (event: RequestEvent) => {
	const session = await event.locals.auth();

	if (!session) {
		throw redirect(307, '/auth');
	}

	const apiRequests = await retrieveApiRequests(session.user!.email!);
	const serializedApiRequests = apiRequests.map(serializeApiRequest);
	console.log(serializedApiRequests[serializedApiRequests.length - 1].message?.pictures[0]);

	// User is authenticated, continue with the load function
	return {
		apiRequests: serializedApiRequests
	};
};
