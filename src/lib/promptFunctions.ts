import DOMPurify from 'dompurify';
import type { Message, Image } from '$lib/types';

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
	numberPrevMessages: number,
	ignoreLastTwo: boolean = true
): Message[] {
	const fullPrompt: Message[] = [];

	if (numberPrevMessages > 0 && currentHistory.length > 0) {
		let prevMessages;
		if (ignoreLastTwo) {
			prevMessages = currentHistory.slice(-(numberPrevMessages + 1) * 2, -2);
		} else {
			prevMessages = currentHistory.slice(-numberPrevMessages * 2);
		}

		for (const { by, text } of prevMessages) {
			fullPrompt.push({
				role: by === 'user' ? 'user' : 'assistant',
				content: sanitizeHtml(text).trim()
			});
		}
	}

	fullPrompt.push({ role: 'user', content: sanitizeHtml(prompt).trim() });

	return fullPrompt;
}
