import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '../../$types';
import { retrieveUserWithSettingsByEmail } from '$lib/db/crud/user';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.email) {
		throw redirect(307, '/auth');
	}

	const user = await retrieveUserWithSettingsByEmail(session.user.email).catch((error) => {
		console.error('Error retrieving user:', error);
		throw redirect(307, '/auth?error=UserRetrievalError');
	});

	if (!user.email_verified) {
		throw redirect(307, `/auth?error=CredentialsSignin&code=unverified_${session.user.email}`);
	}

	return {
		user, // Pass user data down to child pages
		userImage: session.user.image
	};
};
