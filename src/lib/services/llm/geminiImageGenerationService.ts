import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { ApiProvider, ApiRequestStatus, PaymentTier, type User } from '@prisma/client';
import type { Model } from '$lib/types/types';
import { createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import { updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { createConversation, updateConversationLastMessage } from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';

/**
 * Handle image generation for Gemini models
 */
export async function handleGeminiImageGeneration(
	requestBody: any,
	user: User,
	model: Model,
	requestId: string
) {
	let messageConversationId = requestBody.conversationId;
	let errorMessage: any;

	// Parse plainText from the request
	const plainText: string = JSON.parse(requestBody.plainTextPrompt);

	// Initialize Google Gen AI client
	const genAI = new GoogleGenAI({
		apiKey: env.VITE_GOOGLE_GEMINI_API_KEY
	});

	try {
		// Generate image using Gemini 3 Pro Image
		const response = await genAI.models.generateContent({
			model: model.param,
			contents: plainText
		});

		// Extract base64 image data from response
		if (
			!response.candidates ||
			response.candidates.length === 0 ||
			!response.candidates[0].content ||
			!response.candidates[0].content.parts
		) {
			throw new Error('No candidates returned from Gemini API');
		}

		let base64Data: string | undefined;
		for (const part of response.candidates[0].content.parts) {
			if (part.inlineData) {
				base64Data = part.inlineData.data;
				break;
			}
		}

		if (!base64Data) {
			throw new Error('No image data returned from Gemini API');
		}

		// Cost for 2K resolution image: $0.134 per image
		const imageCost = 0.134;

		if (user.payment_tier === PaymentTier.Premium && !messageConversationId) {
			try {
				// Generate a title for the new conversation
				const title = await generateConversationTitle(plainText);
				const conversation = await createConversation(user.id, title);
				messageConversationId = conversation.id;
			} catch (titleError) {
				console.error('Error generating conversation title:', titleError);
				// Continue even if title generation fails
			}
		}

		if (user.payment_tier === PaymentTier.PayAsYouGo) {
			await updateUserBalanceWithDeduction(user.id, imageCost);
		}

		const { message, apiRequest } = await createMessageAndApiRequestEntry(
			{
				prompt: plainText,
				orderedContent: [
					{
						type: 'text',
						content: '[AI generated image]',
						order: 0
					}
				],
				pictures: [
					{
						type: 'image',
						data: 'data:image/png;base64,' + base64Data,
						media_type: 'image/png',
						width: 2048,
						height: 2048,
						ai: true
					}
				],
				referencedMessageIds: [],
				files: []
			},
			{
				userId: user.id,
				apiProvider: ApiProvider.google,
				apiModel: model.name,
				inputTokens: 0,
				inputCost: 0,
				outputTokens: 0,
				outputCost: imageCost,
				totalCost: imageCost,
				requestId: requestId,
				status: ApiRequestStatus.COMPLETED,
				conversationId: messageConversationId,
				error: errorMessage
			}
		);

		// Update the conversation's last_message timestamp
		if (messageConversationId) {
			await updateConversationLastMessage(messageConversationId);
		}

		// Include the base64 data in the response to the frontend
		return new Response(JSON.stringify({ image: base64Data, outputPrice: imageCost }), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Request-Id': requestId
			}
		});
	} catch (error) {
		console.error('[Gemini Image Generation] Error:', error);
		errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

		// Create a failed API request entry
		await createMessageAndApiRequestEntry(
			{
				prompt: plainText,
				orderedContent: [
					{
						type: 'text',
						content: '[Image generation failed]',
						order: 0
					}
				],
				pictures: [],
				referencedMessageIds: [],
				files: []
			},
			{
				userId: user.id,
				apiProvider: ApiProvider.google,
				apiModel: model.name,
				inputTokens: 0,
				inputCost: 0,
				outputTokens: 0,
				outputCost: 0,
				totalCost: 0,
				requestId: requestId,
				status: ApiRequestStatus.FAILED,
				conversationId: messageConversationId,
				error: errorMessage
			}
		);

		throw error;
	}
}
