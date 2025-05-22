import { retrieveUserByEmail } from '$lib/db/crud/user';
import type { ApiModel, ApiProvider, ApiRequest, ApiRequestStatus, Message } from '@prisma/client';
import type {
	ApiRequestWithMessage,
	CreateApiRequestData,
	CreateMessageData,
	SerializedApiRequest
} from '$lib/types/types';
import prisma from '$lib/db/prisma';
import { serializeApiRequest } from '$lib/components/chat-history/utils/chatHistory';

export async function createApiRequestEntry(
	userId: number,
	apiProvider: ApiProvider,
	apiModel: ApiModel,
	inputTokens: number,
	inputCost: number,
	outputTokens: number,
	outputCost: number,
	totalCost: number,
	message: Message,
	requestId: String,
	status: ApiRequestStatus,
	conversationId?: number
): Promise<ApiRequest> {
	try {
		// Create the base data object
		const data: any = {
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
			request_id: requestId,
			status: status,
			message: {
				connect: { id: message.id } // Link the message to the ApiRequest
			}
		};

		// Only add the conversation connection if conversationId is provided
		if (conversationId) {
			data.conversation = {
				connect: { id: conversationId }
			};
		}

		// Create a new ApiRequest entry
		const apiRequest = await prisma.apiRequest.create({
			data
		});

		return apiRequest;
	} catch (error) {
		console.error('Error adding API request entry:', error);
		throw error;
	}
}

/**
 * Creates a Message and an associated ApiRequest in a single transaction.
 *
 * @param messageData - Data for creating the Message.
 * @param apiRequestData - Data for creating the ApiRequest.
 * @returns An object containing the created Message and ApiRequest.
 */
export async function createMessageAndApiRequestEntry(
	messageData: CreateMessageData,
	apiRequestData: CreateApiRequestData
): Promise<{ message: Message; apiRequest: ApiRequest }> {
	return await prisma.$transaction(
		async (tx) => {
			// If referenced messages are provided, fetch them so they can be connected.
			let referencedMessages: any[] = [];
			if (messageData.referencedMessageIds && messageData.referencedMessageIds.length > 0) {
				referencedMessages = await tx.message.findMany({
					where: {
						id: { in: messageData.referencedMessageIds }
					}
				});
			}

			// Create the Message record.
			const message = await tx.message.create({
				data: {
					prompt: messageData.prompt,
					response: messageData.response,
					pictures: messageData.pictures,
					files: messageData.files,
					reasoning: messageData.reasoning,
					referencedMessages: {
						// Connect any referenced messages if they exist
						connect: referencedMessages.map((msg) => ({ id: msg.id }))
					}
				}
			});

			// Prepare data for the ApiRequest.
			const data: any = {
				user: {
					connect: { id: apiRequestData.userId }
				},
				api_provider: apiRequestData.apiProvider,
				api_model: apiRequestData.apiModel,
				input_tokens: apiRequestData.inputTokens,
				input_cost: apiRequestData.inputCost,
				output_tokens: apiRequestData.outputTokens,
				output_cost: apiRequestData.outputCost,
				total_cost: apiRequestData.totalCost,
				request_id: apiRequestData.requestId,
				status: apiRequestData.status,
				message: {
					connect: { id: message.id }
				}
			};

			// If a conversationId is provided, connect it.
			if (apiRequestData.conversationId) {
				data.conversation = { connect: { id: apiRequestData.conversationId } };
			}

			// Create the ApiRequest record.
			const apiRequest = await tx.apiRequest.create({
				data
			});

			return { message, apiRequest };
		},
		{ timeout: 10000 }
	); // Increase the timeout to 10 seconds
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
	userId: number,
	serialize: boolean = false
): Promise<ApiRequestWithMessage[] | SerializedApiRequest[]> {
	try {
		const apiRequests = await prisma.apiRequest.findMany({
			where: {
				user_id: userId, // Filter by user ID
				message: {
					// Ensure that the message relation exists (is not null)
					NOT: {
						id: undefined
					}
				},
				conversation_id: null // Only include requests without a conversation ID
			},
			include: {
				message: true // Include the related message entity
			}
		});

		return serialize ? apiRequests.map(serializeApiRequest) : apiRequests;
	} catch (error) {
		console.error('Error retrieving API requests for user:', error);
		throw error;
	}
}

/**
 * Retrieves an API request with its associated message by message ID,
 * including any messages referenced by this message
 * @param messageId The ID of the message associated with the API request
 * @param userId Optional user ID for authorization (only returns the request if it belongs to this user)
 * @param serialize Whether to serialize the response
 * @returns The API request with message and referenced messages or null if not found
 */
export async function retrieveApiRequestByMessageId(
	messageId: number,
	userId?: number,
	serialize: boolean = false
): Promise<ApiRequest | SerializedApiRequest | null> {
	try {
		const whereCondition: any = {
			message_id: messageId
		};

		// If userId is provided, add it to the where condition for authorization
		if (userId !== undefined) {
			whereCondition.user_id = userId;
		}

		const apiRequest = await prisma.apiRequest.findFirst({
			where: whereCondition,
			include: {
				message: {
					include: {
						referencedMessages: {
							select: {
								// All fields except pictures
								id: true,
								prompt: true,
								response: true,
								reasoning: true,
								created_at: true,
								referencedMessages: true,
								referencedBy: true
							}
						},
						referencedBy: {
							select: {
								// All fields except pictures
								id: true,
								prompt: true,
								response: true,
								reasoning: true,
								created_at: true,
								referencedMessages: true,
								referencedBy: true
							}
						}
					}
				}
			}
		});

		if (!apiRequest) {
			return null;
		}

		return serialize ? serializeApiRequest(apiRequest) : apiRequest;
	} catch (error) {
		console.error('Error retrieving API request by message ID:', error);
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

export async function updateApiRequestStatus(
	id: number,
	newStatus: ApiRequestStatus
): Promise<ApiRequest> {
	try {
		const updatedApiRequest = await prisma.apiRequest.update({
			where: { id },
			data: { status: newStatus }
		});
		return updatedApiRequest;
	} catch (error) {
		console.error(`Failed to update ApiRequest with id ${id}:`, error);
		throw error;
	}
}

export async function updateApiRequest(
	id: number,
	updatedData: Partial<Omit<ApiRequest, 'id'>>
): Promise<ApiRequest> {
	try {
		const updatedApiRequest = await prisma.apiRequest.update({
			where: { id },
			data: updatedData
		});
		return updatedApiRequest;
	} catch (error) {
		console.error('Error updating API Request entry:', error);
		throw error;
	}
}
