/**
 * Attachment Types
 * Types for file and image attachments used across the application
 */

export type Image = {
	type: 'image';
	data: string;
	media_type: string;
	width: number;
	height: number;
	ai?: boolean;
};

export type FileAttachment = {
	type: 'file';
	data: string;
	media_type: string;
	filename: string;
	file_extension: string;
	size: number;
};

export type Attachment = Image | FileAttachment;
