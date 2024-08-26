import bcrypt from 'bcrypt';
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { retrieveUserByEmail, createUser } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/customErrors';

export const actions = {
	checkEmailExists: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');

		if (typeof email !== 'string' || !email) {
			return fail(400, { message: 'Email is required' });
		}

		try {
			const user = await retrieveUserByEmail(email);
			return {
				exists: !!user,
				isGoogleUser: user?.oauth === 'google'
			};
		} catch (err) {
			if (err instanceof UserNotFoundError) {
				return {
					exists: false,
					isGoogleUser: false
				};
			}
			console.error('Error checking email existence: ', err);
			return fail(500, { message: 'Internal server error' });
		}
	},
	logIn: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email !== 'string' || !email) {
			return fail(400, { message: 'Email is required' });
		}

		if (typeof password !== 'string' || !password) {
			return fail(400, { message: 'Password is required' });
		}

		try {
			const user = await retrieveUserByEmail(email);
			const isMatch = await bcrypt.compare(password, user.password_hash!);

			if (!isMatch) {
				return fail(401, { message: 'Invalid email or password' });
			}

			return {
				success: true
			};
		} catch (err) {
			if (err instanceof UserNotFoundError) {
				return fail(401, { message: 'Invalid email or password' });
			}
			console.error('Error during login: ', err);
			return fail(500, { message: 'Internal server error' });
		}
	},
	register: async ({ request, url }) => {
		const data = await request.formData();
		const email = data.get('email');
		const name = data.get('name');
		const password = data.get('password');
		const confirmPassword = data.get('confirmPassword');

		if (typeof email !== 'string' || !email) {
			return fail(400, { message: 'Email is required' });
		}

		if (typeof password !== 'string' || !password) {
			return fail(400, { message: 'Password is required' });
		}

		if (typeof name !== 'string' || !name) {
			return fail(400, { message: 'Name is required' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: "Passwords don't match" });
		}

		if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
			return fail(400, { message: 'Password must contain a special character e.g. @' });
		}

		if (!/[A-Z]/.test(password)) {
			return fail(400, { message: 'Password must contain a capital letter' });
		}

		if (!/[0-9]/.test(password)) {
			return fail(400, { message: 'Password must contain a number' });
		}

		try {
			const userData = {
				email: email as string,
				name: name as string,
				password_hash: password as string
			};

			try {
				const user = await retrieveUserByEmail(email);
				if (user.oauth === 'google') {
					return fail(401, {
						message:
							"Looks like you're using an email that's already linked with Google"
					});
				}

				if (user) {
					return fail(400, { message: 'Account with that email already exists' });
				}
			} catch (err) {
				if (err instanceof UserNotFoundError) {
					await createUser(userData);
					return {
						success: true
					};
				}
			}
		} catch (err) {
			console.error('Error during login: ', err);
			return fail(500, { message: 'Internal server error' });
		}
	}
} satisfies Actions;
