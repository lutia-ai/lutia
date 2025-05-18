/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SvelteKitAuth } from '@auth/sveltekit';
import { verifyCredentials, generateRandomSixDigitNumber } from '$lib/auth/utils';
import { retrieveUserByEmail, createUser, updateUser } from '$lib/db/crud/user';
import { UserNotFoundError } from '$lib/types/customErrors';
import { sendEmail } from '$lib/services/email';

// Mock all dependencies
vi.mock('@auth/sveltekit', () => ({
	SvelteKitAuth: vi.fn((callback: Function) => ({
		handle: 'mockHandle',
		signIn: 'mockSignIn',
		signOut: 'mockSignOut'
	}))
}));

vi.mock('$lib/auth/utils', () => ({
	verifyCredentials: vi.fn(),
	generateRandomSixDigitNumber: vi.fn(),
	generateLinkingToken: vi.fn()
}));

vi.mock('$lib/db/crud/user', () => ({
	retrieveUserByEmail: vi.fn(),
	createUser: vi.fn(),
	updateUser: vi.fn()
}));

vi.mock('$lib/services/email', () => ({
	sendEmail: vi.fn(),
	verifyEmailBody: vi.fn().mockReturnValue('mock-email-body')
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		SECRET_GOOGLE_CLIENT_ID: 'mock-client-id',
		SECRET_GOOGLE_CLIENT_SECRET: 'mock-client-secret',
		SECRET_AUTH: 'mock-auth-secret'
	}
}));

// Add this mock before the describe block
// Mock node-mailjet to prevent ReferenceError: define is not defined
vi.mock('node-mailjet', () => ({
	default: {
		connect: vi.fn().mockReturnValue({
			post: vi.fn().mockReturnValue({
				request: vi.fn().mockResolvedValue({})
			})
		})
	}
}));

// Global requestBody variable for testing
let requestBody: any;

describe('Auth Handlers', () => {
	describe('SvelteKitAuth Configuration', () => {
		// We'll need to import the module in the test to re-evaluate it with our mocks
		let authModule: any;

		beforeEach(async () => {
			vi.clearAllMocks();

			// Reset and reimport the module for each test
			vi.resetModules();
			authModule = await import('$lib/auth/utils');
		});

		it.todo('should initialize SvelteKitAuth with the correct configuration');
	});

	describe('Credentials Provider Authorization', () => {
		// We'll test the Credentials provider's authorize function
		let authorizeFunction: any;

		beforeEach(async () => {
			vi.clearAllMocks();

			// Reset modules and extract the credential provider's authorize function
			vi.resetModules();
		});

		it.todo('should return null when email is not provided');
		it.todo('should return null when password is not provided');
		it.todo('should return null when user is not found');
		it.todo('should return null when credentials are invalid');
		it.todo('should return user data when credentials are valid and email is verified');
		it.todo(
			'should send verification email when credentials are valid but email is not verified'
		);
		it.todo('should rethrow errors other than UserNotFoundError');
	});

	describe('Google OAuth Provider', () => {
		let signInCallback: any;

		beforeEach(async () => {
			vi.clearAllMocks();

			// Reset modules
			vi.resetModules();

			// Reset requestBody before each test
			requestBody = undefined;
		});

		it.todo('should create a new user when using Google OAuth for the first time');
		it.todo('should sign in an existing Google OAuth user');
		it.todo('should handle account linking with a valid token');
		it.todo('should reject account linking with an invalid token');
		it.todo('should prevent linking existing OAuth accounts');
	});
});
