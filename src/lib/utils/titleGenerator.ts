import { env } from '$env/dynamic/private';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generates a conversation title based on the user's prompt using Gemini
 * @param prompt The user's prompt to generate a title from
 * @returns A generated title string
 */
export async function generateConversationTitle(prompt: string): Promise<string> {
	try {
		const genAI = new GoogleGenerativeAI(env.VITE_GOOGLE_GEMINI_API_KEY);
		const genAIModel = genAI.getGenerativeModel({
			model: 'gemini-2.0-flash-lite-preview-02-05'
		});

		const titlePrompt = `Generate a short, concise title (maximum 5 words) for a conversation that starts with this message: "${prompt}". 
        Return ONLY the title text with no quotes or additional explanation.`;

		const result = await genAIModel.generateContent(titlePrompt);
		const response = await result.response;
		const text = response.text();

		if (text) {
			// Clean up the title - remove quotes and limit length
			let title = text.trim();
			title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes if present

			// Fallback if title generation fails
			if (!title || title.length < 2) {
				return 'New Chat';
			}

			return title;
		}

		return 'New Chat';
	} catch (error) {
		console.error('Error generating conversation title:', error);
		return 'New Chat';
	}
}
