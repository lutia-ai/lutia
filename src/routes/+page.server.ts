import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { retrieveUserWithSettingsByEmail } from '$lib/db/crud/user';
import { goto } from '$app/navigation';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session || !session.user || !session.user.email) {
		return; // as user is not authenticated so continue to normal homepage
	}

	// see if user exists in the db
	const user = await retrieveUserWithSettingsByEmail(session.user.email).catch((error) => {
		console.error('Error retrieving user:', error);
		throw redirect(307, '/auth?error=UserRetrievalError');
	});

	if (!user.email_verified) {
		// if the users email isn't verified redirect to the auth verify email page
		throw redirect(307, `/auth?error=CredentialsSignin&code=unverified_${session.user.email}`);
	}

	if (user) {
		// if the user is authenticated & premium member then redirect to the chat new page
		throw redirect(307, '/chat/new');
	}
};
