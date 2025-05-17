import { chatHistory } from '$lib/stores';
import type { Component } from '$lib/types/types';
import { isCodeComponent, isLlmChatComponent } from '$lib/types/typeGuards';

export function calculateTabWidth(code: string): number {
	const lines = code.split('\n');
	let tabWidth: number = 0;

	for (const line of lines) {
		const match = line.match(/^( *)/);
		if (match) {
			const leadingSpaces = match[0];
			const currentLevel = leadingSpaces.length;
			if (currentLevel !== 0) {
				tabWidth = currentLevel;
				break;
			}
		}
	}
	return tabWidth;
}

export function changeTabWidth(code: string, tabWidth: number = 4): string {
	const lines = code.split('\n');
	let originalIndentationLevel: number | null = null;

	const adjustedLines = lines.map((line) => {
		const match = line.match(/^( *)/);
		if (match) {
			const leadingSpaces = match[0];
			const currentLevel = leadingSpaces.length;

			// Initialize originalIndentationLevel if it's null and currentLevel is greater than 0
			if (currentLevel > 0 && originalIndentationLevel === null) {
				originalIndentationLevel = currentLevel;
			}

			// Ensure originalIndentationLevel is not null before performing division
			if (originalIndentationLevel !== null) {
				if (currentLevel === 0) {
					return line;
				} else {
					const indentationUnits = (currentLevel / originalIndentationLevel) * tabWidth;
					const newIndentation = ' '.repeat(indentationUnits);
					return newIndentation + line.trim();
				}
			}
		}

		// Return line as is if no match was found
		return line;
	});

	return adjustedLines.join('\n');
}

export function closeAllTabWidths(): void {
	chatHistory.update((history) => {
		return history.map((item) => {
			if (isLlmChatComponent(item)) {
				item.price_open = false;
				if (Array.isArray(item.components)) {
					item.components.forEach((component: Component) => {
						if (isCodeComponent(component)) {
							component.tabWidthOpen = false;
						}
					});
				}
			}
			return item;
		});
	});
}
