import type { Folder } from '@prisma/client';
import prisma from '$lib/db/prisma';

/**
 * Create a new folder for a user
 */
export async function createFolder(
	userId: number,
	name: string,
	parentId?: number
): Promise<Folder> {
	try {
		const folder = await prisma.folder.create({
			data: {
				name,
				user_id: userId,
				parent_id: parentId || null
			}
		});

		return folder;
	} catch (error) {
		console.error('Error creating folder:', error);
		throw error;
	}
}

/**
 * Retrieve all folders for a user
 */
export async function retrieveFoldersByUserId(userId: number): Promise<Folder[]> {
	try {
		const folders = await prisma.folder.findMany({
			where: {
				user_id: userId
			},
			include: {
				subfolders: true
			}
		});

		return folders;
	} catch (error) {
		console.error('Error retrieving folders for user:', error);
		throw error;
	}
}

/**
 * Retrieve a specific folder by ID
 */
export async function retrieveFolderById(folderId: number): Promise<Folder | null> {
	try {
		const folder = await prisma.folder.findUnique({
			where: {
				id: folderId
			},
			include: {
				subfolders: true,
				conversations: true
			}
		});

		return folder;
	} catch (error) {
		console.error('Error retrieving folder by ID:', error);
		throw error;
	}
}

/**
 * Update a folder
 */
export async function updateFolder(
	folderId: number,
	data: { name?: string; parentId?: number | null }
): Promise<Folder> {
	try {
		const folder = await prisma.folder.update({
			where: {
				id: folderId
			},
			data: {
				name: data.name,
				parent_id: data.parentId
			}
		});

		return folder;
	} catch (error) {
		console.error('Error updating folder:', error);
		throw error;
	}
}

/**
 * Delete a folder
 */
export async function deleteFolder(folderId: number): Promise<void> {
	try {
		await prisma.folder.delete({
			where: {
				id: folderId
			}
		});
	} catch (error) {
		console.error('Error deleting folder:', error);
		throw error;
	}
}

/**
 * Verify folder belongs to user
 */
export async function verifyFolderOwnership(folderId: number, userId: number): Promise<boolean> {
	try {
		const folder = await prisma.folder.findUnique({
			where: {
				id: folderId
			}
		});

		return folder !== null && folder.user_id === userId;
	} catch (error) {
		console.error('Error verifying folder ownership:', error);
		throw error;
	}
}
