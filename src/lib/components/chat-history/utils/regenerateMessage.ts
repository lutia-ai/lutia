import { deserialize } from '$app/forms';
import { parseMessageContent } from '$lib/components/chat-history/utils/chatHistory';
import { chatHistory } from '$lib/stores';
import type {
	Component,
	ReasoningComponent,
	SerializedApiRequest,
	Message as ChatMessage
} from '$lib/types/types';
import { isLlmChatComponent } from '$lib/types/typeGuards';
import { ApiProvider } from '@prisma/client';
import type { ActionResult } from '@sveltejs/kit';

export async function regenerateMessage(messageId: number) {
	let originalComponent: Component[] = [];
	let originalReasoning: ReasoningComponent | undefined;
	chatHistory.update((history) => {
		return history.map((msg) => {
			if (msg.message_id === messageId && isLlmChatComponent(msg)) {
				// Store the original text before clearing it
				originalComponent = msg.components;
				originalReasoning = msg.reasoning ?? originalReasoning;

				return {
					...msg,
					components: [],
					reasoning: undefined,
					loading: true
				};
			}
			return msg;
		});
	});

	try {
		const formData = new FormData();
		formData.append('messageId', messageId.toString());

		const response = await fetch('?/fetchMessageAndApiRequest', {
			method: 'POST',
			body: formData
		});
		const result: ActionResult = deserialize(await response.text());

		let apiRequestWithMessage: SerializedApiRequest | null = null;

		if (result.type === 'success' && result.data) {
			apiRequestWithMessage = result.data as SerializedApiRequest;
		} else if (result.type === 'failure' && result.data) {
			console.error('Failed to fetch Api request with message data');
			throw new Error('Failed to fetch Api request with message data');
		}

		if (!apiRequestWithMessage) {
			throw new Error('Failed to fetch Api request with message data');
		}

		let uri: string;
		switch (apiRequestWithMessage.apiProvider) {
			case ApiProvider.anthropic:
				uri = '/api/claude';
				break;
			case ApiProvider.openAI:
				uri = '/api/chatGPT';
				break;
			case ApiProvider.meta:
				uri = '/api/llama';
				break;
			case ApiProvider.xAI:
				uri = '/api/xAI';
				break;
			case ApiProvider.deepSeek:
				uri = '/api/deepSeek';
				break;
			default:
				uri = '/api/gemini';
		}

		const reasoningOn = apiRequestWithMessage.message?.reasoning ? true : false;
		// UUID validation function
		const isValidUUID = (uuid: string) => {
			const uuidRegex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			return uuidRegex.test(uuid);
		};

		// Only include conversationId if it's a valid UUID and user is premium
		const validConversationId =
			apiRequestWithMessage.conversationId &&
			isValidUUID(apiRequestWithMessage.conversationId)
				? apiRequestWithMessage.conversationId
				: undefined;

		// Create the fullPrompt array with message history
		let fullPrompt: ChatMessage[] = [];

		// If there are referenced messages, add them first (in order by ID)
		if (
			apiRequestWithMessage.message?.referencedMessages &&
			apiRequestWithMessage.message.referencedMessages.length > 0
		) {
			// Sort referenced messages by ID to maintain chronological order
			const sortedReferences = [...apiRequestWithMessage.message.referencedMessages].sort(
				(a, b) => a.id - b.id
			);

			// Add each referenced message to the conversation history
			sortedReferences.forEach((refMsg) => {
				const userMessage: ChatMessage = {
					message_id: refMsg.id,
					role: 'user',
					content: refMsg.prompt
				};
				const AiMessage: ChatMessage = {
					message_id: refMsg.id,
					role: 'assistant',
					content: refMsg.response
				};
				fullPrompt.push(userMessage, AiMessage);
			});
		}

		// Add the current message (with empty response since we're regenerating it)
		if (apiRequestWithMessage.message) {
			const currentMessage: ChatMessage = {
				message_id: apiRequestWithMessage.message.id,
				role: 'user',
				content: apiRequestWithMessage.message.prompt
			};
			fullPrompt.push(currentMessage);
		}

		console.log('fullPrompt: ', fullPrompt);

		const streamResponse = await fetch(uri, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				plainTextPrompt: JSON.stringify(apiRequestWithMessage.message?.prompt),
				promptStr: JSON.stringify(fullPrompt),
				modelStr: JSON.stringify(apiRequestWithMessage.apiModel),
				imagesStr: JSON.stringify(apiRequestWithMessage.message?.pictures),
				...(apiRequestWithMessage.apiProvider === ApiProvider.anthropic
					? { reasoningOn }
					: {}),
				...(validConversationId ? { conversationId: validConversationId } : {}),
				regenerateMessageId: JSON.stringify(messageId)
			})
		});

		if (!streamResponse.ok) {
			const errorData = await response.clone().json();
			// Clone the response so that we can safely read it as JSON
			if (errorData.message === 'Insufficient balance') {
				// errorPopup.showError(
				//     errorData.message,
				//     "Spending can't go below $0.10",
				//     5000,
				//     'error'
				// );
			}
			throw new Error(errorData.message || 'An error occurred');
		}

		if (!streamResponse.body) {
			throw new Error('Response body is null');
		}

		const reader = streamResponse.body.getReader();
		const decoder = new TextDecoder();
		let responseText = '';
		let reasoningText = '';
		let responseComponents: Component[] = [];
		let reasoningComponent: ReasoningComponent;
		let inputPrice: number = 0;
		let outputPrice: number = 0;

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			// Decode the chunk
			const chunk = decoder.decode(value, { stream: true });

			// Process lines (each JSON object is on its own line)
			const lines = chunk.split('\n').filter((line) => line.trim());

			for (const line of lines) {
				try {
					const data = JSON.parse(line);
					// Handle different message types
					if (data.type === 'text') {
						responseText += data.content;
						responseComponents = parseMessageContent(responseText);
					} else if (data.type === 'reasoning') {
						reasoningText += data.content;
						reasoningComponent = {
							type: 'reasoning',
							content: reasoningText
						};
					} else if (data.type === 'usage') {
						inputPrice = data.usage.inputPrice;
						outputPrice = data.usage.outputPrice;
					} else if (data.type === 'error') {
						console.error(data.message);
						// errorPopup.showError(data.message, null, 5000, 'error');
					}

					// Update the chat history by matching message_id AND ensuring it's an LLM message
					chatHistory.update((history) =>
						history.map((msg) =>
							msg.message_id === messageId && isLlmChatComponent(msg)
								? {
										...msg,
										text: responseText,
										components: responseComponents,
										reasoning: reasoningComponent,
										input_cost: msg.input_cost + inputPrice,
										output_cost: msg.output_cost + outputPrice,
										loading: false
									}
								: msg
						)
					);
				} catch (e) {
					console.error('Error parsing stream chunk:', e);
					// Continue with the next line if one fails to parse
				}
			}
		}
	} catch (error) {
		console.error('Error regenerating message:', error);
		if (originalComponent) {
			chatHistory.update((history) => {
				return history.map((msg) => {
					if (msg.message_id === messageId && isLlmChatComponent(msg)) {
						return {
							...msg,
							components: originalComponent,
							reasoning: originalReasoning,
							loading: false
						};
					}
					return msg;
				});
			});
		}
	}
}
