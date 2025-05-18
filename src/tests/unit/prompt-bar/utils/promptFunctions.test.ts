/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeHtml, generateFullPrompt } from '$lib/components/prompt-bar/utils/promptFunctions';
import type { ChatComponent, Message, Model, FileAttachment, UserChat } from '$lib/types/types';
import type { ApiModel } from '@prisma/client';
import * as typeGuards from '$lib/types/typeGuards';
import * as fileHandling from '$lib/utils/fileHandling';
import DOMPurify from 'dompurify';
import { modelDictionary } from '$lib/models/modelDictionary';

// Mock dependencies
const mockDOMPurify = {
	sanitize: vi.fn((html, options) => {
		// Simple mock implementation that removes tags not in allowed list
		if (options && options.ALLOWED_TAGS) {
			// Just return content without tags for test simplicity
			let tempDiv = document.createElement('div');
			tempDiv.innerHTML = html;
			return tempDiv.textContent || '';
		}
		return html;
	})
};

const mockAddFilesToMessage = vi.fn((messages, files) => {
	// Mock by adding file content to message
	return messages.map((msg: Message) => ({
		...msg,
		content:
			msg.content + files.map((f: { filename: string }) => ` [FILE:${f.filename}]`).join('')
	}));
});

const mockIsUserChatComponent = vi
	.fn()
	.mockImplementation((component: ChatComponent): boolean => component.by === 'user');

// Set up spies
beforeEach(() => {
	vi.spyOn(DOMPurify, 'sanitize').mockImplementation(mockDOMPurify.sanitize);
	vi.spyOn(fileHandling, 'addFilesToMessage').mockImplementation(mockAddFilesToMessage);
	vi.spyOn(typeGuards, 'isUserChatComponent').mockImplementation(mockIsUserChatComponent);
});

// Clean up
afterEach(() => {
	vi.restoreAllMocks();
});

describe('promptFunctions', () => {
	describe('sanitizeHtml', () => {
		it('should sanitize HTML by removing unsafe tags', () => {
			const html = '<div><script>alert("xss")</script><p>Safe content</p></div>';
			mockDOMPurify.sanitize.mockReturnValueOnce('Safe content');

			const result = sanitizeHtml(html);
			expect(result).not.toContain('<script>');
			expect(result).toContain('Safe content');
			expect(DOMPurify.sanitize).toHaveBeenCalled();
		});

		it('should strip all HTML when only text is desired', () => {
			const html = '<div><b>Bold</b> and <i>Italic</i> text</div>';
			mockDOMPurify.sanitize.mockReturnValueOnce('Bold and Italic text');

			const result = sanitizeHtml(html);
			expect(result).toBe('Bold and Italic text');
		});

		it('should handle empty input', () => {
			mockDOMPurify.sanitize.mockReturnValueOnce('');
			const result = sanitizeHtml('');
			expect(result).toBe('');
		});
	});

	describe('generateFullPrompt', () => {
		// Use a real model from the dictionary
		const mockModel: Model = modelDictionary.openAI.models.gpt4o;

		// Mock chat history
		const mockHistory: ChatComponent[] = [
			{
				message_id: 1,
				by: 'user',
				text: 'Hello, I need help with code'
			} as UserChat,
			{
				message_id: 2,
				by: 'GPT_4',
				text: 'I can help with code. What do you need?',
				input_cost: 0.001,
				output_cost: 0.002,
				price_open: false,
				loading: false,
				copied: false,
				components: []
			},
			{
				message_id: 3,
				by: 'user',
				text: 'How do I create a React component?',
				attachments: [
					{
						type: 'file',
						data: 'console.log("hello")',
						media_type: 'text/javascript',
						filename: 'example.js',
						file_extension: '.js',
						size: 100
					} as FileAttachment
				]
			} as UserChat,
			{
				message_id: 4,
				by: 'GPT_4',
				text: 'Here is how you create a React component...',
				input_cost: 0.002,
				output_cost: 0.003,
				price_open: false,
				loading: false,
				copied: false,
				components: []
			}
		];

		it('should generate a prompt with the current text only when no history is provided', () => {
			const prompt = 'Hello AI';
			mockDOMPurify.sanitize.mockReturnValueOnce('Hello AI');

			const result = generateFullPrompt(prompt, [], 2, mockModel);

			expect(result).toHaveLength(1);
			expect(result[0].role).toBe('user');
			expect(result[0].content).toBe('Hello AI');
		});

		it('should include previous messages based on the specified number', () => {
			const prompt = 'Another question';
			// Mock sanitize for each call
			mockDOMPurify.sanitize
				.mockReturnValueOnce('How do I create a React component?')
				.mockReturnValueOnce('Here is how you create a React component...')
				.mockReturnValueOnce('Another question');

			const result = generateFullPrompt(prompt, mockHistory, 1, mockModel, false);

			// Should include the last 2 messages (1 pair of user-assistant) + current prompt
			expect(result).toHaveLength(3);
			expect(result[0].role).toBe('user');
			expect(result[0].content).toContain('How do I create a React component?');
			expect(result[1].role).toBe('assistant');
			expect(result[1].content).toContain('Here is how you create a React component');
			expect(result[2].role).toBe('user');
			expect(result[2].content).toBe('Another question');
		});

		it('should ignore the last two messages when ignoreLastTwo is true', () => {
			const prompt = 'Tell me more';
			// Mock sanitize for each call
			mockDOMPurify.sanitize
				.mockReturnValueOnce('Hello, I need help with code')
				.mockReturnValueOnce('I can help with code. What do you need?')
				.mockReturnValueOnce('Tell me more');

			const result = generateFullPrompt(prompt, mockHistory, 1, mockModel, true);

			// Should include messages from before the last two + current prompt
			expect(result).toHaveLength(3);
			expect(result[0].role).toBe('user');
			expect(result[0].content).toContain('Hello, I need help with code');
			expect(result[1].role).toBe('assistant');
			expect(result[1].content).toContain('I can help with code');
			expect(result[2].role).toBe('user');
			expect(result[2].content).toBe('Tell me more');
		});

		it('should handle file attachments in user messages', () => {
			const prompt = 'Check this file';
			mockDOMPurify.sanitize
				.mockReturnValueOnce('How do I create a React component?')
				.mockReturnValueOnce('Here is how you create a React component...')
				.mockReturnValueOnce('Check this file');

			// Set mock implementation for this test
			mockIsUserChatComponent.mockImplementation((component: ChatComponent): boolean => {
				return (
					component.by === 'user' &&
					'attachments' in component &&
					component.attachments !== undefined &&
					component.attachments.length > 0
				);
			});

			mockAddFilesToMessage.mockImplementationOnce(
				(messages: Message[], files: FileAttachment[]) => {
					return [
						{
							...messages[0],
							content: messages[0].content + ' [FILE:example.js]'
						}
					];
				}
			);

			const result = generateFullPrompt(prompt, mockHistory, 2, mockModel, false);

			// Verify that file content was added
			const userMsgWithFile = result.find(
				(msg) => msg.content && msg.content.includes('[FILE:example.js]')
			);

			expect(userMsgWithFile).toBeDefined();
		});

		it('should use automatic context window sizing when isContextWindowAuto is true', () => {
			const prompt = 'One more thing';
			mockDOMPurify.sanitize.mockReturnValueOnce('One more thing');

			const result = generateFullPrompt(prompt, mockHistory, 1, mockModel, false, true);

			// The behavior will depend on token estimation, but we should at least have the prompt
			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result[result.length - 1].content).toBe('One more thing');
		});
	});
});
