import bcryptjs from 'bcryptjs';
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { retrieveUserByEmail, createUser, verifyUserEmailToken } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/types/customErrors';
import { verifyRecaptcha } from '$lib/auth/recaptcha';

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
	register: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const name = data.get('name');
		const password = data.get('password');
		const confirmPassword = data.get('confirmPassword');
		const recaptchaToken = data.get('recaptchaToken') as string;

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

		// Verify reCAPTCHA
		const recaptchaValid = await verifyRecaptcha(recaptchaToken);
		if (!recaptchaValid) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		try {
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
					await createUser(email, name, password);
					return {
						success: true
					};
				}
			}
		} catch (err) {
			console.error('Error during login: ', err);
			return fail(500, { message: 'Internal server error' });
		}
	},
	verifyEmailToken: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		const data = await request.formData();
		const email = data.get('email');
		const emailToken = data.get('emailToken');
		const recaptchaToken = data.get('recaptchaToken') as string;

		if (typeof email !== 'string' || !email) {
			return fail(400, { message: 'Email is required' });
		}

		if (typeof emailToken !== 'string' || !emailToken) {
			return fail(400, { message: 'emailToken is missing' });
		}

		// Verify reCAPTCHA
		const recaptchaValid = await verifyRecaptcha(recaptchaToken);
		if (!recaptchaValid) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		try {
			const user = await retrieveUserByEmail(email);

			const isVerified = await verifyUserEmailToken(user, email, emailToken);
			if (isVerified) {
				// Email verification successful
				return {
					success: true,
					message: 'Email verified successfully'
				};
			} else {
				// Email verification failed
				return fail(400, { message: 'Email verification failed. Invalid token or email.' });
			}
		} catch (error) {
			if (error instanceof UserNotFoundError) {
				return fail(500, { message: 'No user found with that email' });
			}
			console.error('Error during email verification:', error);
			return fail(500, { message: 'An error occurred during email verification' });
		}
	}
} satisfies Actions;
