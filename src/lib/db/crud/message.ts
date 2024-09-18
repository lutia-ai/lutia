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
        // First, find all ApiRequests associated with the user's messages
        const apiRequests = await prisma.apiRequest.findMany({
            where: {
                user_id: userId,
            },
            select: {
                id: true,
                message_id: true,
            },
        });

        // Extract message IDs from the ApiRequests
        const messageIds = apiRequests.map(request => request.message_id).filter(id => id !== null) as number[];

        // Begin a transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Update ApiRequests to remove the message reference
            await tx.apiRequest.updateMany({
                where: {
                    user_id: userId,
                    message_id: {
                        not: null,
                    },
                },
                data: {
                    message_id: null,
                },
            });

            // Delete the messages
            await tx.message.deleteMany({
                where: {
                    id: {
                        in: messageIds,
                    },
                },
            });
        });

        console.log(`All messages for user ${userId} have been deleted.`);
    } catch (error) {
        console.error('Error deleting messages:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
