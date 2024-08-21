import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import type {
    Message,
    Model,
    Image,
    ChatGPTImage
} from '$lib/types';

const openAISecretKey = process.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: openAISecretKey });

export async function POST({ request, locals }) {
	let session = await locals.getSession();
	if (!session) {
		throw error(401, 'Forbidden');
	}

	try {
		const { promptStr, modelStr, imagesStr } = await request.json();

        const model: Model = JSON.parse(modelStr);

        let messages: Message[] = JSON.parse(promptStr);

        const images: Image[] = JSON.parse(imagesStr);

        let gptImages: ChatGPTImage[] = [];

        if (images.length > 0) {
            const textObject = {
                type: "text",
                text: messages[messages.length-1].content
            }
            gptImages = images.map(image => ({
                type: "image_url",
                image_url: {
                    url: image.data,
                }
            }));
            messages[messages.length-1].content = [textObject, ...gptImages];
        }

		const stream = await openai.chat.completions.create({
			model: model.param,
            // @ts-ignore
			messages: messages,
			stream: true
		});

        console.log(stream);

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
