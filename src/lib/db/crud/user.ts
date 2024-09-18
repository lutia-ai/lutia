import bcryptjs from 'bcryptjs';
import { DatabaseError, UnknownError, UserNotFoundError } from '$lib/customErrors';
import type { UserUpdateFields } from '$lib/types';
import stripe from '$lib/stripe/stripe.config';
import prisma from '$lib/prisma';
import type { User } from '@prisma/client';

export async function createUser(
	email: string,
	name: string,
	password?: string,
	oauth?: string,
	oauth_link_token?: string,
	stripe_id?: string
): Promise<User> {
	email = handleGmail(email);

	let password_hash = password;
	if (!oauth && password) {
		const saltRounds = 10;
		password_hash = await bcryptjs.hash(password, saltRounds);
	}

	try {
		const customer = await stripe.customers.create({
			name: name,
			email: email
		});

		stripe_id = customer.id;
	} catch (error) {
		console.error('Error creating stripe customer: ', error);
		throw error;
	}

	const newUser = await prisma.user.create({
		data: {
			email,
			name,
			password_hash: password_hash || null,
			oauth: oauth || null,
			oauth_link_token: oauth_link_token || null,
			stripe_id: stripe_id || null,
			balance: {
				create: {
					amount: 1
				}
			}
		}
	});

	return newUser;
}

export async function retrieveUserByEmail(email: string): Promise<User> {
	try {
		email = handleGmail(email);
		const user = await prisma.user.findUnique({ where: { email } });
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
	try {
		// Update the user directly using Prisma's update method
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: updateFields
		});

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
