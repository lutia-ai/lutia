import { AppDataSource } from '../database';
import { Repository } from 'typeorm';
import { ApiModel, ApiProvider, ApiRequest } from '$lib/db/entities/ApiRequest';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import type { Message } from '../entities/Message';

export async function createApiRequestEntry(
	userEmail: string,
	apiProvider: keyof typeof ApiProvider,
	apiModel: keyof typeof ApiModel,
	inputTokens: number,
	inputCost: number,
	outputTokens: number,
	outputCost: number,
	totalCost: number,
	message: Message
): Promise<void> {
	try {
		const apiRequestRepository: Repository<ApiRequest> =
			AppDataSource.getRepository(ApiRequest);

		// Find the user for whom we are creating this request
		const user = await retrieveUserByEmail(userEmail);
		if (!user) {
			throw new Error('User not found');
		}

		// Create a new ApiRequest instance
		const apiRequest = new ApiRequest();
		apiRequest.user = user;
		apiRequest.apiProvider = apiProvider;
		apiRequest.apiModel = apiModel;
		apiRequest.inputTokens = inputTokens;
		apiRequest.inputCost = inputCost;
		apiRequest.outputTokens = outputTokens;
		apiRequest.outputCost = outputCost;
		apiRequest.totalCost = totalCost;
		apiRequest.message = message;

		// Save the new ApiRequest to the database
		await apiRequestRepository.save(apiRequest);
		console.log('ApiRequest saved successfully');
	} catch (error) {
		console.error('Error adding API request entry:', error);
		throw error;
	}
}

export async function retrieveApiRequests(userEmail: string): Promise<ApiRequest[]> {
	try {
		// Get the repository for the ApiRequest entity
		const apiRequestRepository: Repository<ApiRequest> =
			AppDataSource.getRepository(ApiRequest);

		// Find the ApiRequests associated with a specific user email
		// Assuming you have a method to retrieve user by email
		const user = await retrieveUserByEmail(userEmail);
		if (!user) {
			throw new Error('User not found');
		}

		const apiRequests = await apiRequestRepository.find({
			where: { user: { id: user.id } },
			relations: ['message'] // Load related entities if needed
		});

		return apiRequests;
	} catch (error) {
		console.error('Error retrieving API requests for user:', error);
		throw error;
	}
}
