import type { GptTokenUsage, Image, Model, FileAttachment, OrderedContent } from '$lib/types/types';
import { createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import { updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { ApiProvider, ApiRequestStatus, PaymentTier, type User } from '@prisma/client';
import { updateConversation, updateConversationLastMessage } from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';
import { estimateTokenCount } from '../models/cost-calculators/tokenCounter';
import prisma from '$lib/db/prisma';

export interface FinalizationParams {
	user: User;
	model: Model;
	plainText: string;
	images: Image[];
	files: FileAttachment[];
	chunks: string[];
	thinkingChunks: string[];
	webSearchResults: any[];
	orderedContent?: OrderedContent;
	finalUsage: GptTokenUsage;
	wasAborted: boolean;
	error: any;
	requestId: string;
	messageConversationId: string | undefined;
	originalConversationId: string | null;
	apiProvider: ApiProvider;
	referencedMessageIds: number[];
}

/**
 * Finalizes the LLM response by saving to database using only ordered_content
 * @param params Finalization parameters
 * @returns Object containing the created message and API request
 */
export async function finalizeResponse({
	user,
	model,
	plainText,
	images,
	files,
	chunks,
	thinkingChunks,
	webSearchResults,
	orderedContent,
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
		// Calculate tokens and costs, ensuring we have valid numbers
		const inputTokens = finalUsage.prompt_tokens || 0;
		const responseText = chunks.join('');
		const thinkingText = thinkingChunks.join('');
		let outputTokens = finalUsage.completion_tokens || 0;

		if (!outputTokens) {
			outputTokens = estimateTokenCount(responseText + thinkingText);
		}

		// Ensure we have valid numeric values for calculations
		const safeInputTokens = isNaN(inputTokens) ? 0 : inputTokens;
		const safeOutputTokens = isNaN(outputTokens) ? 0 : outputTokens;

		// Calculate costs with safe values
		const inputCost = (safeInputTokens * model.input_price) / 1000000;
		const outputCost = (safeOutputTokens * model.output_price) / 1000000;
		const totalCost = inputCost + outputCost;

		// Ensure the cost is a valid number before updating balance
		const safeTotalCost = isNaN(totalCost) ? 0 : totalCost;

		// Apply charges only if there's a valid cost amount
		if (user.payment_tier === PaymentTier.PayAsYouGo && safeTotalCost > 0) {
			await updateUserBalanceWithDeduction(user.id, safeTotalCost);
		}

		// Determine status
		const status = wasAborted
			? ApiRequestStatus.ABORTED
			: error
				? ApiRequestStatus.FAILED
				: ApiRequestStatus.COMPLETED;

		// Create database records using only ordered_content
		const { message, apiRequest } = await createMessageAndApiRequestEntry(
			{
				prompt: plainText,
				pictures: images,
				files: files,
				orderedContent: orderedContent,
				referencedMessageIds: referencedMessageIds
			},
			{
				userId: user.id,
				apiProvider: apiProvider,
				apiModel: model.name,
				inputTokens: safeInputTokens,
				inputCost: inputCost,
				outputTokens: safeOutputTokens,
				outputCost: outputCost,
				totalCost: safeTotalCost,
				requestId: requestId,
				status: status,
				conversationId: messageConversationId,
				error: error
			}
		);

		// Only update conversation if we got a response
		if (responseText.length > 0 && messageConversationId) {
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
	webSearchResults: any[];
	orderedContent?: OrderedContent;
	finalUsage: GptTokenUsage;
	wasAborted: boolean;
	error: any;
	files?: FileAttachment[];
}

/**
 * Updates an existing message and request with new response data using only ordered_content
 * @param params Regeneration parameters
 * @returns Object containing the updated message and API request
 */
export async function updateExistingMessageAndRequest({
	messageId,
	user,
	model,
	chunks,
	thinkingChunks,
	webSearchResults,
	orderedContent,
	finalUsage,
	wasAborted = false,
	error = null,
	files
}: RegenerationParams) {
	try {
		// Calculate tokens and costs for the new response with safe values
		const inputTokens = finalUsage.prompt_tokens || 0;
		const responseText = chunks.join('');
		const thinkingText = thinkingChunks.join('');
		let outputTokens = finalUsage.completion_tokens || 0;

		if (!outputTokens) {
			outputTokens = estimateTokenCount(responseText + thinkingText);
		}

		// Ensure we have valid numeric values for calculations
		const safeInputTokens = isNaN(inputTokens) ? 0 : inputTokens;
		const safeOutputTokens = isNaN(outputTokens) ? 0 : outputTokens;

		// Calculate costs with safe values
		const inputCost = (safeInputTokens * model.input_price) / 1000000;
		const outputCost = (safeOutputTokens * model.output_price) / 1000000;
		const totalCost = inputCost + outputCost;

		// Ensure the cost is a valid number before updating balance
		const safeTotalCost = isNaN(totalCost) ? 0 : totalCost;

		// Apply charges for the new generation only if there's a valid cost amount
		if (user.payment_tier === PaymentTier.PayAsYouGo && safeTotalCost > 0) {
			await updateUserBalanceWithDeduction(user.id, safeTotalCost);
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

		// Update the message with only the ordered_content and files
		const updatedMessage = await prisma.message.update({
			where: { id: Number(messageId) },
			data: {
				// Add files if they exist
				...(files ? { files: files } : {}),
				// Update with the new ordered content
				...(orderedContent ? { ordered_content: orderedContent } : {})
				// Note: not updating the prompt field as it remains the same
			}
		});

		// Update the API request with cumulative cost information
		const updatedApiRequest = await prisma.apiRequest.update({
			where: { id: apiRequest.id },
			data: {
				// Use increment operation for numeric fields
				input_tokens: {
					increment: safeInputTokens
				},
				output_tokens: {
					increment: safeOutputTokens
				},
				input_cost: {
					increment: inputCost
				},
				output_cost: {
					increment: outputCost
				},
				total_cost: {
					increment: safeTotalCost
				},

				// Regular updates for non-numeric fields
				status: status,
				regeneration_count: {
					increment: 1
				},
				lastRegeneratedAt: new Date()
			}
		});

		return { message: updatedMessage, apiRequest: updatedApiRequest };
	} catch (err) {
		console.error('Error in updateExistingMessageAndRequest:', err);
		throw err;
	}
}
