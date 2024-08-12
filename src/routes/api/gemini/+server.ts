import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';

const googleSecretKey =
	process.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(googleSecretKey);

export async function POST({ request, locals }) {
	let session = await locals.getSession();
	if(!session) {
	    throw error(401, "Forbidden");
	}

	try {
		const { prompt, model } = await request.json();

		const genAIModel = genAI.getGenerativeModel({ model: model });

		const result = await genAIModel.generateContentStream(prompt);

		const readableStream = new ReadableStream({
			async start(controller) {
				for await (const chunk of result.stream) {
					const content = (chunk as any).candidates[0].content.parts[0].text;
					if (content) {
						controller.enqueue(new TextEncoder().encode(content));
					}
				}
				controller.close();
			}
		});

		return new Response(readableStream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (err) {
		console.error('Error:', err);
		throw error(500, 'An error occurred while processing your request');
	}
}
