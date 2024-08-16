import DOMPurify from 'dompurify';
import type { FullPrompt } from '$lib/types';

export function sanitizeHtml(html: string): string {
	let sanitizedHtml = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
		ALLOWED_ATTR: ['href']
	});

	let tempDiv = document.createElement('div');
	tempDiv.innerHTML = sanitizedHtml;
	return tempDiv.textContent || tempDiv.innerText || '';
}

export function generateFullPrompt(
	prompt: string,
	currentHistory: { by: string; text: string }[],
	numberPrevMessages: number
): FullPrompt {
	if (numberPrevMessages === 0 || currentHistory.length === 0) {
		return {
			prevMessages: [],
			prompt: sanitizeHtml(prompt).trim()
		};
	}

	const prevMessages = currentHistory
		.slice(-numberPrevMessages * 2, -1)
		.map(({ by, text }) => ({ by, text: sanitizeHtml(text) }));

	const fullPrompt: FullPrompt = {
		prevMessages,
		prompt: sanitizeHtml(prompt).trim()
	};

	return fullPrompt;
}
