import { error } from '@sveltejs/kit';
import { ApiProvider } from '@prisma/client';
import { InsufficientBalanceError } from '$lib/types/customErrors';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { validateApiRequest, type ApiRequestData } from '$lib/utils/apiRequestValidator';
import { processLLMRequest } from '$lib/services/llm/llmService';
import { handleImageGeneration } from '$lib/services/llm/imageGenerationService';

/**
 * Unified API endpoint for all LLM providers
 */
export async function POST({ request, locals, url }) {
	const requestId = crypto.randomUUID();

	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		console.error('[LLM API] Authentication failed');
		throw error(401, 'Forbidden');
	}

	try {
		// Parse the request body
		const requestBody = await request.json();

		const user = await retrieveUserByEmail(session.user.email);
		const regenerateMessageId = requestBody.regenerateMessageId;
		const provider = requestBody.provider as ApiProvider;

		if (!provider) {
			console.error('[LLM API] No provider specified in request');
			throw error(400, 'Provider is required');
		}

		// Validate the request using our shared validator
		const validatedData = await validateApiRequest(
			requestBody as ApiRequestData,
			user,
			provider
		);

		const {
			plainText,
			messages,
			model,
			images,
			files,
			messageConversationId,
			referencedMessageIds
		} = validatedData;

		// Special handling for image generation models (DALL-E)
		if (model.generatesImages) {
			return handleImageGeneration(requestBody, user, model, requestId);
		}

		// Process the LLM request with our unified service
		const readableStream = await processLLMRequest(
			{
				user,
				model,
				messages,
				plainText,
				images,
				files,
				apiProvider: provider,
				regenerateMessageId,
				messageConversationId: messageConversationId || '',
				originalConversationId: requestBody.conversationId,
				referencedMessageIds: referencedMessageIds.map((id) => id.toString()),
				requestId,
				reasoningEnabled: requestBody.reasoningOn
			},
			request.signal
		);

		return new Response(readableStream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Request-Id': requestId
			}
		});
	} catch (err) {
		console.error('[LLM API] Error:', err);
		if (err instanceof InsufficientBalanceError) {
			throw error(500, err.message);
		}
		throw error(500, 'An error occurred while processing your request');
	}
}
