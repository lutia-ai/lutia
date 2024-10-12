import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { retrieveApiRequestsWithMessage } from '$lib/db/crud/apiRequest';
import { serializeApiRequest } from '$lib/chatHistory';
import { deleteAllUserMessages } from '$lib/db/crud/message';
import { retrieveUserByEmail, retrieveUserWithSettingsByEmail } from '$lib/db/crud/user';
import { retrieveUsersBalance, updateUserBalanceWithIncrement } from '$lib/db/crud/balance';
import {
	chargeUserCard,
	deleteUserCardDetails,
	getStripeCardDetails,
	saveUserCardDetails
} from '$lib/stripe/stripeFunctions';
import { updateUserSettings } from '$lib/db/crud/userSettings';
import type { UserSettings } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session || !session.user || !session.user.email) {
		throw redirect(307, '/auth');
	}

	const user = await retrieveUserWithSettingsByEmail(session.user.email).catch((error) => {
		console.error('Error retrieving user:', error);
		throw redirect(307, '/auth?error=UserRetrievalError');
	});

	if (!user.email_verified) {
		throw redirect(307, `/auth?error=CredentialsSignin&code=unverified_${session.user.email}`);
	}

	const apiRequests = await retrieveApiRequestsWithMessage(Number(session.user.id));

	const serializedApiRequests = apiRequests.map(serializeApiRequest);

	// User is authenticated, continue with the load function
	return {
		user,
		userImage: session.user.image,
		apiRequests: serializedApiRequests
	};
};

export const actions = {
	clearChatHistory: async ({ locals }) => {
		// Access the auth object from locals
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		await deleteAllUserMessages(parseInt(userId!, 10));

		return { success: true };
	},
	getUsersBillingDetails: async ({ locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		let balance;
		let cardDetails;
		try {
			const user = await retrieveUserByEmail(session.user.email!);
			balance = await retrieveUsersBalance(Number(userId));
			cardDetails = await getStripeCardDetails(user.stripe_id!);
		} catch (err) {
			throw err;
		}

		return {
			balance,
			cardDetails
		};
	},
	saveUsersCardDetails: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const formData = await request.formData();
			const tokenId = formData.get('token');

			if (typeof tokenId !== 'string') {
				throw new Error('Invalid token');
			}

			const user = await retrieveUserByEmail(session.user.email!);
			const customerId = user.stripe_id;

			if (!customerId) {
				throw new Error('Stripe customer ID not found');
			}

			const cardDetails = await saveUserCardDetails(customerId, tokenId);

			return {
				cardDetails
			};
		} catch (err) {
			console.error('Error saving card details:', err);
			return {
				type: 'failure',
				data: {
					message: err instanceof Error ? err.message : 'An unknown error occurred'
				}
			};
		}
	},
	deleteCardDetails: async ({ locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const user = await retrieveUserByEmail(session.user.email!);
			const customerId = user.stripe_id;

			if (!customerId) {
				throw new Error('Stripe customer ID not found');
			}

			await deleteUserCardDetails(customerId);

			return;
		} catch (err) {
			console.error('Error saving card details:', err);
			return {
				type: 'failure',
				data: {
					message: err instanceof Error ? err.message : 'An unknown error occurred'
				}
			};
		}
	},
	topupBalance: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const formData = await request.formData();
			const creditAmount = Number(formData.get('creditAmount'));

			const user = await retrieveUserByEmail(session.user.email!);
			const customerId = user.stripe_id;

			if (!customerId) {
				throw new Error('Stripe customer ID not found');
			}

			const chargeResult = await chargeUserCard(customerId, creditAmount * 1.2); // add tax to creditAmount
			const balance = await updateUserBalanceWithIncrement(user.id, creditAmount);

			return {
				chargeResult,
				balance
			};
		} catch (err) {
			console.error('Error topping up:', err);
			return {
				type: 'failure',
				data: {
					message: err instanceof Error ? err.message : 'An unknown error occurred'
				}
			};
		}
	},
	saveUserSettings: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const formData = await request.formData();
			const user_settings_str = formData.get('user_settings');

			if (typeof user_settings_str !== 'string') {
				throw new Error('Invalid user_settings');
			}

			const user_settings: Partial<UserSettings> = JSON.parse(user_settings_str);
			const updatedSettings = await updateUserSettings(
				Number(session.user.id),
				user_settings
			);

			console.log('saved user settings: ', user_settings);
			console.log('saved user settings: ', updatedSettings);

			return {
				updatedSettings
			};
		} catch (err) {
			console.error('Error saving user settings:', err);
			return {
				type: 'failure',
				data: {
					message: err instanceof Error ? err.message : 'An unknown error occurred'
				}
			};
		}
	}
} satisfies Actions;
