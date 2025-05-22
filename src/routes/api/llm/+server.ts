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
	console.log(`[LLM API] New request received, id: ${requestId}`);

	let session = await locals.auth();
	if (!session || !session.user || !session.user.email) {
		console.error('[LLM API] Authentication failed');
		throw error(401, 'Forbidden');
	}

	try {
		// Parse the request body
		const requestBody = await request.json();
		console.log(
			`[LLM API] Request body:`,
			JSON.stringify({
				provider: requestBody.provider,
				regenerateMessageId: requestBody.regenerateMessageId,
				hasImages: requestBody.imagesStr
					? JSON.parse(requestBody.imagesStr).length > 0
					: false,
				hasFiles: requestBody.filesStr
					? JSON.parse(requestBody.filesStr).length > 0
					: false,
				conversationId: requestBody.conversationId,
				reasoningOn: requestBody.reasoningOn
			})
		);

		const user = await retrieveUserByEmail(session.user.email);
		const regenerateMessageId = requestBody.regenerateMessageId;
		const provider = requestBody.provider as ApiProvider;

		if (!provider) {
			console.error('[LLM API] No provider specified in request');
			throw error(400, 'Provider is required');
		}
		console.log(`[LLM API] Using provider: ${provider}`);

		// Validate the request using our shared validator
		console.log('[LLM API] Validating request...');
		const validatedData = await validateApiRequest(
			requestBody as ApiRequestData,
			user,
			provider
		);
		console.log('[LLM API] Request validated successfully');

		const {
			plainText,
			messages,
			model,
			images,
			files,
			messageConversationId,
			referencedMessageIds
		} = validatedData;

		console.log(
			`[LLM API] Model: ${model.name}, Conversation: ${messageConversationId || 'new'}`
		);

		// Special handling for image generation models (DALL-E)
		if (model.generatesImages) {
			console.log('[LLM API] Using image generation model');
			return handleImageGeneration(requestBody, user, model, requestId);
		}

		// Process the LLM request with our unified service
		console.log('[LLM API] Processing LLM request...');
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
		console.log('[LLM API] Stream created, sending response');

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
