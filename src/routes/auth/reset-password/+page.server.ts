import { fail, type Actions } from '@sveltejs/kit';
import { retrieveUserByEmail, updateUser } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/types/customErrors';
import { generateLinkingToken } from '$lib/auth/utils';
import { env } from '$env/dynamic/private';
import { emailBody, sendEmail } from '$lib/services/email';

export const actions = {
	resetPassword: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');

		if (typeof email !== 'string' || !email) {
			return fail(400, { message: 'Email is required' });
		}

		try {
			const user = await retrieveUserByEmail(email);
			// Generate a linking token and store it (e.g., in Redis or a database)
			const linkingToken = generateLinkingToken();
			const expiresAt = new Date(Date.now() + 3600000); // Token expires in 1 hour
			await updateUser(user.id, {
				reset_password_token: linkingToken,
				reset_expiration: expiresAt
			});
			const resetLink = `${env.BASE_URL}/auth/reset-password/${linkingToken}`;
			await sendEmail(
				'reset-password@lutia.ai',
				email,
				'Reset your password',
				emailBody(resetLink)
			);

			return { message: 'Reset link sent to your email' };
		} catch (err) {
			console.error(err);
			if (err instanceof UserNotFoundError) {
				return fail(401, { message: 'No account associated with that email' });
			}
			return fail(500, { message: 'Internal server error.' });
		}
	}
} satisfies Actions;
