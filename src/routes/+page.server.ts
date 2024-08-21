import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event: RequestEvent) => {
	const session = await event.locals.auth();

	if (!session) {
		throw redirect(307, '/auth');
	}

	// User is authenticated, continue with the load function
	return {
		// ... your data
	};
};
