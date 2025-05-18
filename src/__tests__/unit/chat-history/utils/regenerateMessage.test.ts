/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { regenerateMessage } from '$lib/components/chat-history/utils/regenerateMessage';
import { chatHistory } from '$lib/stores';
import type { Component, ReasoningComponent, ChatComponent } from '$lib/types/types';
import { isLlmChatComponent } from '$lib/types/typeGuards';
import { ApiProvider } from '@prisma/client';
import { deserialize } from '$app/forms';
import type { Updater } from 'svelte/store';

// Mock dependencies
vi.mock('$lib/stores', () => ({
	chatHistory: {
		subscribe: vi.fn(),
		set: vi.fn(),
		update: vi.fn()
	}
}));

vi.mock('$lib/components/chat-history/utils/chatHistory', () => ({
	parseMessageContent: vi.fn((content) => [{ type: 'text', content }])
}));

vi.mock('$lib/types/typeGuards', () => ({
	isLlmChatComponent: vi.fn((chat) => chat.by !== 'user')
}));

vi.mock('$app/forms', () => ({
	deserialize: vi.fn((data) => JSON.parse(data))
}));

describe('regenerateMessage', () => {
	const mockMessageId = 2;
	let mockOriginalComponents: Component[];
	let mockOriginalReasoning: ReasoningComponent;

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup original message content
		mockOriginalComponents = [{ type: 'text', content: 'Original content' }];
		mockOriginalReasoning = { type: 'reasoning', content: 'Original reasoning' };

		// Setup chat history
		(chatHistory.update as any).mockImplementation((fn: Updater<ChatComponent[]>) => {
			const mockHistory: ChatComponent[] = [
				{ message_id: 1, by: 'user', text: 'Hello' },
				{
					message_id: mockMessageId,
					by: 'claude37Sonnet',
					text: 'Hello from Claude',
					components: mockOriginalComponents,
					reasoning: mockOriginalReasoning,
					input_cost: 0.001,
					output_cost: 0.002,
					loading: false
				}
			];

			return fn(mockHistory);
		});

		// Mock successful fetch
		global.fetch = vi
			.fn()
			// First fetch for message data
			.mockResolvedValueOnce({
				text: () =>
					Promise.resolve(
						JSON.stringify({
							type: 'success',
							data: {
								apiProvider: ApiProvider.anthropic,
								apiModel: 'Claude_3_7_Sonnet',
								message: {
									id: mockMessageId,
									prompt: 'Test prompt',
									response: 'Test response',
									reasoning: 'Test reasoning',
									pictures: [],
									files: [],
									referencedMessages: []
								}
							}
						})
					)
			})
			// Second fetch for API call
			.mockResolvedValueOnce({
				ok: true,
				body: {
					getReader: () => ({
						read: vi
							.fn()
							.mockResolvedValueOnce({
								value: new TextEncoder().encode(
									JSON.stringify({ type: 'text', content: 'New content' })
								),
								done: false
							})
							.mockResolvedValueOnce({
								value: new TextEncoder().encode(
									JSON.stringify({ type: 'reasoning', content: 'New reasoning' })
								),
								done: false
							})
							.mockResolvedValueOnce({
								value: new TextEncoder().encode(
									JSON.stringify({
										type: 'usage',
										usage: {
											inputPrice: 0.001,
											outputPrice: 0.002
										}
									})
								),
								done: false
							})
							.mockResolvedValueOnce({ done: true })
					})
				}
			});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should set message to loading state initially', async () => {
		// When regenerateMessage is called
		const promise = regenerateMessage(mockMessageId);

		// Then message should be set to loading state
		expect(chatHistory.update).toHaveBeenCalled();

		// Extract the callback passed to chatHistory.update
		const updateCallback = (chatHistory.update as any).mock.calls[0][0];

		// Execute the callback with a mock history array
		const mockHistory: ChatComponent[] = [
			{ message_id: 1, by: 'user', text: 'Hello' },
			{
				message_id: mockMessageId,
				by: 'claude37Sonnet',
				text: 'Hello from Claude',
				components: mockOriginalComponents,
				reasoning: mockOriginalReasoning,
				loading: false
			}
		];

		const updatedHistory = updateCallback(mockHistory);
		const updatedMessage = updatedHistory.find(
			(msg: ChatComponent) => msg.message_id === mockMessageId
		);

		// Check that the message was updated correctly
		expect(updatedMessage).toBeDefined();
		expect(updatedMessage.loading).toBe(true);
		expect(updatedMessage.components).toEqual([]);
		expect(updatedMessage.reasoning).toBeUndefined();

		// Wait for the promise to resolve to avoid test leakage
		await promise;
	});

	it('should restore original content if regeneration fails', async () => {
		// Reset fetch mock to fail on second call
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				text: () =>
					Promise.resolve(
						JSON.stringify({
							type: 'success',
							data: {
								apiProvider: ApiProvider.anthropic,
								apiModel: 'Claude_3_7_Sonnet',
								message: {
									id: mockMessageId,
									prompt: 'Test prompt',
									response: 'Test response',
									reasoning: 'Test reasoning'
								}
							}
						})
					)
			})
			.mockRejectedValueOnce(new Error('API call failed'));

		// When regenerateMessage is called
		await regenerateMessage(mockMessageId);

		// Then the store should be updated twice - once for loading and once for restoring
		expect(chatHistory.update).toHaveBeenCalledTimes(2);

		// Get the second update callback
		const restoreCallback = (chatHistory.update as any).mock.calls[1][0];

		// Create a mock history with the loading state
		const mockHistoryInLoadingState: ChatComponent[] = [
			{ message_id: 1, by: 'user', text: 'Hello' },
			{
				message_id: mockMessageId,
				by: 'claude37Sonnet',
				text: 'Hello from Claude',
				components: [], // Now empty due to loading state
				reasoning: undefined, // Now undefined due to loading state
				loading: true
			}
		];

		// Apply the restore callback
		const restoredHistory = restoreCallback(mockHistoryInLoadingState);
		const restoredMessage = restoredHistory.find(
			(msg: ChatComponent) => msg.message_id === mockMessageId
		);

		// Check that the original content was restored
		expect(restoredMessage).toBeDefined();
		expect(restoredMessage.loading).toBe(false);
		expect(restoredMessage.components).toEqual(mockOriginalComponents);
		expect(restoredMessage.reasoning).toEqual(mockOriginalReasoning);
	});
});
