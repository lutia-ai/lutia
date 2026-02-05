import type { Folder } from '@prisma/client';
import prisma from '$lib/db/prisma';
import { requireFolderOwnership } from '$lib/utils/authorization';

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
 * @param folderId - The ID of the folder to retrieve
 * @param userId - Optional user ID to filter by ownership (recommended for security)
 * @returns The folder if found (and owned by user if userId provided), or null
 */
export async function retrieveFolderById(
	folderId: number,
	userId?: number
): Promise<Folder | null> {
	try {
		const whereCondition: any = { id: folderId };

		// If userId is provided, also filter by user_id for ownership verification
		if (userId !== undefined) {
			whereCondition.user_id = userId;
		}

		const folder = await prisma.folder.findFirst({
			where: whereCondition,
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
 * Update a folder after verifying ownership
 * @param folderId - The ID of the folder to update
 * @param data - The data to update on the folder
 * @param userId - Optional user ID; if provided, ownership is verified before updating
 * @returns The updated folder
 * @throws {AuthorizationError} If userId is provided and the user does not own the folder
 * @throws {ResourceNotFoundError} If the folder does not exist
 */
export async function updateFolder(
	folderId: number,
	data: { name?: string; parentId?: number | null },
	userId?: number
): Promise<Folder> {
	try {
		// Verify ownership if userId is provided
		if (userId !== undefined) {
			await requireFolderOwnership(folderId, userId);
		}

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
 * Delete a folder after verifying ownership
 * @param folderId - The ID of the folder to delete
 * @param userId - Optional user ID; if provided, ownership is verified before deleting
 * @throws {AuthorizationError} If userId is provided and the user does not own the folder
 * @throws {ResourceNotFoundError} If the folder does not exist
 */
export async function deleteFolder(folderId: number, userId?: number): Promise<void> {
	try {
		// Verify ownership if userId is provided
		if (userId !== undefined) {
			await requireFolderOwnership(folderId, userId);
		}

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
