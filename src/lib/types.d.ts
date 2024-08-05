export type ChatComponent = {
	type: string; // The type of the component (e.g., 'text')
	text?: string; // The text content of the component (if applicable)
	language?: string; // The programming language (if applicable)
	content?: string; // The text content (if applicable)
	code?: string; // The code (if applicable)
	copied?: boolean; // Whether the component has been copied
};

export type ChatMessage = {
	by: string; // The sender of the message (e.g., 'user', 'claude', 'gpt', 'gemini')
	text?: string; // The text content of the message (if it's a simple message)
	components?: ChatComponent[]; // Array of components for more complex messages
};
