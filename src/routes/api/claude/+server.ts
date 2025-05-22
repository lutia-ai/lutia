import { redirect } from '@sveltejs/kit';
import { ApiProvider } from '@prisma/client';

export async function POST({ request, locals }) {
	// Redirect all requests to the unified endpoint
	const requestBody = await request.json();

	// Inject the provider into the request body
	requestBody.provider = ApiProvider.anthropic;

	// Create a new request with the modified body
	const newRequest = new Request(new URL('/api/llm', request.url).toString(), {
		method: 'POST',
		headers: request.headers,
		body: JSON.stringify(requestBody)
	});

	// Forward the request to the unified endpoint
	return fetch(newRequest);
}
