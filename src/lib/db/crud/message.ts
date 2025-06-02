import type { Image } from '$lib/types/types';
import type { Message } from '@prisma/client';
import prisma from '$lib/db/prisma';

/**
 * Creates a new message with ordered content
 * @param prompt User's prompt/question
 * @param pictures Array of images attached to the message
 * @param orderedContent Ordered content array containing all response data
 * @param referencedMessageIds Optional array of message IDs this message references
 * @returns Promise with the created Message
 */
export async function createMessage(
	prompt: string,
	pictures: Image[],
	orderedContent?: any,
	referencedMessageIds?: number[]
): Promise<Message> {
	try {
		let referencedMessages: Message[] = [];
		if (referencedMessageIds && referencedMessageIds.length > 0) {
			referencedMessages = await prisma.message.findMany({
				where: {
					id: {
						in: referencedMessageIds
					}
				}
			});
		}

		const message = await prisma.message.create({
			data: {
				prompt,
				pictures,
				ordered_content: orderedContent,
				referencedMessages: {
					connect: referencedMessages.map((msg) => ({ id: msg.id }))
				}
			}
		});

		return message;
	} catch (error) {
		console.error('Error adding Message entry:', error);
		throw error;
	}
}

export async function deleteAllUserMessagesWithoutAConversation(userId: number): Promise<void> {
	try {
		// Find all ApiRequests associated with the user's messages that don't have a conversation_id
		const apiRequests = await prisma.apiRequest.findMany({
			where: {
				user_id: userId,
				conversation_id: null // Only select requests without a conversation ID
			},
			select: {
				id: true,
				message_id: true
			}
		});

		// Extract message IDs from the ApiRequests
		const messageIds = apiRequests
			.map((request) => request.message_id)
			.filter((id) => id !== null) as number[];

		// Begin a transaction to ensure data consistency
		await prisma.$transaction(async (tx) => {
			// Update ApiRequests to remove the message reference
			await tx.apiRequest.updateMany({
				where: {
					user_id: userId,
					message_id: {
						not: null
					},
					conversation_id: null // Only update requests without a conversation ID
				},
				data: {
					message_id: null
				}
			});

			// Delete the messages
			await tx.message.deleteMany({
				where: {
					id: {
						in: messageIds
					}
				}
			});
		});
	} catch (error) {
		console.error('Error deleting messages:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

/**
 * Updates a message with the given ID
 * @param id - The ID of the message to update
 * @param updatedData - Partial data to update the message with
 * @returns The updated message
 */
export async function updateMessage(
	id: number,
	updatedData: Partial<Omit<Message, 'id' | 'pictures' | 'files' | 'ordered_content'>> & {
		pictures?: Image[];
		files?: any;
		ordered_content?: any;
	}
): Promise<Message> {
	try {
		// Create a new object with processed data for Prisma
		const processedData: any = { ...updatedData };

		// Handle JSON fields explicitly
		if (updatedData.pictures !== undefined) {
			processedData.pictures = updatedData.pictures;
		}

		if (updatedData.files !== undefined) {
			processedData.files = updatedData.files;
		}

		if (updatedData.ordered_content !== undefined) {
			processedData.ordered_content = updatedData.ordered_content;
		}

		const updatedMessage = await prisma.message.update({
			where: { id },
			data: processedData
		});
		return updatedMessage;
	} catch (error) {
		console.error('Error updating Message entry:', error);
		throw error;
	}
}
