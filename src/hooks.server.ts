import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { handle as authHandler } from '$lib/auth/utils';

// Create a new handler for dark mode
const darkModeHandler: Handle = async ({ event, resolve }) => {
	// Get the color-scheme cookie
	const colorScheme = event.cookies.get('color-scheme') || 'light';

	event.locals.colorScheme = colorScheme;

	// Continue with the request
	const result = await resolve(event);

	return result;
};

const IPHandler: Handle = async ({ event, resolve }) => {
	// Extract client IP from X-Forwarded-For header
	const forwardedFor = event.request.headers.get('X-Forwarded-For');
	const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : 'Unknown';

	// Log the request with IP
	// console.log({
	// 	timestamp: new Date().toISOString(),
	// 	ip: clientIP,
	// 	url: event.url.pathname,
	// 	method: event.request.method
	// });

	// Continue with the request
	return await resolve(event);
};
// Export the sequence of handlers
export const handle = sequence(darkModeHandler, IPHandler, authHandler);
