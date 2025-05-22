import type { Conversation, ApiRequest } from '@prisma/client';
import { PaymentTier } from '@prisma/client';
import type { ApiRequestWithMessage, SerializedApiRequest } from '$lib/types/types';
import prisma from '$lib/db/prisma';
import { serializeApiRequest } from '$lib/components/chat-history/utils/chatHistory';

/**
 * Create a new conversation for a user
 */
export async function createConversation(
	userId: number,
	title: string,
	folderId?: number
): Promise<Conversation> {
	try {
		const conversation = await prisma.conversation.create({
			data: {
				title,
				user_id: userId,
				folder_id: folderId || null
			}
		});

		return conversation;
	} catch (error) {
		console.error('Error creating conversation:', error);
		throw error;
	}
}

/**
 * Retrieve all conversations for a user
 */
export async function retrieveConversationsByUserId(userId: number): Promise<Conversation[]> {
	try {
		const conversations = await prisma.conversation.findMany({
			where: {
				user_id: userId
			},
			orderBy: {
				last_message: 'desc'
			}
		});

		return conversations;
	} catch (error) {
		console.error('Error retrieving conversations for user:', error);
		throw error;
	}
}

/**
 * Retrieve conversations for a user with pagination and payment tier limits
 */
export async function retrieveConversationsByUserIdPaginated(
	userId: number,
	page: number = 1,
	pageSize: number = 20,
	paymentTier: PaymentTier
): Promise<{ conversations: Conversation[]; hasMore: boolean; total: number }> {
	try {
		const skip = (page - 1) * pageSize;
		const take = pageSize;

		// For PayAsYouGo users, limit to 30 conversations max
		const maxConversations = paymentTier === PaymentTier.PayAsYouGo ? 30 : undefined;

		// Get total count for the user
		const total = await prisma.conversation.count({
			where: {
				user_id: userId
			}
		});

		// For PayAsYouGo users, if they have more than 30 conversations,
		// we'll only return the 30 most recent ones
		const conversations = await prisma.conversation.findMany({
			where: {
				user_id: userId
			},
			orderBy: {
				last_message: 'desc'
			},
			skip,
			take:
				maxConversations && total > maxConversations
					? Math.min(take, maxConversations - skip)
					: take
		});

		// Calculate if there are more conversations to load
		const hasMore =
			paymentTier === PaymentTier.PayAsYouGo
				? skip + conversations.length < Math.min(total, maxConversations ?? total)
				: skip + conversations.length < total;

		return {
			conversations,
			hasMore,
			total:
				paymentTier === PaymentTier.PayAsYouGo
					? Math.min(total, maxConversations ?? total)
					: total
		};
	} catch (error) {
		console.error('Error retrieving paginated conversations for user:', error);
		throw error;
	}
}

/**
 * Retrieve conversations in a specific folder
 */
export async function retrieveConversationsByFolderId(folderId: number): Promise<Conversation[]> {
	try {
		const conversations = await prisma.conversation.findMany({
			where: {
				folder_id: folderId
			},
			orderBy: {
				last_message: 'desc'
			}
		});

		return conversations;
	} catch (error) {
		console.error('Error retrieving conversations by folder ID:', error);
		throw error;
	}
}

/**
 * Retrieve a specific conversation by ID
 */
export async function retrieveConversationById(
	conversationId: string
): Promise<Conversation | null> {
	try {
		const conversation = await prisma.conversation.findUnique({
			where: {
				id: conversationId
			}
		});

		return conversation;
	} catch (error) {
		console.error('Error retrieving conversation by ID:', error);
		throw error;
	}
}

/**
 * Update a conversation
 */
export async function updateConversation(
	conversationId: string,
	data: { title?: string; folderId?: number | null }
): Promise<Conversation> {
	try {
		const conversation = await prisma.conversation.update({
			where: {
				id: conversationId
			},
			data: {
				title: data.title,
				folder_id: data.folderId
			}
		});

		return conversation;
	} catch (error) {
		console.error('Error updating conversation:', error);
		throw error;
	}
}

/**
 * Delete a conversation and all associated messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
	try {
		await prisma.$transaction(async (tx) => {
			// Find all API requests for this conversation
			const apiRequests = await tx.apiRequest.findMany({
				where: {
					conversation_id: conversationId
				},
				select: {
					id: true,
					message_id: true
				}
			});

			// Extract message IDs (filtering out nulls)
			const messageIds = apiRequests
				.map((req) => req.message_id)
				.filter((id): id is number => id !== null);

			// Delete messages
			if (messageIds.length > 0) {
				await tx.message.deleteMany({
					where: {
						id: {
							in: messageIds
						}
					}
				});
			}

			// Update API requests to remove connection to the conversation
			await tx.apiRequest.updateMany({
				where: {
					conversation_id: conversationId
				},
				data: {
					conversation_id: null
				}
			});

			// Delete the conversation
			await tx.conversation.delete({
				where: {
					id: conversationId
				}
			});
		});
	} catch (error) {
		console.error('Error deleting conversation:', error);
		throw error;
	}
}

/**
 * Verify conversation belongs to user
 */
export async function verifyConversationOwnership(
	conversationId: string,
	userId: number
): Promise<boolean> {
	try {
		const conversation = await prisma.conversation.findUnique({
			where: {
				id: conversationId
			}
		});

		return conversation !== null && conversation.user_id === userId;
	} catch (error) {
		console.error('Error verifying conversation ownership:', error);
		throw error;
	}
}

/**
 * Retrieve all API requests for a specific conversation, including messages
 */
export async function retrieveApiRequestsByConversationId(
	conversationId: string,
	serialize: boolean = false
): Promise<ApiRequestWithMessage[] | SerializedApiRequest[]> {
	try {
		const apiRequests = await prisma.apiRequest.findMany({
			where: {
				conversation_id: conversationId,
				message: {
					// Ensure that the message relation exists (is not null)
					NOT: {
						id: undefined
					}
				}
			},
			include: {
				message: true // Include the related message entity
			},
			orderBy: {
				request_timestamp: 'asc'
			}
		});
		return serialize ? apiRequests.map(serializeApiRequest) : apiRequests;
	} catch (error) {
		console.error('Error retrieving API requests for conversation:', error);
		throw error;
	}
}

/**
 * Update the last_message timestamp for a conversation
 */
export async function updateConversationLastMessage(conversationId: string): Promise<void> {
	try {
		await prisma.conversation.update({
			where: {
				id: conversationId
			},
			data: {
				last_message: new Date()
			}
		});
	} catch (error) {
		console.error('Error updating conversation last message timestamp:', error);
		throw error;
	}
}

/**
 * Find and delete the oldest conversation for a user
 */
export async function deleteOldestConversation(userId: number): Promise<void> {
	try {
		// Find the oldest conversation based on updated_at
		const oldestConversation = await prisma.conversation.findFirst({
			where: {
				user_id: userId
			},
			orderBy: {
				updated_at: 'asc'
			}
		});

		if (oldestConversation) {
			// Delete the conversation using the existing deleteConversation function
			await deleteConversation(oldestConversation.id);
		}
	} catch (error) {
		console.error('Error deleting oldest conversation:', error);
		throw error;
	}
}

/**
 * Count the number of conversations for a user
 */
export async function countUserConversations(userId: number): Promise<number> {
	try {
		const count = await prisma.conversation.count({
			where: {
				user_id: userId
			}
		});

		return count;
	} catch (error) {
		console.error('Error counting user conversations:', error);
		throw error;
	}
}
