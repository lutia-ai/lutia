import { chatHistory } from '$lib/stores';
import type { ChatComponent } from '$lib/types/types';
import { isCodeComponent, isLlmChatComponent } from '$lib/types/typeGuards';

export function copyToClipboard(text: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (navigator.clipboard) {
			navigator.clipboard
				.writeText(text)
				.then(resolve)
				.catch((err) => {
					console.error('Failed to copy text:', err);
					reject(err);
				});
		} else {
			const textArea = document.createElement('textarea');
			textArea.value = text;
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand('copy');
				resolve();
			} catch (err) {
				console.error('Failed to copy text:', err);
				reject(err);
			} finally {
				document.body.removeChild(textArea);
			}
		}
	});
}

export function updateChatHistoryToCopiedState(chatIndex: number, componentIndex: number): void {
	chatHistory.update((history) => {
		const newHistory: ChatComponent[] = [...history];
		if (isLlmChatComponent(newHistory[chatIndex])) {
			if (isCodeComponent(newHistory[chatIndex].components[componentIndex])) {
				newHistory[chatIndex].components[componentIndex].copied = true;
			} else {
				newHistory[chatIndex].copied = true;
			}
		}
		return newHistory;
	});

	setTimeout(() => {
		chatHistory.update((history) => {
			const newHistory: ChatComponent[] = [...history];
			if (isLlmChatComponent(newHistory[chatIndex])) {
				if (isCodeComponent(newHistory[chatIndex].components[componentIndex])) {
					newHistory[chatIndex].components[componentIndex].copied = false;
				} else {
					newHistory[chatIndex].copied = false;
				}
			}
			return newHistory;
		});
	}, 3000);
}
