import bcrypt from 'bcrypt';
import { AppDataSource } from '../database';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { DatabaseError, UnknownError, UserNotFoundError } from '$lib/customErrors';
import type { UserUpdateFields } from '$lib/types';

export async function createUser(userData: Partial<User>): Promise<User> {
	const userRepository: Repository<User> = AppDataSource.getRepository(User);
	const newUser = new User();

	if (!userData.email) {
		throw new Error('Email is required to create a user');
	}

	userData.email = handleGmail(userData.email);

	if (!userData.oauth && userData.password_hash) {
		const saltRounds = 10;
		userData.password_hash = await bcrypt.hash(userData.password_hash, saltRounds);
	}

	Object.assign(newUser, userData);
	return await userRepository.save(newUser);
}

export async function retrieveUserByEmail(email: string): Promise<User> {
	const userRepository: Repository<User> = AppDataSource.getRepository(User);

	try {
		if (!email) {
			throw new Error('Email is required');
		}

		email = handleGmail(email);
		const user = await userRepository.findOne({ where: { email } });

		if (!user) {
			throw new UserNotFoundError(email);
		}

		return user;
	} catch (error: unknown) {
		if (error instanceof UserNotFoundError) {
			// Rethrow UserNotFoundError to be handled by the caller
			throw error;
		} else if (error instanceof Error) {
			console.error(`Error retrieving user by email: ${error.message}`);
			throw new DatabaseError('Failed to retrieve user', error);
		} else {
			console.error('An unknown error occurred while retrieving user by email');
			throw new UnknownError('An unknown error occurred');
		}
	}
}

export async function updateUser(userId: number, updateFields: UserUpdateFields): Promise<User> {
	const userRepository = AppDataSource.getRepository(User);

	try {
		// First, check if the user exists
		const user = await userRepository.findOne({ where: { id: userId } });
		if (!user) {
			throw new Error(`User with ID ${userId} not found`);
		}

		// Update only the provided fields
		Object.assign(user, updateFields);

		// Save the updated user
		const updatedUser = await userRepository.save(user);

		return updatedUser;
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error updating user: ${error.message}`);
			throw new Error(`Failed to update user: ${error.message}`);
		} else {
			console.error('An unknown error occurred while updating user');
			throw new Error('An unknown error occurred while updating user');
		}
	}
}

function handleGmail(email: string): string {
	// Split the email to get the part after '@' and before the '.'
	const emailParts = email?.split('@');
	const domainParts = emailParts[1]?.split('.');

	if (domainParts[0] === 'googlemail') {
		// Reconstruct the email with 'gmail' instead of 'googlemail'
		email = `${emailParts[0]}@gmail.${domainParts.slice(1).join('.')}`;
	}

	return email;
}
