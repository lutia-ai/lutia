import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type {
    FullPrompt,
    ChatCompletionMessageParam
} from '$lib/types';

const openAISecretKey = process.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: openAISecretKey });

export async function POST({ request, locals }) {
	let session = await locals.getSession();
	if (!session) {
		throw error(401, 'Forbidden');
	}

	try {
		const { prompt, model } = await request.json();

        const parsedPrompt: FullPrompt = JSON.parse(prompt);

        const messages: ChatCompletionMessageParam[] = [];

        if (parsedPrompt.prevMessages) {
            parsedPrompt.prevMessages.forEach((message) => {
                messages.push({
                    role: message.by === 'user' ? 'user' : 'assistant',
                    content: message.text
                });
            })
        }

        messages.push({
            role: 'user',
            content: parsedPrompt.prompt
        });

		const stream = await openai.chat.completions.create({
			model: model,
			messages: messages,
			stream: true
		});

		const readableStream = new ReadableStream({
			async start(controller) {
				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content || '';
					if (content) {
						controller.enqueue(new TextEncoder().encode(`${content}`));
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
