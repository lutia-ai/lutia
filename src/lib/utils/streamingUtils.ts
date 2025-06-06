import type { OrderedContent, WebSearchData } from '$lib/types/types';

/**
 * Stream processing callbacks interface
 */
export interface StreamCallbacks {
	onText?: (content: string) => void;
	onReasoning?: (content: string) => void;
	onToolUse?: (toolName: string, toolData?: any) => void;
	onUsage?: (inputPrice: number, outputPrice: number) => void;
	onError?: (message: string) => void;
	onRequestInfo?: (conversationId: string, requestId?: string) => void;
	onMessageId?: (messageId: number) => void;
	onChunkProcessed?: (currentState: StreamingState) => void;
}

/**
 * Current streaming state for real-time updates
 */
export interface StreamingState {
	orderedContent: OrderedContent;
	webSearchResults: WebSearchData[];
	responseText: string;
	inputPrice: number;
	outputPrice: number;
	messageId: number | undefined;
	toolInProgress: boolean;
}

/**
 * Ordered content management class
 */
export class OrderedContentManager {
	private orderedContent: OrderedContent = [];
	private orderCounter = 0;
	private currentReasoningIndex: number | undefined;
	private activeToolUses = new Map<string, number>();

	/**
	 * Add text content to ordered stream
	 * @param content Text content to add
	 */
	addText(content: string): void {
		// Reset reasoning index when text starts (reasoning is complete)
		if (this.currentReasoningIndex !== undefined) {
			this.currentReasoningIndex = undefined;
		}

		this.orderedContent.push({
			type: 'text',
			content: content,
			order: this.orderCounter++
		});
	}

	/**
	 * Add reasoning content to ordered stream
	 * @param content Reasoning content to add
	 */
	addReasoning(content: string): void {
		// Check if we already have a reasoning entry in progress
		if (this.currentReasoningIndex !== undefined) {
			// Append to existing reasoning entry
			const existingReasoning = this.orderedContent[this.currentReasoningIndex];
			if (existingReasoning && existingReasoning.type === 'reasoning') {
				existingReasoning.content += content;
			}
		} else {
			// Create new reasoning entry
			const reasoningEntry = {
				type: 'reasoning' as const,
				content: content,
				order: this.orderCounter++
			};
			this.orderedContent.push(reasoningEntry);
			this.currentReasoningIndex = this.orderedContent.length - 1;
		}
	}

	/**
	 * Add or update tool use in ordered stream
	 * @param toolName Name of the tool being used
	 * @param toolData Tool data (undefined means tool is starting, data means tool completed)
	 */
	addToolUse(toolName: string, toolData?: any): void {
		const existingIndex = this.activeToolUses.get(toolName);

		if (existingIndex !== undefined && toolData) {
			// Update existing tool use entry with results
			const existingEntry = this.orderedContent[existingIndex];
			if (existingEntry && existingEntry.type === 'tool_use') {
				existingEntry.metadata = {
					...existingEntry.metadata,
					tool_data: toolData,
					timestamp: Date.now()
				};
				existingEntry.content = `Used ${toolName}`;
			}
			// Remove from active tracking since it's now complete
			this.activeToolUses.delete(toolName);
		} else if (!toolData) {
			// Starting a new tool use (no data means it's starting)
			const newEntry = {
				type: 'tool_use' as const,
				content: `Using ${toolName}...`,
				metadata: {
					tool_name: toolName,
					tool_data: undefined,
					timestamp: Date.now()
				},
				order: this.orderCounter++
			};

			// Add to ordered content and track its index
			const entryIndex = this.orderedContent.length;
			this.orderedContent.push(newEntry);
			this.activeToolUses.set(toolName, entryIndex);
		} else {
			// Tool use with data but no existing entry (fallback)
			this.orderedContent.push({
				type: 'tool_use',
				content: `Used ${toolName}`,
				metadata: {
					tool_name: toolName,
					tool_data: toolData,
					timestamp: Date.now()
				},
				order: this.orderCounter++
			});
		}
	}

	/**
	 * Get current ordered content
	 */
	getOrderedContent(): OrderedContent {
		return this.orderedContent;
	}

	/**
	 * Check if any tools are currently in progress
	 */
	hasToolsInProgress(): boolean {
		return this.activeToolUses.size > 0;
	}

	/**
	 * Reset the manager for a new request
	 */
	reset(): void {
		this.orderedContent = [];
		this.orderCounter = 0;
		this.currentReasoningIndex = undefined;
		this.activeToolUses.clear();
	}
}

/**
 * Web search results manager
 */
export class WebSearchManager {
	private webSearchResults: WebSearchData[] = [];

	/**
	 * Add web search results
	 * @param toolData Web search data
	 */
	addWebSearchResults(toolData: any): void {
		// Only add results if toolData is valid and has results
		if (
			toolData &&
			toolData.results &&
			Array.isArray(toolData.results) &&
			toolData.results.length > 0
		) {
			this.webSearchResults.push({
				results: toolData.results || [],
				totalResults: toolData.totalResults || 0
			});
		}
	}

	/**
	 * Get current web search results
	 */
	getWebSearchResults(): WebSearchData[] {
		return this.webSearchResults;
	}

	/**
	 * Reset for new request
	 */
	reset(): void {
		this.webSearchResults = [];
	}
}

/**
 * Process streaming response chunks
 * @param chunk Raw chunk data
 * @param decoder TextDecoder instance
 * @param callbacks Callback functions for different event types
 * @param contentManager Ordered content manager
 * @param searchManager Web search manager
 * @returns Processed line data
 */
async function processStreamChunk(
	chunk: Uint8Array,
	decoder: TextDecoder,
	callbacks: StreamCallbacks,
	contentManager: OrderedContentManager,
	searchManager: WebSearchManager
): Promise<void> {
	// Decode the chunk
	const chunkText = decoder.decode(chunk, { stream: true });

	// Process lines (each JSON object is on its own line)
	const lines = chunkText.split('\n').filter((line) => line.trim());

	for (const line of lines) {
		try {
			const data = JSON.parse(line);

			// Handle different message types
			if (data.type === 'text') {
				contentManager.addText(data.content);
				callbacks.onText?.(data.content);
			} else if (data.type === 'reasoning') {
				contentManager.addReasoning(data.content);
				callbacks.onReasoning?.(data.content);
			} else if (data.type === 'usage') {
				callbacks.onUsage?.(data.usage.inputPrice, data.usage.outputPrice);
			} else if (data.type === 'tool_use') {
				contentManager.addToolUse(data.tool_name, data.tool_data);

				// Handle web search results - only add if data is valid
				if (data.tool_name === 'web_search' && data.tool_data && data.tool_data.results) {
					searchManager.addWebSearchResults(data.tool_data);
				}

				callbacks.onToolUse?.(data.tool_name, data.tool_data);
			} else if (data.type === 'request_info') {
				callbacks.onRequestInfo?.(data.conversation_id, data.request_id);
			} else if (data.type === 'message_id') {
				callbacks.onMessageId?.(data.message_id);
			} else if (data.type === 'error') {
				console.error(data.message);
				callbacks.onError?.(data.message);
			}
		} catch (e) {
			console.error('Error parsing stream chunk:', e);
			// Continue with the next line if one fails to parse
		}
	}
}

/**
 * Real-time streaming response handler that updates UI progressively
 * @param response Fetch response with streaming body
 * @param callbacks Event callbacks including onChunkProcessed for real-time updates
 * @returns Promise with final state
 */
export async function handleStreamingResponse(
	response: Response,
	callbacks: StreamCallbacks
): Promise<StreamingState> {
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	const contentManager = new OrderedContentManager();
	const searchManager = new WebSearchManager();

	let responseText = '';
	let inputPrice = 0;
	let outputPrice = 0;
	let messageId: number | undefined;

	const createCurrentState = (): StreamingState => ({
		orderedContent: contentManager.getOrderedContent(),
		webSearchResults: searchManager.getWebSearchResults(),
		responseText,
		inputPrice,
		outputPrice,
		messageId,
		toolInProgress: contentManager.hasToolsInProgress()
	});

	const extendedCallbacks: StreamCallbacks = {
		...callbacks,
		onText: (content) => {
			responseText += content;
			callbacks.onText?.(content);
		},
		onUsage: (input, output) => {
			inputPrice = input;
			outputPrice = output;
			callbacks.onUsage?.(input, output);
		},
		onMessageId: (id) => {
			messageId = id;
			callbacks.onMessageId?.(id);
		}
	};

	while (true) {
		const { value, done } = await reader.read();
		if (done) break;

		await processStreamChunk(value, decoder, extendedCallbacks, contentManager, searchManager);

		// Call the real-time update callback after each chunk is processed
		if (callbacks.onChunkProcessed) {
			callbacks.onChunkProcessed(createCurrentState());
		}
	}

	return createCurrentState();
}

/**
 * Server-side streaming utilities for encoding responses
 */
export class ServerStreamEncoder {
	private textEncoder = new TextEncoder();

	/**
	 * Encode and send text content
	 */
	encodeText(content: string): Uint8Array {
		return this.textEncoder.encode(
			JSON.stringify({
				type: 'text',
				content: content
			}) + '\n'
		);
	}

	/**
	 * Encode and send reasoning content
	 */
	encodeReasoning(content: string): Uint8Array {
		return this.textEncoder.encode(
			JSON.stringify({
				type: 'reasoning',
				content: content
			}) + '\n'
		);
	}

	/**
	 * Encode and send tool use event
	 */
	encodeToolUse(toolName: string, toolData?: any): Uint8Array {
		return this.textEncoder.encode(
			JSON.stringify({
				type: 'tool_use',
				tool_name: toolName,
				tool_data: toolData
			}) + '\n'
		);
	}

	/**
	 * Encode and send usage information
	 */
	encodeUsage(inputPrice: number, outputPrice: number): Uint8Array {
		return this.textEncoder.encode(
			JSON.stringify({
				type: 'usage',
				usage: {
					inputPrice: inputPrice,
					outputPrice: outputPrice
				}
			}) + '\n'
		);
	}

	/**
	 * Encode and send request info
	 */
	encodeRequestInfo(requestId: string, conversationId: string): Uint8Array {
		return this.textEncoder.encode(
			JSON.stringify({
				type: 'request_info',
				request_id: requestId,
				conversation_id: conversationId
			}) + '\n'
		);
	}

	/**
	 * Encode and send message ID
	 */
	encodeMessageId(messageId: number): Uint8Array {
		return this.textEncoder.encode(
			JSON.stringify({
				type: 'message_id',
				message_id: messageId
			}) + '\n'
		);
	}

	/**
	 * Encode and send error
	 */
	encodeError(message: string): Uint8Array {
		return this.textEncoder.encode(
			JSON.stringify({
				type: 'error',
				message: message
			}) + '\n'
		);
	}
}
