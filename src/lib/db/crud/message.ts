import type { Image } from '$lib/types';
import prisma from '$lib/prisma';
import type { Message } from '@prisma/client';
import { UserNotFoundError } from '$lib/customErrors';

export async function createMessage(
	prompt: string,
	response: string,
	pictures: Image[],
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
				response,
				pictures,
				referencedMessages: {
					connect: referencedMessages.map((msg) => ({ id: msg.id }))
				}
			}
		});

		console.log('Message saved successfully');
		return message;
	} catch (error) {
		console.error('Error adding Message entry:', error);
		throw error;
	}
}

export async function deleteAllUserMessages(userId: number): Promise<void> {
	try {
		// Find the user and load requests with messages
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				requests: {
					include: {
						message: true // Assuming there is a relationship between Request and Message
					}
				}
			}
		});

		if (!user) {
			throw new UserNotFoundError(userId);
		}

		// Collect all message IDs
		const messageIds = user.requests
			.filter((request) => request.message)
			.map((request) => request.message!.id);

		if (messageIds.length > 0) {
			// Start a transaction
			await prisma.$transaction(async (prismaTransaction) => {
				// Disconnect references from each message
				for (const messageId of messageIds) {
					await prismaTransaction.message.update({
						where: { id: messageId },
						data: {
							referencedMessages: {
								disconnect: {
									id: messageId
								}
							}
						}
					});
				}

				// Set message to null for all ApiRequests
				await prismaTransaction.apiRequest.updateMany({
					where: {
						user_id: userId
					},
					data: {
						message_id: undefined // Assuming `messageId` is the field to be updated
					}
				});

				// Delete all messages
				await prismaTransaction.message.deleteMany({
					where: {
						id: {
							in: messageIds
						}
					}
				});
			});
		}

		console.log(`Deleted all messages for user with ID ${userId}`);
	} catch (error) {
		console.error('Error deleting user messages:', error);
		throw error;
	}
}
