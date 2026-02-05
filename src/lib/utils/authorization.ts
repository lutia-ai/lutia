import prisma from '$lib/db/prisma';
import { AuthorizationError, ResourceNotFoundError } from '$lib/types/customErrors';

/**
 * Logs an authorization failure for security monitoring
 * @param userId - The ID of the user who attempted the action
 * @param resource - The type of resource (e.g. 'conversation', 'message')
 * @param resourceId - The ID of the resource the user attempted to access
 * @param ownerId - The actual owner of the resource (if known)
 */
function logAuthorizationFailure(
	userId: number,
	resource: string,
	resourceId: string | number,
	ownerId?: number
): void {
	console.warn(
		`[SECURITY] Authorization failure: User ${userId} attempted to access ${resource} ${resourceId}` +
			(ownerId !== undefined ? ` (owned by user ${ownerId})` : '')
	);
}

/**
 * Verifies that a conversation exists and belongs to the specified user
 * @param conversationId - The ID of the conversation to verify
 * @param userId - The ID of the user who should own the conversation
 * @returns The conversation record if ownership is verified
 * @throws {ResourceNotFoundError} If the conversation does not exist
 * @throws {AuthorizationError} If the user does not own the conversation
 */
export async function requireConversationOwnership(
	conversationId: string,
	userId: number
): Promise<{ id: string; user_id: number }> {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: { id: true, user_id: true }
	});

	if (!conversation) {
		logAuthorizationFailure(userId, 'conversation', conversationId);
		throw new ResourceNotFoundError('Conversation');
	}

	if (conversation.user_id !== userId) {
		logAuthorizationFailure(userId, 'conversation', conversationId, conversation.user_id);
		throw new AuthorizationError('You do not have permission to access this conversation');
	}

	return conversation;
}

/**
 * Verifies that a message exists and belongs to the specified user
 * (via its associated API request)
 * @param messageId - The ID of the message to verify
 * @param userId - The ID of the user who should own the message
 * @returns The API request record associated with the message
 * @throws {ResourceNotFoundError} If the message or its API request does not exist
 * @throws {AuthorizationError} If the user does not own the message
 */
export async function requireMessageOwnership(
	messageId: number,
	userId: number
): Promise<{ id: number; user_id: number; message_id: number | null }> {
	const apiRequest = await prisma.apiRequest.findFirst({
		where: { message_id: messageId },
		select: { id: true, user_id: true, message_id: true }
	});

	if (!apiRequest) {
		logAuthorizationFailure(userId, 'message', messageId);
		throw new ResourceNotFoundError('Message');
	}

	if (apiRequest.user_id !== userId) {
		logAuthorizationFailure(userId, 'message', messageId, apiRequest.user_id);
		throw new AuthorizationError('You do not have permission to access this message');
	}

	return apiRequest;
}

/**
 * Verifies that multiple messages exist and all belong to the specified user
 * (via their associated API requests). Uses a single batch query for performance.
 * @param messageIds - Array of message IDs to verify
 * @param userId - The ID of the user who should own all messages
 * @throws {AuthorizationError} If the user does not own one or more messages
 */
export async function requireMessagesOwnership(
	messageIds: number[],
	userId: number
): Promise<void> {
	if (messageIds.length === 0) return;

	const apiRequests = await prisma.apiRequest.findMany({
		where: {
			message_id: { in: messageIds }
		},
		select: { message_id: true, user_id: true }
	});

	// Build a map of messageId -> userId for quick lookup
	const ownershipMap = new Map<number, number>();
	for (const req of apiRequests) {
		if (req.message_id !== null) {
			ownershipMap.set(req.message_id, req.user_id);
		}
	}

	// Check each requested message ID
	for (const messageId of messageIds) {
		const ownerId = ownershipMap.get(messageId);

		if (ownerId === undefined) {
			// Message not found in any API request — could be orphaned or non-existent
			logAuthorizationFailure(userId, 'message', messageId);
			throw new AuthorizationError(
				'You do not have permission to access referenced messages'
			);
		}

		if (ownerId !== userId) {
			logAuthorizationFailure(userId, 'message', messageId, ownerId);
			throw new AuthorizationError(
				'You do not have permission to access referenced messages'
			);
		}
	}
}

/**
 * Verifies that a folder exists and belongs to the specified user
 * @param folderId - The ID of the folder to verify
 * @param userId - The ID of the user who should own the folder
 * @returns The folder record if ownership is verified
 * @throws {ResourceNotFoundError} If the folder does not exist
 * @throws {AuthorizationError} If the user does not own the folder
 */
export async function requireFolderOwnership(
	folderId: number,
	userId: number
): Promise<{ id: number; user_id: number }> {
	const folder = await prisma.folder.findUnique({
		where: { id: folderId },
		select: { id: true, user_id: true }
	});

	if (!folder) {
		logAuthorizationFailure(userId, 'folder', folderId);
		throw new ResourceNotFoundError('Folder');
	}

	if (folder.user_id !== userId) {
		logAuthorizationFailure(userId, 'folder', folderId, folder.user_id);
		throw new AuthorizationError('You do not have permission to access this folder');
	}

	return folder;
}

/**
 * Verifies that an API request exists and belongs to the specified user
 * @param requestId - The ID of the API request to verify
 * @param userId - The ID of the user who should own the request
 * @returns The API request record if ownership is verified
 * @throws {ResourceNotFoundError} If the API request does not exist
 * @throws {AuthorizationError} If the user does not own the request
 */
export async function requireApiRequestOwnership(
	requestId: number,
	userId: number
): Promise<{ id: number; user_id: number }> {
	const apiRequest = await prisma.apiRequest.findUnique({
		where: { id: requestId },
		select: { id: true, user_id: true }
	});

	if (!apiRequest) {
		logAuthorizationFailure(userId, 'apiRequest', requestId);
		throw new ResourceNotFoundError('API request');
	}

	if (apiRequest.user_id !== userId) {
		logAuthorizationFailure(userId, 'apiRequest', requestId, apiRequest.user_id);
		throw new AuthorizationError('You do not have permission to access this API request');
	}

	return apiRequest;
}
