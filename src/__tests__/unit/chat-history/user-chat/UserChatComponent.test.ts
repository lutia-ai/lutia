/**
 * @vitest-environment jsdom
 */

// Mock the file utility functions
vi.mock('$lib/utils/fileHandling', () => ({
	getFileIcon: vi.fn().mockReturnValue('PDF'),
	getFileIconColor: vi.fn().mockReturnValue('rgb(255, 87, 34)')
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import UserChatComponent from '$lib/components/chat-history/user-chat/UserChatComponent.svelte';
import type { UserChat, FileAttachment } from '$lib/types/types';

describe('UserChatComponent', () => {
	// Common props
	const mockOpenImageViewer = vi.fn();
	const mockOpenFileViewer = vi.fn();

	// Basic user chat without attachments
	const basicUserChat: UserChat = {
		message_id: 1,
		by: 'user',
		text: 'Hello, this is a test message'
	};

	// User chat with image attachment
	const userChatWithImage: UserChat = {
		message_id: 2,
		by: 'user',
		text: 'Check out this image',
		attachments: [
			{
				type: 'image',
				data: 'data:image/png;base64,abc123',
				media_type: 'image/png',
				width: 300,
				height: 200
			}
		]
	};

	// User chat with file attachment
	const userChatWithFile: UserChat = {
		message_id: 3,
		by: 'user',
		text: 'Here is a document',
		attachments: [
			{
				type: 'file',
				data: 'file-data-content',
				media_type: 'application/pdf',
				filename: 'document.pdf',
				file_extension: 'pdf',
				size: 1024
			}
		]
	};

	// User chat with both image and file attachments
	const userChatWithBoth: UserChat = {
		message_id: 4,
		by: 'user',
		text: 'Here are both files',
		attachments: [
			{
				type: 'image',
				data: 'data:image/jpeg;base64,xyz789',
				media_type: 'image/jpeg',
				width: 400,
				height: 300
			},
			{
				type: 'file',
				data: 'file-data-content-2',
				media_type: 'application/pdf',
				filename: 'another-doc.pdf',
				file_extension: 'pdf',
				size: 2048
			}
		]
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders user message text correctly', () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: basicUserChat,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const userChatElement = container.querySelector('.user-chat');
		expect(userChatElement).not.toBeNull();
		expect(userChatElement?.textContent?.trim()).toBe(basicUserChat.text);
	});

	it('renders HTML content in text when provided', () => {
		const chatWithHtml: UserChat = {
			message_id: 5,
			by: 'user',
			text: 'This is <strong>bold</strong> text'
		};

		const { container } = render(UserChatComponent, {
			props: {
				chat: chatWithHtml,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const userChatElement = container.querySelector('.user-chat');
		const strongElement = userChatElement?.querySelector('strong');
		expect(strongElement).not.toBeNull();
		expect(strongElement?.textContent).toBe('bold');
	});

	it('renders image attachment correctly', () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: userChatWithImage,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const imageContainer = container.querySelector('.user-image-container');
		expect(imageContainer).not.toBeNull();

		const imageElement = imageContainer?.querySelector('img');
		expect(imageElement).not.toBeNull();
		expect(imageElement?.getAttribute('src')).toBe(userChatWithImage.attachments?.[0].data);
		expect(imageElement?.getAttribute('alt')).toBe('User uploaded');
	});

	it('renders file attachment correctly', () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: userChatWithFile,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const fileContainer = container.querySelector('.user-file-container');
		expect(fileContainer).not.toBeNull();

		const fileIcon = fileContainer?.querySelector('.file-icon');
		expect(fileIcon).not.toBeNull();
		expect(fileIcon?.getAttribute('style')).toContain('background: rgb(255, 87, 34)');

		const fileType = fileContainer?.querySelector('.file-type');
		expect(fileType?.textContent).toBe('PDF');

		const fileName = fileContainer?.querySelector('.file-name');
		expect(fileName?.textContent).toBe('document.pdf');
	});

	it('renders both image and file attachments when provided', () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: userChatWithBoth,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const imageContainers = container.querySelectorAll('.user-image-container');
		expect(imageContainers.length).toBe(1);

		const fileContainers = container.querySelectorAll('.user-file-container');
		expect(fileContainers.length).toBe(1);
	});

	it('calls openImageViewer when image is clicked', async () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: userChatWithImage,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const imageContainer = container.querySelector('.user-image-container');
		await fireEvent.click(imageContainer!);

		expect(mockOpenImageViewer).toHaveBeenCalledTimes(1);
		expect(mockOpenImageViewer).toHaveBeenCalledWith(
			userChatWithImage.attachments?.[0].data,
			'User uploaded image'
		);
	});

	it('calls openFileViewer when file is clicked', async () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: userChatWithFile,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const fileContainer = container.querySelector('.user-file-container');
		await fireEvent.click(fileContainer!);

		expect(mockOpenFileViewer).toHaveBeenCalledTimes(1);

		// Cast the attachment to FileAttachment to access the filename property
		const fileAttachment = userChatWithFile.attachments?.[0] as FileAttachment;
		expect(mockOpenFileViewer).toHaveBeenCalledWith(
			fileAttachment.data,
			fileAttachment.filename
		);
	});

	it('handles keyboard navigation for accessibility - Enter key for image', async () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: userChatWithImage,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const imageContainer = container.querySelector('.user-image-container');
		await fireEvent.keyDown(imageContainer!, { key: 'Enter' });

		expect(mockOpenImageViewer).toHaveBeenCalledTimes(1);
	});

	it('handles keyboard navigation for accessibility - Enter key for file', async () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: userChatWithFile,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const fileContainer = container.querySelector('.user-file-container');
		await fireEvent.keyDown(fileContainer!, { key: 'Enter' });

		expect(mockOpenFileViewer).toHaveBeenCalledTimes(1);
	});

	it('does not render attachments section when no attachments present', () => {
		const { container } = render(UserChatComponent, {
			props: {
				chat: basicUserChat,
				openImageViewer: mockOpenImageViewer,
				openFileViewer: mockOpenFileViewer
			}
		});

		const userImages = container.querySelector('.user-images');
		expect(userImages).toBeNull();
	});
});
