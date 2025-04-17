import type { GptTokenUsage, Image, Model, FileAttachment } from '$lib/types.d';
import { createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import { updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { ApiProvider, ApiRequestStatus, PaymentTier, type User } from '@prisma/client';
import { updateConversation, updateConversationLastMessage } from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';
import { estimateTokenCount } from './tokenCounter';
import prisma from '$lib/prisma';

export interface FinalizationParams {
	user: User;
	model: Model;
	plainText: string;
	images: Image[];
	files: FileAttachment[];
	chunks: string[];
	thinkingChunks: string[];
	finalUsage: GptTokenUsage;
	wasAborted: boolean;
	error: any;
	requestId: string;
	messageConversationId: string | undefined;
	originalConversationId: string | null;
	apiProvider: ApiProvider;
	referencedMessageIds: number[];
}

export async function finalizeResponse({
	user,
	model,
	plainText,
	images,
	files,
	chunks,
	thinkingChunks,
	finalUsage,
	wasAborted = false,
	error = null,
	requestId,
	messageConversationId,
	originalConversationId,
	apiProvider,
	referencedMessageIds
}: FinalizationParams) {
	try {
		const thinkingResponse = thinkingChunks.join('');
		const response = chunks.join('');

		// Calculate tokens and costs
		const inputTokens = finalUsage.prompt_tokens;
		let outputTokens = finalUsage.completion_tokens;

		if (!outputTokens) {
			outputTokens = estimateTokenCount(response + thinkingResponse);
		}

		const inputCost = (inputTokens * model.input_price) / 1000000;
		const outputCost = (outputTokens * model.output_price) / 1000000;
		const totalCost = inputCost + outputCost;

		// Apply charges
		if (user.payment_tier === PaymentTier.PayAsYouGo) {
			await updateUserBalanceWithDeduction(user.id, totalCost);
		}

		// Determine status
		const status = wasAborted
			? ApiRequestStatus.ABORTED
			: error
				? ApiRequestStatus.FAILED
				: ApiRequestStatus.COMPLETED;

		// Create database records
		const { message, apiRequest } = await createMessageAndApiRequestEntry(
			{
				prompt: plainText,
				response: response,
				pictures: images,
				files: files,
				reasoning: thinkingResponse,
				referencedMessageIds: referencedMessageIds
			},
			{
				userId: user.id,
				apiProvider: apiProvider,
				apiModel: model.name,
				inputTokens: inputTokens,
				inputCost: inputCost,
				outputTokens: outputTokens,
				outputCost: outputCost,
				totalCost: totalCost,
				requestId: requestId,
				status: status,
				conversationId: messageConversationId,
				error: error
			}
		);

		// Only update conversation if we got a response
		if (response.length > 0 && messageConversationId) {
			await updateConversationLastMessage(messageConversationId);

			// Generate title for new conversations
			if (!originalConversationId) {
				try {
					const title = await generateConversationTitle(plainText);
					await updateConversation(messageConversationId, { title });
				} catch (titleError) {
					console.error('Error generating conversation title:', titleError);
				}
			}
		}

		console.log('API Request created:', apiRequest);
		return { message, apiRequest };
	} catch (err) {
		console.error('Error in finalizeResponse:', err);
		throw err;
	}
}

export interface RegenerationParams {
	messageId: string;
	user: User;
	model: Model;
	chunks: string[];
	thinkingChunks: string[];
	finalUsage: GptTokenUsage;
	wasAborted: boolean;
	error: any;
	files?: FileAttachment[];
}

export async function updateExistingMessageAndRequest({
	messageId,
	user,
	model,
	chunks,
	thinkingChunks,
	finalUsage,
	wasAborted = false,
	error = null,
	files
}: RegenerationParams) {
	try {
		// Combine the chunks into response text
		const thinkingResponse = thinkingChunks.join('');
		const response = chunks.join('');

		// Calculate tokens and costs for the new response
		const inputTokens = finalUsage.prompt_tokens;
		let outputTokens = finalUsage.completion_tokens;

		if (!outputTokens) {
			outputTokens = estimateTokenCount(response + thinkingResponse);
		}

		const inputCost = (inputTokens * model.input_price) / 1000000;
		const outputCost = (outputTokens * model.output_price) / 1000000;
		const totalCost = inputCost + outputCost;

		// Apply charges for the new generation
		if (user.payment_tier === PaymentTier.PayAsYouGo) {
			await updateUserBalanceWithDeduction(user.id, totalCost);
		}

		// Determine status
		const status = wasAborted
			? ApiRequestStatus.ABORTED
			: error
				? ApiRequestStatus.FAILED
				: ApiRequestStatus.COMPLETED;

		// Retrieve the existing message
		const message = await prisma.message.findUnique({
			where: { id: Number(messageId) }
		});

		if (!message) {
			throw new Error(`Message with ID ${messageId} not found`);
		}

		// Find the associated API request
		const apiRequest = await prisma.apiRequest.findFirst({
			where: { message_id: Number(messageId) }
		});

		if (!apiRequest) {
			throw new Error(`API request for message ID ${messageId} not found`);
		}

		// Update the message with the new response but keep the original prompt
		const updatedMessage = await prisma.message.update({
			where: { id: Number(messageId) },
			data: {
				response: response,
				reasoning: thinkingResponse,
				// Add files if they exist
				...(files ? { files: files } : {})
				// Note: not updating the prompt field as it remains the same
			}
		});

		// Update the API request with cumulative cost information
		const updatedApiRequest = await prisma.apiRequest.update({
			where: { id: apiRequest.id },
			data: {
				// Use increment operation for numeric fields
				input_tokens: {
					increment: inputTokens
				},
				output_tokens: {
					increment: outputTokens
				},
				input_cost: {
					increment: inputCost
				},
				output_cost: {
					increment: outputCost
				},
				total_cost: {
					increment: totalCost
				},

				// Regular updates for non-numeric fields
				status: status,
				regeneration_count: {
					increment: 1
				},
				lastRegeneratedAt: new Date()
			}
		});

		console.log('Message and API Request updated for regeneration:', updatedApiRequest);
		return { message: updatedMessage, apiRequest: updatedApiRequest };
	} catch (err) {
		console.error('Error in updateExistingMessageAndRequest:', err);
		throw err;
	}
}
