import { In, Repository } from 'typeorm';
import { AppDataSource } from '$lib/db/database';
import { Message } from '$lib/db/entities/Message';
import type { Image } from '$lib/types';

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
