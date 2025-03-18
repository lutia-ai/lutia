import type { GptTokenUsage, Image, Model } from '$lib/types.d';
import { countTokens } from '$lib/tokenizer';
import { createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import { updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { ApiProvider, ApiRequestStatus, PaymentTier, type User } from '@prisma/client';
import { updateConversation, updateConversationLastMessage } from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';
import { estimateTokenCount } from './tokenCounter';

export interface FinalizationParams {
	user: User;
	model: Model;
	plainText: string;
	images: Image[];
	chunks: string[];
	thinkingChunks: string[];
	finalUsage: GptTokenUsage;
	wasAborted: boolean;
	error: any;
	requestId: string;
	messageConversationId: string | undefined;
	originalConversationId: string | null;
	apiProvider: ApiProvider;
}

export async function finalizeResponse({
	user,
	model,
	plainText,
	images,
	chunks,
	thinkingChunks,
	finalUsage,
	wasAborted = false,
	error = null,
	requestId,
	messageConversationId,
	originalConversationId,
	apiProvider
}: FinalizationParams) {
	try {
		const thinkingResponse = thinkingChunks.join('');
		const response = chunks.join('');

		// Calculate tokens and costs
		const inputTokens = finalUsage.prompt_tokens;
		let outputTokens = finalUsage.completion_tokens;

		if (!outputTokens) {
			// const outputGPTCount = await countTokens(response + thinkingResponse, model, 'output');
			// outputTokens = outputGPTCount.tokens;
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
				reasoning: thinkingResponse,
				referencedMessageIds: []
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
			if (user.payment_tier === PaymentTier.Premium && !originalConversationId) {
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
