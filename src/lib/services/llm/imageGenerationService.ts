import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import { ApiProvider, ApiRequestStatus, PaymentTier, type User } from '@prisma/client';
import type { Model } from '$lib/types/types';
import { createMessageAndApiRequestEntry } from '$lib/db/crud/apiRequest';
import { updateUserBalanceWithDeduction } from '$lib/db/crud/balance';
import { createConversation, updateConversationLastMessage } from '$lib/db/crud/conversation';
import { generateConversationTitle } from '$lib/utils/titleGenerator';

/**
 * Handle image generation models like DALL-E
 */
export async function handleImageGeneration(
	requestBody: any,
	user: User,
	model: Model,
	requestId: string
) {
	let messageConversationId = requestBody.conversationId;
	let errorMessage: any;

	// Parse plainText from the request
	const plainText: string = JSON.parse(requestBody.plainTextPrompt);
	const openai = new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });

	const response = await openai.images.generate({
		model: model.param,
		prompt: plainText,
		n: 1,
		size: '1024x1024',
		response_format: 'b64_json'
	});

	const base64Data = response.data[0].b64_json;

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
		await updateUserBalanceWithDeduction(user.id, 0.04);
	}

	const { message, apiRequest } = await createMessageAndApiRequestEntry(
		{
			prompt: plainText,
			response: '[AI generated image]',
			pictures: [
				{
					type: 'image',
					data: 'data:image/png;base64,' + base64Data,
					media_type: 'image/png',
					width: 1024,
					height: 1024,
					ai: true
				}
			],
			reasoning: '',
			referencedMessageIds: [],
			files: []
		},
		{
			userId: user.id,
			apiProvider: ApiProvider.openAI,
			apiModel: model.name,
			inputTokens: 0,
			inputCost: 0,
			outputTokens: 0,
			outputCost: 0.04,
			totalCost: 0.04,
			requestId: requestId,
			status: ApiRequestStatus.COMPLETED,
			conversationId: messageConversationId,
			error: errorMessage
		}
	);
	console.log('API Request created:', apiRequest);

	// Update the conversation's last_message timestamp
	if (messageConversationId) {
		await updateConversationLastMessage(messageConversationId);
	}

	// Include the base64 data in the response to the frontend
	return new Response(JSON.stringify({ image: base64Data, outputPrice: 0.04 }), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Request-Id': requestId
		}
	});
}
