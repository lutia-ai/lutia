import { InsufficientBalanceError, UserNotFoundError } from '$lib/types/customErrors';
import type { PrismaClient } from '@prisma/client';
import prisma from '$lib/db/prisma';

export async function retrieveUsersBalance(userId: number): Promise<number> {
	try {
		const balance = await prisma.balance.findUnique({
			where: { user_id: userId }
		});

		if (!balance) {
			throw new Error('Balance not found for user');
		}

		return balance.amount;
	} catch (error) {
		console.error('Error retrieving user balance:', error);
		throw error;
	}
}

export async function updateUserBalance(userId: number, newBalance: number): Promise<number> {
	try {
		const updatedBalance = await prisma.balance.update({
			where: { user_id: userId },
			data: { amount: newBalance }
		});

		if (!updatedBalance) {
			throw new UserNotFoundError(userId);
		}

		return updatedBalance.amount;
	} catch (error) {
		if (error instanceof UserNotFoundError) {
			throw error;
		} else {
			console.error('Error updating user balance:', error);
			throw new Error('An unknown error occurred');
		}
	}
}

export async function updateUserBalanceWithDeduction(
	userId: number,
	deductionAmount: number
): Promise<number> {
	try {
		if (isNaN(deductionAmount) || deductionAmount <= 0) {
			throw new Error(`Invalid deduction amount: ${deductionAmount}`);
		}
		const updatedBalanceRecord = await prisma.balance.update({
			where: { user_id: userId },
			data: {
				amount: {
					decrement: deductionAmount
				}
			}
		});

		return updatedBalanceRecord.amount;
	} catch (error) {
		if (error instanceof UserNotFoundError) {
			throw error;
		} else {
			console.error('Error deducting from user balance:', error);
			throw new Error('An unknown error occurred');
		}
	}
}

export async function deductAndCheckBalance(userId: number, amount: number) {
	// Use a database transaction to lock the balance
	return await prisma.$transaction(async (tx) => {
		const balanceRecord = await prisma.balance.findUnique({
			where: { user_id: userId }
		});

		if (!balanceRecord) {
			throw new UserNotFoundError(userId);
		}

		if (balanceRecord.amount - amount < 0.1) {
			throw new InsufficientBalanceError();
		}

		// Update balance BEFORE processing the request
		return await tx.balance.update({
			where: { user_id: userId },
			data: { amount: { decrement: amount } }
		});
	});
}

export async function updateUserBalanceWithIncrement(
	userId: number,
	incrementAmount: number
): Promise<number> {
	try {
		const updatedBalanceRecord = await prisma.balance.update({
			where: { user_id: userId },
			data: {
				amount: {
					increment: incrementAmount
				}
			}
		});

		return updatedBalanceRecord.amount;
	} catch (error) {
		if (error instanceof UserNotFoundError) {
			throw error;
		} else {
			console.error('Error deducting from user balance:', error);
			throw new Error('An unknown error occurred');
		}
	}
}
