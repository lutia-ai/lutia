/**
 * LLM Tool Types
 * Types related to LLM tool usage (web search, etc.)
 */

export type WebSearchResult = {
	type: string;
	title: string;
	url: string;
	page_age: string | null;
	hasContent: boolean;
};

export type WebSearchData = {
	results: WebSearchResult[];
	totalResults: number;
};

export type ToolData = WebSearchData | any; // Allow for future tool types

export type ToolUseCallback = (toolName: string, toolData: ToolData) => void;
