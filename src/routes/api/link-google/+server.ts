import { error, json } from '@sveltejs/kit';
import crypto from 'crypto';
import { retrieveUserByEmail, updateUser } from '$lib/db/crud/user';
import type { User as UserEntity } from '$lib/db/entities/User.js';
import { UserNotFoundError } from '$lib/customErrors';

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

function generateLinkingToken(): string {
	// Generate 32 bytes of random data
	const randomBytes = crypto.randomBytes(32);

	// Convert the random bytes to a hexadecimal string
	const token = randomBytes.toString('hex');

	return token;
}
