import { error } from '@sveltejs/kit';
import type { Message, Model, Image, FileAttachment, GptTokenUsage } from '$lib/types/types';
import { isValidMessageArray } from '../types/typeGuards';
import { getModelFromName } from '$lib/models/modelUtils';
import { ApiModel, ApiProvider, PaymentTier, type User } from '@prisma/client';
import { retrieveUsersBalance } from '$lib/db/crud/balance';
import { InsufficientBalanceError } from '$lib/types/customErrors';
import {
	createConversation,
	deleteOldestConversation,
	countUserConversations
} from '$lib/db/crud/conversation';
import { estimateTokenCount } from '../models/cost-calculators/tokenCounter';
import { calculateImageCostByProvider } from '../models/cost-calculators/imageCalculator';

/**
 * Interface for the request data that needs validation
 */
export interface ApiRequestData {
	plainTextPrompt: string;
	promptStr: string;
	modelStr: string;
	imagesStr: string;
	filesStr?: string;
	reasoningOn?: boolean;
	conversationId?: string;
	regenerateMessageId?: string;
}

/**
 * Interface for the validated and processed request data
 */
export interface ValidatedApiRequestData {
	plainText: string;
	messages: Message[];
	rawMessages: Message[];
	model: Model;
	modelName: ApiModel;
	images: Image[];
	files: FileAttachment[];
	user: User;
	messageConversationId?: string;
	referencedMessageIds: number[];
	estimatedInputTokens: number;
	estimatedInputCost: number;
	finalUsage: GptTokenUsage;
	imageTokens: number;
	imageCost: number;
}

/**
 * Validates and processes API request data for LLM endpoints
 * @param request The request body parsed as JSON
 * @param user The authenticated user
 * @param apiProvider The API provider (for conversation handling)
 * @returns Validated and processed request data
 */
export async function validateApiRequest(
	requestData: ApiRequestData,
	user: User,
	apiProvider: ApiProvider
): Promise<ValidatedApiRequestData> {
	try {
		const {
			plainTextPrompt,
			promptStr,
			modelStr,
			imagesStr,
			filesStr,
			reasoningOn,
			conversationId
		} = requestData;

		// Parse the JSON strings
		const plainText: string = JSON.parse(plainTextPrompt);
		const modelName: ApiModel = JSON.parse(modelStr);
		const rawMessages: Message[] = JSON.parse(promptStr);
		const images: Image[] = JSON.parse(imagesStr || '[]');
		const files: FileAttachment[] = JSON.parse(filesStr || '[]');
		const messageConversationId = requestData.conversationId || null;

		// Validate message array
		if (!isValidMessageArray(rawMessages)) {
			throw error(400, 'Invalid messages array');
		}

		let messages: Message[] = [...rawMessages];

		// Convert the model name to full Model object
		const model: Model | null = getModelFromName(modelName);

		if (!model) {
			throw error(400, `Model ${modelName} not found`);
		}

		// Basic validations
		if (!plainText || !messages) {
			throw error(400, `No prompt found`);
		}

		if (typeof plainText !== 'string') {
			throw error(400, 'plainText must be a string');
		}

		if (typeof modelName !== 'string') {
			throw error(400, 'modelStr must be a string');
		}

		if (!Array.isArray(rawMessages)) {
			throw error(400, 'promptStr must be an array of messages');
		}

		if (!Array.isArray(images)) {
			throw error(400, 'imagesStr must be an array of images');
		}

		if (filesStr !== undefined && !Array.isArray(files)) {
			throw error(400, 'filesStr must be an array of files');
		}

		if (reasoningOn !== undefined && typeof reasoningOn !== 'boolean') {
			throw error(400, 'reasoningOn must be a boolean');
		}

		if (conversationId !== undefined && typeof conversationId !== 'string') {
			throw error(400, 'conversationId must be a string if provided');
		}

		if (!user.email_verified) {
			throw error(400, 'Email not verified');
		}

		// Extract unique message IDs from your messages array
		const referencedMessageIds: number[] = [
			...new Set(
				messages
					.filter((msg) => msg.message_id !== null && msg.message_id !== undefined)
					.map((msg) => msg.message_id)
					.filter((id): id is number => id !== undefined)
			)
		];

		// Process messages differently based on provider
		if (apiProvider === ApiProvider.anthropic) {
			// For Claude: extract system message and remove empty messages
			let systemMessage = null;

			for (let i = messages.length - 1; i >= 0; i--) {
				const msg = messages[i];
				if (msg.role === 'system') {
					systemMessage = msg.content || '';
				} else if (
					msg.role === 'assistant' &&
					(msg.content === undefined || msg.content === null || msg.content === '')
				) {
					messages.splice(i, 1);
				}
			}
		} else {
			// For other providers: just filter out assistant messages with empty content
			messages = messages.map((msg) => {
				if (
					msg.role === 'assistant' &&
					(msg.content === undefined || msg.content === null || msg.content === '')
				) {
					return { ...msg, content: 'Streaming in progress...' };
				}
				return msg;
			});
		}

		// Calculate image costs (provider-specific)
		const imageCalc = calculateImageCostByProvider(images, model, apiProvider);
		const imageCost = imageCalc.cost;
		const imageTokens = imageCalc.tokens;

		// Estimate token count and cost
		const estimatedInputTokens = estimateTokenCount(messages.toString()) + imageTokens;
		const estimatedInputCost = (estimatedInputTokens * model.input_price) / 1000000 + imageCost;

		// Create a new conversation if no existing conversationId was provided
		let finalConversationId: string | undefined = messageConversationId
			? (messageConversationId as string)
			: undefined;
		if (!messageConversationId) {
			if (user.payment_tier === PaymentTier.Premium) {
				// Premium users always get a new conversation
				const conversation = await createConversation(user.id, 'New Chat');
				finalConversationId = conversation.id;
			} else if (user.payment_tier === PaymentTier.PayAsYouGo) {
				// For PayAsYouGo users, check if they've reached the 30 conversation limit
				const conversationCount = await countUserConversations(user.id);

				if (conversationCount >= 30) {
					// If they've reached the limit, delete the oldest conversation and create a new one
					await deleteOldestConversation(user.id);
				}

				// Create a new conversation
				const conversation = await createConversation(user.id, 'New Chat');
				finalConversationId = conversation.id;
			}
		}

		// Check user balance for pay-as-you-go users
		if (user.payment_tier === PaymentTier.PayAsYouGo) {
			const balance = await retrieveUsersBalance(user.id);
			if (balance - estimatedInputCost <= 0.1) {
				throw new InsufficientBalanceError();
			}
		}

		// Ensure first message has 'user' role by removing leading non-user messages
		while (messages.length > 0 && messages[0].role !== 'user') {
			messages.shift();
		}

		// If no user messages remain, throw error
		if (messages.length === 0) {
			throw error(400, 'No user messages found. The first message must use the user role.');
		}

		// Special handling for GPT-o1 and GPT-o3 mini models
		if (
			apiProvider === ApiProvider.openAI &&
			(model.name === ApiModel.GPT_o1 || model.name === ApiModel.GPT_o3_mini)
		) {
			messages.unshift({
				role: 'developer',
				content: 'Formatting re-enabled'
			});
		}

		// Prepare the usage object
		const finalUsage: GptTokenUsage = {
			prompt_tokens: estimatedInputTokens,
			completion_tokens: 0,
			total_tokens: 0
		};

		return {
			plainText,
			messages,
			rawMessages,
			model,
			modelName,
			images,
			files,
			user,
			messageConversationId: finalConversationId,
			referencedMessageIds,
			estimatedInputTokens,
			estimatedInputCost,
			finalUsage,
			imageTokens,
			imageCost
		};
	} catch (err: any) {
		if (err instanceof InsufficientBalanceError) {
			throw error(500, err.message);
		}
		if (err.status && err.body) {
			throw err; // Pass through HTTP errors
		}
		console.error('API Request Validation Error:', err);
		throw error(500, 'An error occurred while processing your request');
	}
}
