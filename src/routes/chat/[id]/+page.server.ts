import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from '../../$types';
import { retrieveApiRequestByMessageId } from '$lib/db/crud/apiRequest';
import { deleteAllUserMessagesWithoutAConversation } from '$lib/db/crud/message';
import { retrieveUserByEmail } from '$lib/db/crud/user';
import { retrieveUsersBalance, updateUserBalanceWithIncrement } from '$lib/db/crud/balance';
import {
	chargeUserCard,
	deleteUserCardDetails,
	getStripeCardDetails,
	saveUserCardDetails,
	getUserTransactionHistory
} from '$lib/services/stripe/stripeFunctions';
import { updateUserSettings } from '$lib/db/crud/userSettings';
import { type UserSettings } from '@prisma/client';
import {
	retrieveApiRequestsByConversationId,
	retrieveConversationById,
	verifyConversationOwnership,
	updateConversation,
	deleteConversation
} from '$lib/db/crud/conversation';
import type { UserWithSettings } from '$lib/types/types';
import { retrieveConversationsByUserIdPaginated } from '$lib/db/crud/conversation';

interface ChatParams {
	id: string;
}

// Define an interface for the parent data
interface ParentData {
	user: UserWithSettings;
	userImage: string | null;
}

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const session = await locals.auth();
	if (!session?.user?.email) {
		throw redirect(307, '/auth');
	}

	// Get parent data which includes the user
	const parentData = await parent();
	if ('user' in parentData && 'userImage' in parentData) {
		const { user, userImage } = parentData as ParentData;

		// Check if we have a valid conversation ID (not 'new')
		const { id: conversationId } = params as ChatParams;

		// For both Premium and PayAsYouGo users, allow loading specific conversations
		if (conversationId && conversationId !== 'new') {
			// Try to load the specific conversation
			const conversation = await retrieveConversationById(conversationId);

			// Verify this conversation belongs to the current user
			if (conversation && conversation.user_id === Number(session.user.id)) {
				// Return conversation-specific API requests
				return {
					user,
					userImage: session.user.image,
					apiRequests: retrieveApiRequestsByConversationId(conversationId, true),
					conversation
				};
			}
		}

		// For new conversations or invalid ID, return no messages
		return {
			user,
			userImage: session.user.image,
			apiRequests: []
		};
	} else {
		throw new Error('Invalid parent data structure');
	}
};

export const actions = {
	clearChatHistory: async ({ locals }) => {
		// Access the auth object from locals
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		await deleteAllUserMessagesWithoutAConversation(parseInt(userId!, 10));

		return { success: true };
	},
	getUsersBillingDetails: async ({ locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = session.user.id;

		let balance;
		let cardDetails;
		let transactions;
		try {
			const user = await retrieveUserByEmail(session.user.email!);
			balance = await retrieveUsersBalance(Number(userId));
			cardDetails = await getStripeCardDetails(user.stripe_id!);
			transactions = await getUserTransactionHistory(user.stripe_id!);
		} catch (err) {
			throw err;
		}

		return {
			balance,
			cardDetails,
			transactions
		};
	},
	getUsersConversations: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}
		const userId = Number(session.user.id);
		const formData = await request.formData();
		const page = Number(formData.get('page')) || 1;
		const pageSize = Number(formData.get('pageSize')) || 20;

		try {
			const user = await retrieveUserByEmail(session.user.email!);

			const { conversations, hasMore, total } = await retrieveConversationsByUserIdPaginated(
				userId,
				page,
				pageSize,
				user.payment_tier
			);

			return {
				type: 'success',
				data: {
					conversations,
					hasMore,
					total
				}
			};
		} catch (err) {
			console.error('Error fetching conversations:', err);
			return fail(500, { message: 'Failed to fetch conversations' });
		}
	},
	saveUsersCardDetails: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const formData = await request.formData();
			const tokenId = formData.get('token');

			if (typeof tokenId !== 'string') {
				throw new Error('Invalid token');
			}

			const user = await retrieveUserByEmail(session.user.email!);
			const customerId = user.stripe_id;

			if (!customerId) {
				throw new Error('Stripe customer ID not found');
			}

			const cardDetails = await saveUserCardDetails(customerId, tokenId);

			return {
				cardDetails
			};
		} catch (err) {
			console.error('Error saving card details:', err);
			return {
				type: 'failure',
				data: {
					message: err instanceof Error ? err.message : 'An unknown error occurred'
				}
			};
		}
	},
	deleteCardDetails: async ({ locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const user = await retrieveUserByEmail(session.user.email!);
			const customerId = user.stripe_id;

			if (!customerId) {
				throw new Error('Stripe customer ID not found');
			}

			await deleteUserCardDetails(customerId);

			return;
		} catch (err) {
			console.error('Error saving card details:', err);
			return {
				type: 'failure',
				data: {
					message: err instanceof Error ? err.message : 'An unknown error occurred'
				}
			};
		}
	},
	topupBalance: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const formData = await request.formData();
			const creditAmount = Number(formData.get('creditAmount'));
			const user = await retrieveUserByEmail(session.user.email!);
			const customerId = user.stripe_id;

			if (!customerId) {
				throw new Error('Stripe customer ID not found');
			}

			await chargeUserCard(customerId, creditAmount * 1.2); // add tax to creditAmount
			const balance = await updateUserBalanceWithIncrement(user.id, creditAmount);

			return {
				type: 'success',
				balance,
				message: 'Payment successful'
			};
		} catch (err) {
			return fail(400, {
				message: err instanceof Error ? err.message : 'An unknown error occurred'
			});
		}
	},
	saveUserSettings: async ({ request, locals }) => {
		const session = await locals.auth();

		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const formData = await request.formData();
			const user_settings_str = formData.get('user_settings');

			if (typeof user_settings_str !== 'string') {
				throw new Error('Invalid user_settings');
			}

			const user_settings: Partial<UserSettings> = JSON.parse(user_settings_str);
			const updatedSettings = await updateUserSettings(
				Number(session.user.id),
				user_settings
			);

			return {
				updatedSettings
			};
		} catch (err) {
			console.error('Error saving user settings:', err);
			return {
				type: 'failure',
				data: {
					message: err instanceof Error ? err.message : 'An unknown error occurred'
				}
			};
		}
	},
	// New action for updating conversation title
	updateConversationTitle: async ({ request, locals }) => {
		// Get the authenticated user
		const session = await locals.auth();
		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		const userId = Number(session.user.id);
		const formData = await request.formData();
		const conversationId = formData.get('conversationId') as string;
		const title = formData.get('title') as string;

		// Validate inputs
		if (!conversationId) {
			return fail(400, { message: 'Conversation ID is required' });
		}

		if (!title || title.trim() === '') {
			return fail(400, { message: 'Title cannot be empty' });
		}

		try {
			// Verify that the conversation belongs to this user
			const isOwner = await verifyConversationOwnership(conversationId, userId);
			if (!isOwner) {
				return fail(403, {
					message: 'You do not have permission to update this conversation'
				});
			}

			// Update the conversation
			const updatedConversation = await updateConversation(conversationId, {
				title: title.trim()
			});

			return {
				type: 'success',
				conversation: updatedConversation
			};
		} catch (error) {
			console.error('Error updating conversation title:', error);
			return fail(500, { message: 'Failed to update conversation title' });
		}
	},
	deleteConversation: async ({ request, locals }) => {
		// Get the authenticated user
		const session = await locals.auth();
		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		const userId = Number(session.user.id);
		const formData = await request.formData();
		const conversationId = formData.get('conversationId') as string;

		// Validate inputs
		if (!conversationId) {
			return fail(400, { message: 'Conversation ID is required' });
		}

		try {
			// Verify that the conversation belongs to this user
			const isOwner = await verifyConversationOwnership(conversationId, userId);
			if (!isOwner) {
				return fail(403, {
					message: 'You do not have permission to delete this conversation'
				});
			}

			// Delete the conversation
			await deleteConversation(conversationId);

			return {
				type: 'success',
				message: 'Conversation deleted successfully'
			};
		} catch (error) {
			console.error('Error deleting conversation:', error);
			return fail(500, { message: 'Failed to delete conversation' });
		}
	},
	fetchMessageAndApiRequest: async ({ request, locals }) => {
		// Get the authenticated user
		const session = await locals.auth();
		if (!session || !session.user) {
			throw redirect(307, '/auth');
		}

		try {
			const userId = Number(session.user.id);
			const formData = await request.formData();
			const messageId = Number(formData.get('messageId'));

			// Validate inputs
			if (!messageId) {
				return fail(400, { message: 'messageId is required' });
			}

			const apiRequestWithMessage = await retrieveApiRequestByMessageId(
				messageId,
				userId,
				true
			);
			return apiRequestWithMessage;
		} catch (error) {
			console.error('Error deleting conversation:', error);
			return fail(500, { message: 'Failed to delete conversation' });
		}
	},
	extractPdfText: async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get('file') as File;

			if (!file || !file.name.endsWith('.pdf')) {
				return fail(400, { message: 'Invalid or missing PDF file' });
			}

			// Import PDF extraction library
			const { PDFExtract } = await import('pdf.js-extract');
			const pdfExtract = new PDFExtract();

			// Convert file to buffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Extract text from PDF
			const data = await pdfExtract.extractBuffer(buffer, {});

			// Process each page with line break detection
			const extractedText = data.pages
				.map((page) => {
					// Sort content by y position (top to bottom) then x position (left to right)
					const sortedContent = [...page.content].sort((a, b) => {
						// Use a threshold to determine if items are on the same line
						const LINE_THRESHOLD = 2; // pixels
						if (Math.abs(a.y - b.y) <= LINE_THRESHOLD) {
							return a.x - b.x; // Same line, sort by x position
						}
						return a.y - b.y; // Different lines, sort by y position
					});

					let currentLine = -1;
					let lineText = '';
					const lines: string[] = [];

					// Group text by lines based on y-position
					sortedContent.forEach((item) => {
						if (currentLine === -1) {
							// First item
							currentLine = item.y;
							lineText = item.str;
						} else if (Math.abs(item.y - currentLine) <= 2) {
							// Same line - add space only if needed (avoid double spaces)
							if (lineText && item.str) {
								// Check if we need a space between words
								const lastChar = lineText[lineText.length - 1];
								const nextChar = item.str[0];
								const needsSpace = !(/\s$/.test(lineText) || /^\s/.test(item.str));

								lineText += needsSpace ? ' ' + item.str : item.str;
							} else {
								lineText += item.str;
							}
						} else {
							// New line
							lines.push(lineText);
							currentLine = item.y;
							lineText = item.str;
						}
					});

					// Add the last line
					if (lineText) {
						lines.push(lineText);
					}

					return lines.join('\n');
				})
				.join('\n\n'); // Double newline between pages

			return {
				success: true,
				extractedText
			};
		} catch (error) {
			console.error('Error extracting PDF text:', error);
			return fail(500, {
				message: error instanceof Error ? error.message : 'PDF extraction failed'
			});
		}
	},
	extractOfficeText: async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get('file') as File;

			if (!file) {
				return fail(400, { message: 'Invalid or missing file' });
			}

			const filename = file.name;
			const extension = filename.split('.').pop()?.toLowerCase();

			// Convert file to buffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			let extractedText = '';

			// Process based on file type
			if (['doc', 'docx'].includes(extension || '')) {
				// Word documents
				const mammoth = await import('mammoth');
				const result = await mammoth.extractRawText({ buffer });
				extractedText = result.value;
			} else if (['xls', 'xlsx'].includes(extension || '')) {
				// Excel spreadsheets
				const XLSX = await import('xlsx');
				const workbook = XLSX.read(buffer);

				// Extract text from all sheets
				extractedText = Object.keys(workbook.Sheets)
					.map((sheetName) => {
						const sheet = workbook.Sheets[sheetName];
						// Convert sheet to JSON and then to text
						const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

						// Create a header with sheet name
						let sheetText = `## ${sheetName} ##\n\n`;

						// Convert JSON data to readable text
						if (jsonData.length > 0) {
							// Get columns from first row
							const columns = Object.keys(jsonData[0] as object);

							// Add data rows
							jsonData.forEach((row) => {
								const typedRow = row as Record<string, unknown>;
								columns.forEach((col) => {
									const cellValue = typedRow[col];
									if (cellValue !== undefined) {
										sheetText += `${col}: ${cellValue}\n`;
									}
								});
								sheetText += '\n'; // Add line between rows
							});
						}

						return sheetText;
					})
					.join('\n---\n\n'); // Separator between sheets
			} else if (['ppt', 'pptx'].includes(extension || '')) {
				// Handle PowerPoint files - limited support
				extractedText = `[Limited text extraction for PowerPoint: ${filename}]`;
			} else {
				return fail(400, { message: 'Unsupported file type' });
			}

			return {
				success: true,
				extractedText
			};
		} catch (error) {
			console.error('Error extracting Office document text:', error);
			return fail(500, {
				message:
					error instanceof Error ? error.message : 'Office document extraction failed'
			});
		}
	}
} satisfies Actions;
