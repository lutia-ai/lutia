import { error } from '@sveltejs/kit';
// @ts-ignore
import LlamaAI from 'llamaai';


// Fetch the API key or other necessary credentials
const llamaAPISecretKey = process.env.VITE_LLAMA_API_KEY || import.meta.env.VITE_LLAMA_API_KEY;
const llamaAPI = new LlamaAI(llamaAPISecretKey);

export async function POST({ request, locals }) { 
    let session = await locals.getSession();
    if (!session) {
        throw error(401, 'Forbidden');
    }
    try {
        const { prompt, model } = await request.json();
        const apiRequestJson = {
            "model": model,
            "messages": [{ "role": "user", "content": prompt }],
            "stream": true, 
        };

        const stream = await llamaAPI.run(apiRequestJson);
        const readableStream = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || ''; // adjust based on actual response structure
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