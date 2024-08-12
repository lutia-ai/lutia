import DOMPurify from 'dompurify';
import { updateTokens } from '$lib/tokenizer.ts';

/**
 * Sanitizes HTML content by removing potentially unsafe tags and attributes.
 * @param {string} html - The HTML content to be sanitized.
 * @returns {string} The sanitized plain text.
 */
export function sanitizeHtml(html) {
	// Sanitize the HTML content
	let sanitizedHtml = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
		ALLOWED_ATTRS: ['href']
	});
	// Convert the sanitized HTML to plain text
	let tempDiv = document.createElement('div');
	tempDiv.innerHTML = sanitizedHtml;
	return tempDiv.textContent || tempDiv.innerText || '';
}


/**
 * Generates the full prompt including previous messages
 * @param {string} prompt - The current prompt.
 */
export function generateFullPrompt(prompt, currentHistory, numberPrevMessages) {
	if (numberPrevMessages === 0 || currentHistory.length === 0) return sanitizeHtml(prompt).trim();

	/**
	 * Extract and sanitize the previous messages from the chat history.
	 * @type {Array<{by: string, text: string}>}
	 */
	const prevMessages = currentHistory.slice(-numberPrevMessages * 2 - 1, -1).map(
		/** @param {{by: string, text: string}} message */
		({ by, text }) => ({ by, text: sanitizeHtml(text) })
	);

	const fullPrompt = {
		prevMessages,
		prompt: sanitizeHtml(prompt).trim()
	};

	return fullPrompt;
}