import { In, IsNull, Not, Repository } from 'typeorm';
import { AppDataSource } from '$lib/db/database';
import { Message } from '$lib/db/entities/Message';
import type { Image } from '$lib/types';
import { ApiRequest } from '$lib/db/entities/ApiRequest';
import { User } from '$lib/db/entities/User';

export async function createMessage(
	prompt: string,
	response: string,
	pictures: Image[],
	referencedMessageIds?: number[]
): Promise<Message> {
	try {
		const messageRepository: Repository<Message> = AppDataSource.getRepository(Message);

		let referencedMessages: Message[] = [];
		if (referencedMessageIds) {
			referencedMessages = await messageRepository.findBy({ id: In(referencedMessageIds) });
		}

		const message = new Message();
		message.prompt = prompt;
		message.response = response;
		message.pictures = pictures;
		message.referencedMessages = referencedMessages;

		await messageRepository.save(message);
		console.log('Message saved successfully');
		return message;
	} catch (error) {
		console.error('Error adding Message entry:', error);
		throw error;
	}
}

export async function deleteAllUserMessages(userId: number): Promise<void> {
	try {
		const messageRepository = AppDataSource.getRepository(Message);
		const apiRequestRepository = AppDataSource.getRepository(ApiRequest);
		const userRepository = AppDataSource.getRepository(User);

		// Find the user and load requests with messages
		const user = await userRepository.findOne({
			where: { id: userId },
			relations: ['requests', 'requests.message']
		});

		if (!user) {
			console.log(`User with ID ${userId} not found`);
			return;
		}

		// Collect all message IDs
		const messageIds = user.requests
			.filter((request) => request.message)
			.map((request) => request.message!.id);

		if (messageIds.length > 0) {
			// Start a transaction
			await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
				// Remove references in the message_references table
				await transactionalEntityManager
					.createQueryBuilder()
					.relation(Message, 'referencedMessages')
					.of(messageIds)
					.remove(messageIds);

				// Set message to null for all ApiRequests
				await transactionalEntityManager
					.createQueryBuilder()
					.update(ApiRequest)
					.set({ message: null })
					.where('user_id = :userId', { userId })
					.execute();

				// Delete all messages
				await transactionalEntityManager
					.createQueryBuilder()
					.delete()
					.from(Message)
					.where('id IN (:...ids)', { ids: messageIds })
					.execute();
			});
		}

		console.log(`Deleted all messages for user with ID ${userId}`);
	} catch (error) {
		console.error('Error deleting user messages:', error);
		throw error;
	}
}
