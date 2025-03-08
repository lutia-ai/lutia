import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from '../../$types';
import { retrieveApiRequestsWithMessage } from '$lib/db/crud/apiRequest';
import { deleteAllUserMessagesWithoutAConversation } from '$lib/db/crud/message';
import { retrieveUserByEmail, retrieveUserWithSettingsByEmail } from '$lib/db/crud/user';
import { retrieveUsersBalance, updateUserBalanceWithIncrement } from '$lib/db/crud/balance';
import {
	chargeUserCard,
	deleteUserCardDetails,
	getStripeCardDetails,
	saveUserCardDetails
} from '$lib/stripe/stripeFunctions';
import { updateUserSettings } from '$lib/db/crud/userSettings';
import { PaymentTier, type Conversation, type UserSettings } from '@prisma/client';
import { retrieveConversationsByUserId, retrieveApiRequestsByConversationId, retrieveConversationById, verifyConversationOwnership, updateConversation, deleteConversation } from '$lib/db/crud/conversation';

interface ChatParams {
    id: string;
}

export const load: PageServerLoad = async ({ locals, params }) => {
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

	// Check if we have a valid conversation ID (not 'new')
	const { id: conversationId } = params as ChatParams;

    if (user.payment_tier === PaymentTier.Premium) {
        if (conversationId && conversationId !== 'new') {
            // Try to load the specific conversation
            const conversation = await retrieveConversationById(conversationId);
            
            // Verify this conversation belongs to the current user
            if (conversation && conversation.user_id === Number(session.user.id)) {
                // Return conversation-specific API requests
                return {
                    user,
                    userImage: session.user.image,
                    apiRequests: retrieveApiRequestsByConversationId(conversationId, true),
                    conversation
                };
            } else {

            }
        }

        // return empty messages for all invalid conversations
        return {
            user,
            userImage: session.user.image,
            apiRequests: []
        };
    }

	// If no conversation ID or ID not valid, return all user's API requests
	return {
		user,
		userImage: session.user.image,
		apiRequests: retrieveApiRequestsWithMessage(Number(session.user.id), true)
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

		await deleteAllUserMessagesWithoutAConversation(parseInt(userId!, 10));

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
    getUsersConversations: async ({ locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		// let balance;
		// let cardDetails;
        let conversations: Conversation[];
		try {
            conversations = await retrieveConversationsByUserId(Number(userId));
		} catch (err) {
			throw err;
		}

		return {
			conversations
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

			await chargeUserCard(customerId, creditAmount * 1.2); // add tax to creditAmount
			const balance = await updateUserBalanceWithIncrement(user.id, creditAmount);

			return {
				type: 'success',
				balance,
				message: 'Payment successful'
			};
		} catch (err) {
			return fail(400, {
				message: err instanceof Error ? err.message : 'An unknown error occurred'
			});
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
	},
    // New action for updating conversation title
    updateConversationTitle: async ({ request, locals }) => {
        // Get the authenticated user
        const session = await locals.auth();
        if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
        
        const userId = Number(session.user.id);
        const formData = await request.formData();
        const conversationId = formData.get('conversationId') as string;
        const title = formData.get('title') as string;
        
        // Validate inputs
        if (!conversationId) {
            return fail(400, { message: 'Conversation ID is required' });
        }
        
        if (!title || title.trim() === '') {
            return fail(400, { message: 'Title cannot be empty' });
        }
        
        try {
            // Verify that the conversation belongs to this user
            const isOwner = await verifyConversationOwnership(conversationId, userId);
            if (!isOwner) {
                return fail(403, { message: 'You do not have permission to update this conversation' });
            }
            
            // Update the conversation
            const updatedConversation = await updateConversation(conversationId, {
                title: title.trim()
            });
            
            return {
                type: 'success',
                conversation: updatedConversation
            };
        } catch (error) {
            console.error('Error updating conversation title:', error);
            return fail(500, { message: 'Failed to update conversation title' });
        }
    },
    deleteConversation: async ({ request, locals }) => {
        // Get the authenticated user
        const session = await locals.auth();
        if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
        
        const userId = Number(session.user.id);
        const formData = await request.formData();
        const conversationId = formData.get('conversationId') as string;
        
        // Validate inputs
        if (!conversationId) {
            return fail(400, { message: 'Conversation ID is required' });
        }
        
        try {
            // Verify that the conversation belongs to this user
            const isOwner = await verifyConversationOwnership(conversationId, userId);
            if (!isOwner) {
                return fail(403, { message: 'You do not have permission to delete this conversation' });
            }
            
            // Delete the conversation
            await deleteConversation(conversationId);
            
            return {
                type: 'success',
                message: 'Conversation deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting conversation:', error);
            return fail(500, { message: 'Failed to delete conversation' });
        }
    }
} satisfies Actions;
