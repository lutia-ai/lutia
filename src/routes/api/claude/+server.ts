import { error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import type {
    FullPrompt,
    ChatCompletionMessageParam
} from '$lib/types';

const anthropicSecretKey =
	process.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;

const client = new Anthropic({ apiKey: anthropicSecretKey });

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

		const stream = await client.messages.stream({
			messages: messages,
			model: model,
			max_tokens: 1024
		});

		const readableStream = new ReadableStream({
			async start(controller) {
				for await (const chunk of stream) {
					if (
						chunk.type === 'content_block_start' ||
						chunk.type === 'content_block_delta'
					) {
						const content = (chunk as any).delta?.text || '';
						if (content) {
							controller.enqueue(new TextEncoder().encode(content));
						}
					} else if (chunk.type === 'message_stop') {
						break;
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
