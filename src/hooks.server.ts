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

// Export the sequence of handlers
export const handle = sequence(darkModeHandler, authHandler);
