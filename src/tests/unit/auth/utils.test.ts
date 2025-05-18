/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	verifyCredentials,
	generateLinkingToken,
	generateRandomSixDigitNumber
} from '$lib/auth/utils';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import type { User } from '@prisma/client';

// Mock dependencies
vi.mock('bcryptjs', () => ({
	default: {
		compare: vi.fn()
	}
}));

vi.mock('crypto', () => ({
	default: {
		randomBytes: vi.fn()
	}
}));

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

// Mock any other dependencies that might be imported by $lib/auth/utils
vi.mock('$env/dynamic/private', () => ({
	env: {
		SECRET_GOOGLE_CLIENT_ID: 'mock-client-id',
		SECRET_GOOGLE_CLIENT_SECRET: 'mock-client-secret',
		SECRET_AUTH: 'mock-auth-secret'
	}
}));

vi.mock('@auth/sveltekit', () => ({
	SvelteKitAuth: vi.fn(() => ({
		handle: 'mockHandle',
		signIn: 'mockSignIn',
		signOut: 'mockSignOut'
	}))
}));

vi.mock('$lib/db/crud/user', () => ({
	retrieveUserByEmail: vi.fn(),
	createUser: vi.fn(),
	updateUser: vi.fn()
}));

vi.mock('$lib/services/email', () => ({
	sendEmail: vi.fn(),
	verifyEmailBody: vi.fn()
}));

describe('Auth Utils', () => {
	describe('verifyCredentials', () => {
		const mockUser = {
			id: 1,
			email: 'test@example.com',
			password_hash: 'hashed_password'
		} as User;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return true when credentials are valid', async () => {
			// Mock bcrypt compare to return true
			(bcryptjs.compare as any).mockResolvedValue(true);

			const result = await verifyCredentials(
				mockUser,
				'test@example.com',
				'correct_password'
			);

			expect(result).toBe(true);
			expect(bcryptjs.compare).toHaveBeenCalledWith('correct_password', 'hashed_password');
		});

		it('should return false when password is invalid', async () => {
			// Mock bcrypt compare to return false
			(bcryptjs.compare as any).mockResolvedValue(false);

			const result = await verifyCredentials(mockUser, 'test@example.com', 'wrong_password');

			expect(result).toBe(false);
			expect(bcryptjs.compare).toHaveBeenCalledWith('wrong_password', 'hashed_password');
		});

		it('should return false when user has no password_hash', async () => {
			const userWithNoHash = {
				...mockUser,
				password_hash: null
			} as User;

			const result = await verifyCredentials(
				userWithNoHash,
				'test@example.com',
				'any_password'
			);

			expect(result).toBe(false);
			expect(bcryptjs.compare).not.toHaveBeenCalled();
		});

		it('should throw error when bcrypt comparison fails', async () => {
			// Mock bcrypt compare to throw error
			const mockError = new Error('Bcrypt error');
			(bcryptjs.compare as any).mockRejectedValue(mockError);

			await expect(
				verifyCredentials(mockUser, 'test@example.com', 'any_password')
			).rejects.toThrow(mockError);
		});
	});

	describe('generateLinkingToken', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should generate a hex string token from random bytes', () => {
			// Mock crypto randomBytes to return a Buffer
			const mockBuffer = Buffer.from('0123456789abcdef0123456789abcdef');
			(crypto.randomBytes as any).mockReturnValue(mockBuffer);

			const token = generateLinkingToken();

			expect(crypto.randomBytes).toHaveBeenCalledWith(32);
			expect(token).toBe(mockBuffer.toString('hex'));
			expect(token.length).toBe(64); // 32 bytes as hex = 64 characters
		});
	});

	describe('generateRandomSixDigitNumber', () => {
		beforeEach(() => {
			// Mock Math.random to return a predictable value
			vi.spyOn(Math, 'random').mockReturnValue(0.5);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should generate a random 6-digit number', () => {
			const number = generateRandomSixDigitNumber();

			// With Math.random = 0.5, we expect:
			// Math.floor(0.5 * (999999 - 100000 + 1)) + 100000 = 550000
			expect(number).toBe(550000);

			// Verify it's a 6-digit number
			expect(number.toString().length).toBe(6);
			expect(number).toBeGreaterThanOrEqual(100000);
			expect(number).toBeLessThanOrEqual(999999);
		});

		it('should generate different values with different random values', () => {
			// First call with Math.random = 0.5
			const number1 = generateRandomSixDigitNumber();
			expect(number1).toBe(550000);

			// Second call with Math.random = 0.75
			vi.spyOn(Math, 'random').mockReturnValue(0.75);
			const number2 = generateRandomSixDigitNumber();
			expect(number2).toBe(775000);

			// Third call with Math.random = 0.1
			vi.spyOn(Math, 'random').mockReturnValue(0.1);
			const number3 = generateRandomSixDigitNumber();
			expect(number3).toBe(190000);
		});
	});
});
