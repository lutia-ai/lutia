import { retrieveUserByEmail } from '$lib/db/crud/user';
import prisma from '$lib/prisma';
import type { ApiModel, ApiProvider, ApiRequest, Message } from '@prisma/client';
import type { ApiRequestWithMessage } from '$lib/types';

export async function createApiRequestEntry(
	userId: number,
	apiProvider: ApiProvider,
	apiModel: ApiModel,
	inputTokens: number,
	inputCost: number,
	outputTokens: number,
	outputCost: number,
	totalCost: number,
	message: Message
): Promise<ApiRequest> {
	try {
		// Create a new ApiRequest entry
		const apiRequest = await prisma.apiRequest.create({
			data: {
				user: {
					connect: { id: userId } // Link the user to the ApiRequest
				},
				api_provider: apiProvider,
				api_model: apiModel,
				input_tokens: inputTokens,
				input_cost: inputCost,
				output_tokens: outputTokens,
				output_cost: outputCost,
				total_cost: totalCost,
				message: {
					connect: { id: message.id } // Link the message to the ApiRequest
				}
			}
		});
        return apiRequest;
	} catch (error) {
		console.error('Error adding API request entry:', error);
		throw error;
	}
}

export async function retrieveApiRequests(userEmail: string): Promise<ApiRequest[]> {
	try {
		// Find the ApiRequests associated with a specific user email
		// Assuming you have a method to retrieve user by email
		const user = await retrieveUserByEmail(userEmail);

		const apiRequests = await prisma.apiRequest.findMany({
			where: {
				user_id: user.id // Filter by user ID
			},
			include: {
				message: true // Load related messages
			}
		});

		return apiRequests;
	} catch (error) {
		console.error('Error retrieving API requests for user:', error);
		throw error;
	}
}

export async function retrieveApiRequestsWithMessage(
	userEmail: string
): Promise<ApiRequestWithMessage[]> {
	try {
		const user = await retrieveUserByEmail(userEmail);

		const apiRequests = await prisma.apiRequest.findMany({
			where: {
				user_id: user.id, // Filter by user ID
				message: {
					// Ensure that the message relation exists (is not null)
					NOT: {
						id: undefined
					}
				}
			},
			include: {
				message: true // Include the related message entity
			}
		});

		return apiRequests;
	} catch (error) {
		console.error('Error retrieving API requests for user:', error);
		throw error;
	}
}

export async function retrieveUserRequestsInDateRange(
	userId: number,
	startDate: Date,
	endDate: Date
): Promise<Partial<ApiRequest>[]> {
	try {
		const apiRequests = await prisma.apiRequest.findMany({
			select: {
				request_timestamp: true,
				api_provider: true,
				api_model: true,
				input_cost: true,
				input_tokens: true,
				output_cost: true,
				output_tokens: true,
				total_cost: true
			},
			where: {
				user_id: userId,
				request_timestamp: {
					gte: startDate,
					lte: endDate
				}
			},
			orderBy: {
				request_timestamp: 'desc'
			}
		});

		return apiRequests;
	} catch (error) {
		console.error('Error retrieving API requests for user:', error);
		throw error;
	}
}
