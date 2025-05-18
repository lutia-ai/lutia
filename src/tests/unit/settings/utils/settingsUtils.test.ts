/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveUserSettings } from '$lib/components/settings/utils/settingsUtils';
import { deserialize } from '$app/forms';

// Mock the deserialize function
vi.mock('$app/forms', () => ({
	deserialize: vi.fn()
}));

describe('Settings Utils', () => {
	let fetchMock: any;
	let formDataAppendMock: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock FormData.append
		formDataAppendMock = vi.fn();
		global.FormData = vi.fn().mockImplementation(() => ({
			append: formDataAppendMock
		}));

		// Mock fetch
		fetchMock = vi.fn().mockResolvedValue({
			text: vi.fn().mockResolvedValue('success')
		});
		global.fetch = fetchMock;

		// Default deserialize mock implementation
		(deserialize as any).mockReturnValue({
			type: 'success',
			data: { updated: true }
		});
	});

	/**
	 * Test successful settings save
	 */
	it('should call fetch with correct parameters', async () => {
		// Test settings object
		const testSettings = {
			company_menu_open: true,
			prompt_pricing_visible: false,
			show_context_window_button: true,
			context_window: 2000
		};

		await saveUserSettings(testSettings);

		// Verify FormData was created with correct values
		expect(formDataAppendMock).toHaveBeenCalledWith(
			'user_settings',
			JSON.stringify(testSettings)
		);

		// Verify fetch was called with correct parameters
		expect(fetchMock).toHaveBeenCalledWith('?/saveUserSettings', {
			method: 'POST',
			body: expect.any(Object)
		});
	});

	/**
	 * Test error handling for API failure
	 */
	it('should handle API failure gracefully', async () => {
		// Mock console.error
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock failure response
		(deserialize as any).mockReturnValue({
			type: 'failure',
			data: { message: 'Error saving settings' }
		});

		// Test settings object
		const testSettings = { company_menu_open: true };

		await saveUserSettings(testSettings);

		// Verify error was logged
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save user settings');

		// Restore console.error
		consoleErrorSpy.mockRestore();
	});

	/**
	 * Test error handling for network/fetch errors
	 */
	it('should handle network errors gracefully', async () => {
		// Mock console.error
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock fetch failure
		fetchMock.mockRejectedValueOnce(new Error('Network error'));

		// Test settings object
		const testSettings = { company_menu_open: true };

		await saveUserSettings(testSettings);

		// Verify error was logged
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save user settings');

		// Restore console.error
		consoleErrorSpy.mockRestore();
	});
});
