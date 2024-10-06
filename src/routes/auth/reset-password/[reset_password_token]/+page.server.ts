import { error, fail, type Actions } from '@sveltejs/kit';
import { retrieveUserByPasswordResetToken, updateUser } from '$lib/db/crud/user';
import type { PageServerLoad } from '../$types';
import bcryptjs from 'bcryptjs';

export const load: PageServerLoad = async ({ params }) => {
	// @ts-ignore
	const token = params.reset_password_token;

	if (!token) {
		throw error(400, 'Invalid reset password token');
	}

	try {
		const user = await retrieveUserByPasswordResetToken(token);
		return {
			success: true,
			userId: user.id
		};
	} catch (err) {
		console.error('Error verifying reset password token:', err);
		throw error(500, 'An error occurred while verifying the reset password token');
	}
};

export const actions = {
	resetPassword: async ({ request }) => {
		const data = await request.formData();
		const password = data.get('password');
		const userId = data.get('user_id');

		if (typeof password !== 'string' || !password) {
			return fail(400, { message: 'Password is required' });
		}

		if (typeof userId !== 'string' || !userId) {
			return fail(400, { message: 'No user Id found' });
		}

		if (!/[!@#$%_^&*(),.?":{}|<>]/.test(password)) {
			return fail(400, { message: 'Password must contain a special character e.g. @' });
		}

		if (!/[A-Z]/.test(password)) {
			return fail(400, { message: 'Password must contain a capital letter' });
		}

		if (!/[0-9]/.test(password)) {
			return fail(400, { message: 'Password must contain a number' });
		}

		try {
			let password_hash = password;
			const saltRounds = 10;
			password_hash = await bcryptjs.hash(password, saltRounds);
			await updateUser(Number(userId), {
				password_hash: password_hash,
				reset_password_token: undefined,
				reset_expiration: undefined
			});

			return { message: 'Password reset successfully' };
		} catch (err) {
			return fail(500, { message: 'Internal server error.' });
		}
	}
} satisfies Actions;
