import DOMPurify from 'dompurify';
import type { Message, Image, Model } from '$lib/types';

export function sanitizeHtml(html: string): string {
	let sanitizedHtml = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
		ALLOWED_ATTR: ['href']
	});

	let tempDiv = document.createElement('div');
	tempDiv.innerHTML = sanitizedHtml;
	return tempDiv.textContent || tempDiv.innerText || '';
}

// export function generateFullPrompt(
// 	prompt: string,
// 	currentHistory: { by: string; text: string }[],
// 	numberPrevMessages: number,
// 	ignoreLastTwo: boolean = true,
//     isContextWindowAuto: boolean = false
// ): Message[] {
// 	const fullPrompt: Message[] = [];

// 	if (numberPrevMessages > 0 && currentHistory.length > 0) {
// 		let prevMessages;
// 		if (ignoreLastTwo) {
// 			prevMessages = currentHistory.slice(-(numberPrevMessages + 1) * 2, -2);
// 		} else {
// 			prevMessages = currentHistory.slice(-numberPrevMessages * 2);
// 		}

// 		for (const { by, text } of prevMessages) {
// 			fullPrompt.push({
// 				role: by === 'user' ? 'user' : 'assistant',
// 				content: sanitizeHtml(text).trim()
// 			});
// 		}
// 	}

// 	fullPrompt.push({ role: 'user', content: sanitizeHtml(prompt).trim() });

// 	return fullPrompt;
// }

export function generateFullPrompt(
	prompt: string,
	currentHistory: { by: string; text: string }[],
	numberPrevMessages: number,
	chosenModel: Model,
	ignoreLastTwo: boolean = true,
	isContextWindowAuto: boolean = false
): Message[] {
	const fullPrompt: Message[] = [];

	if (currentHistory.length > 0) {
		let prevMessages: { by: string; text: string }[] = [];

		// Automatic context window sizing based on token budget
		if (isContextWindowAuto) {
			const maxTokensPerRequest = chosenModel.max_input_per_request;
			const availableTokens = maxTokensPerRequest;

			// Simple token estimation function (replace with more accurate if available)
			const estimateTokens = (text: string) => Math.ceil(text.length / 4);

			// Determine starting point (respecting ignoreLastTwo flag)
			const startIndex = ignoreLastTwo
				? Math.max(0, currentHistory.length - 3)
				: Math.max(0, currentHistory.length - 1);

			// Work backwards through history until we hit token limit
			const messagesToInclude: { by: string; text: string }[] = [];
			let tokenCount = estimateTokens(prompt);

			for (let i = startIndex; i >= 0; i--) {
				const message = currentHistory[i];
				const messageTokens = estimateTokens(message.text);

				// Always add the previous message regardless of tokenCount
				// Stop if adding this message would exceed our token budget
				if (startIndex !== 0 && tokenCount + messageTokens > availableTokens) {
					break;
				}

				// Add message to our collection
				messagesToInclude.push(message);
				tokenCount += messageTokens;
			}

			// Reverse to maintain chronological order
			prevMessages = messagesToInclude.reverse();
		}
		// Original manual context window logic
		else if (numberPrevMessages > 0) {
			if (ignoreLastTwo) {
				prevMessages = currentHistory.slice(-(numberPrevMessages + 1) * 2, -2);
			} else {
				prevMessages = currentHistory.slice(-numberPrevMessages * 2);
			}
		}

		// Add selected messages to the prompt
		for (const { by, text } of prevMessages) {
			fullPrompt.push({
				role: by === 'user' ? 'user' : 'assistant',
				content: sanitizeHtml(text).trim()
			});
		}
	}

	// Add the current prompt
	fullPrompt.push({ role: 'user', content: sanitizeHtml(prompt).trim() });

	console.log('fullPrompt: ', fullPrompt);

	return fullPrompt;
}
