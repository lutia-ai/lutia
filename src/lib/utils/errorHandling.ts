function logDetailedError({
	msg,
	userId,
	userEmail,
	requestData,
	error
}: {
	msg: string;
	userId: string;
	userEmail: string;
	requestData: Record<string, any>;
	error: any;
}) {
	console.error(msg, {
		userId,
		userEmail,
		requestData,
		error: error instanceof Error ? error.stack : String(error)
	});
}

/**
 * Standard error handler for LLM operations
 * @param error The error that occurred
 * @param context Additional context about where the error occurred
 */
export function handleLLMError(error: any, context: string = 'LLM Operation'): void {
	console.error(`[${context}] Error:`, error);
}

/**
 * Standard error messages for common LLM errors
 */
export const LLM_ERROR_MESSAGES = {
	INSUFFICIENT_BALANCE: "Spending can't go below $0.10",
	NETWORK_ERROR: 'Network error occurred. Please check your connection and try again.',
	GENERATION_ERROR: 'An error occurred while generating a response. Please try again.',
	VALIDATION_ERROR: 'Invalid request. Please check your input and try again.',
	UNKNOWN_ERROR: 'An unknown error occurred'
} as const;

/**
 * Extract user-friendly error message from error object
 * @param error Error object or string
 * @returns User-friendly error message
 */
export function extractErrorMessage(error: any): string {
	if (typeof error === 'string') {
		return error;
	}

	if (error?.message === 'Insufficient balance') {
		return LLM_ERROR_MESSAGES.INSUFFICIENT_BALANCE;
	}

	return error?.message || LLM_ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Chat history error state manager
 */
export class ChatHistoryErrorManager {
	/**
	 * Set error state for a specific message
	 * @param updateFn Chat history update function
	 * @param messageIndex Index of the message to update
	 * @param errorMessage Error message to display
	 */
	static setMessageError(
		updateFn: (updater: (history: any[]) => any[]) => void,
		messageIndex: number,
		errorMessage: string
	): void {
		updateFn((history) => {
			const newHistory = [...history];
			if (newHistory[messageIndex]) {
				newHistory[messageIndex] = {
					...newHistory[messageIndex],
					text: errorMessage,
					loading: false,
					error: true
				};
			}
			return newHistory;
		});
	}

	/**
	 * Remove recent messages from chat history (useful for error cleanup)
	 * @param updateFn Chat history update function
	 * @param count Number of messages to remove from the end
	 */
	static removeRecentMessages(
		updateFn: (updater: (history: any[]) => any[]) => void,
		count: number = 2
	): void {
		updateFn((history) => history.slice(0, -count));
	}

	/**
	 * Restore message to previous state
	 * @param updateFn Chat history update function
	 * @param messageId Message ID to restore
	 * @param originalState Original message state
	 */
	static restoreMessage(
		updateFn: (updater: (history: any[]) => any[]) => void,
		messageId: number,
		originalState: any
	): void {
		updateFn((history) => {
			return history.map((msg) => {
				if (msg.message_id === messageId) {
					return {
						...originalState,
						loading: false
					};
				}
				return msg;
			});
		});
	}
}

/**
 * Notification wrapper for consistent error reporting
 */
export class ErrorNotificationManager {
	/**
	 * Show error notification
	 * @param notificationHandler Notification function
	 * @param error Error object or message
	 * @param title Optional title for the notification
	 */
	static showError(
		notificationHandler: (
			title: string,
			message: string,
			duration: number,
			type: string
		) => void,
		error: any,
		title: string = 'Error'
	): void {
		const errorMessage = extractErrorMessage(error);
		notificationHandler(title, errorMessage, 5000, 'error');
	}

	/**
	 * Show popup error
	 * @param popupHandler Popup function
	 * @param error Error object or message
	 * @param subText Optional subtitle
	 */
	static showPopupError(
		popupHandler: (
			message: string,
			subText: string | null,
			duration: number,
			type: string
		) => void,
		error: any,
		subText: string | null = null
	): void {
		const errorMessage = extractErrorMessage(error);
		popupHandler(errorMessage, subText, 5000, 'error');
	}
}
