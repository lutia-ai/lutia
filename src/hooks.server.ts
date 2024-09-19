import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { handle as authHandler } from '$lib/auth/utils';
import { PrismaClient } from '@prisma/client';
import { env } from '$env/dynamic/private';

// Create a new handler for dark mode
const darkModeHandler: Handle = async ({ event, resolve }) => {
	// Get the color-scheme cookie
	const colorScheme = event.cookies.get('color-scheme') || 'light';

	event.locals.colorScheme = colorScheme;

	// Continue with the request
	const result = await resolve(event);

	return result;
};

// Create a new handler for Prisma
const prismaHandler: Handle = async ({ event, resolve }) => {
	const prisma = new PrismaClient({
		datasources: {
			db: {
				url: env.DATABASE_URL
			}
		}
	});

	// Make Prisma client available in event.locals
	event.locals.prisma = prisma;

	// Continue with the request
	const response = await resolve(event);

	// Disconnect Prisma client after the request is complete
	await prisma.$disconnect();

	return response;
};

// Export the sequence of handlers
export const handle = sequence(darkModeHandler, prismaHandler, authHandler);
