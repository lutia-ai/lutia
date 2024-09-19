import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { retrieveApiRequestsWithMessage } from '$lib/db/crud/apiRequest';
import { serializeApiRequest } from '$lib/chatHistory';
import { deleteAllUserMessages } from '$lib/db/crud/message';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/customErrors';
// import type { User } from '@prisma/client';
import { retrieveUsersBalance, updateUserBalanceWithIncrement } from '$lib/db/crud/balance';
import {
	chargeUserCard,
	getStripeCardDetails,
	saveUserCardDetails
} from '$lib/stripe/stripeFunctions';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session || !session.user || !session.user.email) {
		throw redirect(307, '/auth');
	}

	const apiRequests = await retrieveApiRequestsWithMessage(locals.prisma, session.user!.email);

	const serializedApiRequests = apiRequests.map(serializeApiRequest);

	// User is authenticated, continue with the load function
	return {
		user: session.user,
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

		await deleteAllUserMessages(locals.prisma, parseInt(userId!, 10));

		return { success: true };
	},
	getAccountDetails: async ({ locals }) => {
		// Access the auth object from locals
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userEmail = session.user.email;

		let user: User;
		try {
			user = await retrieveUserByEmail(locals.prisma, userEmail!);
		} catch (error) {
			if (error instanceof UserNotFoundError) {
				throw error;
			}
		}

		return {
			name: user!.name,
			email: user!.email,
			oauth: user!.oauth ? user!.oauth : ''
		};
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
			const user = await retrieveUserByEmail(locals.prisma, session.user.email!);
			balance = await retrieveUsersBalance(locals.prisma, Number(userId));
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

			const user = await retrieveUserByEmail(locals.prisma, session.user.email!);
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
	topupBalance: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const formData = await request.formData();
			const creditAmount = Number(formData.get('creditAmount'));

			const user = await retrieveUserByEmail(locals.prisma, session.user.email!);
			const customerId = user.stripe_id;

			if (!customerId) {
				throw new Error('Stripe customer ID not found');
			}

			const chargeResult = await chargeUserCard(customerId, creditAmount);
			const balance = await updateUserBalanceWithIncrement(
				locals.prisma,
				user.id,
				creditAmount
			);

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
	}
} satisfies Actions;
