/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyRecaptcha } from '$lib/auth/recaptcha';

// Mock the env module
vi.mock('$env/dynamic/private', () => ({
	env: {
		SECRET_RECAPTCHA_KEY: 'test-recaptcha-key'
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

describe('Recaptcha Verification', () => {
	// Mock fetch globally
	const originalFetch = global.fetch;
	let mockFetch: any;

	beforeEach(() => {
		// Create a mock fetch implementation
		mockFetch = vi.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		// Restore the original fetch
		global.fetch = originalFetch;
		vi.clearAllMocks();
	});

	it('should return false when token is empty', async () => {
		const result = await verifyRecaptcha('');
		expect(result).toBe(false);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should return true when recaptcha verification succeeds', async () => {
		// Mock successful response
		mockFetch.mockResolvedValueOnce({
			json: async () => ({ success: true })
		});

		const result = await verifyRecaptcha('valid-token');

		expect(result).toBe(true);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith('https://www.google.com/recaptcha/api/siteverify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: expect.any(URLSearchParams)
		});

		// Verify the URLSearchParams contains the right data
		const calledWith = mockFetch.mock.calls[0][1];
		const bodyParams = new URLSearchParams(calledWith.body);
		expect(bodyParams.get('secret')).toBe('test-recaptcha-key');
		expect(bodyParams.get('response')).toBe('valid-token');
	});

	it('should return false when recaptcha verification fails', async () => {
		// Mock failed response
		mockFetch.mockResolvedValueOnce({
			json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] })
		});

		const result = await verifyRecaptcha('invalid-token');

		expect(result).toBe(false);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('should return false when fetch throws an error', async () => {
		// Mock fetch error
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		// Mock console.error to avoid polluting test output
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await verifyRecaptcha('error-token');

		expect(result).toBe(false);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'reCAPTCHA verification error:',
			expect.any(Error)
		);

		consoleErrorSpy.mockRestore();
	});
});
