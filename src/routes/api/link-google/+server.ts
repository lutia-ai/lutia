import { error, json } from '@sveltejs/kit';
import { retrieveUserByEmail, updateUser } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/customErrors';
import { type User as UserEntity } from '@prisma/client';
import { generateLinkingToken } from '$lib/auth/utils';

export async function GET({ locals }) {
	let session = await locals.auth();
	if (!session || !session.user) {
		throw error(401, 'Forbidden');
	}

	let user: UserEntity;
	try {
		user = await retrieveUserByEmail(session.user.email!);
	} catch (error) {
		if (error instanceof UserNotFoundError) {
			throw error;
		}
	}

	if (user!.oauth === 'google') {
		return json({ error: 'Invalid operation' }, { status: 400 });
	}

	// Generate a linking token and store it (e.g., in Redis or a database)
	const linkingToken = generateLinkingToken();
	await updateUser(user!.id, { oauth_link_token: linkingToken });
	return json({ linkingToken });
}
