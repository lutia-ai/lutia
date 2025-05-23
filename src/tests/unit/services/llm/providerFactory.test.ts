/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiProvider } from '@prisma/client';
import { LLMProviderFactoryImpl } from '$lib/services/llm/providerFactory';
import { OpenAIProvider } from '$lib/services/llm/openAIProvider';
import { ClaudeProvider } from '$lib/services/llm/claudeProvider';
import { GeminiProvider } from '$lib/services/llm/geminiProvider';
import { DeepSeekProvider } from '$lib/services/llm/deepSeekProvider';
import { XAIProvider } from '$lib/services/llm/xAIProvider';
import { LlamaProvider } from '$lib/services/llm/llamaProvider';

// Mock the provider classes
vi.mock('$lib/services/llm/openAIProvider', () => ({
	OpenAIProvider: vi.fn().mockImplementation(() => ({
		initializeClient: vi.fn()
	}))
}));

vi.mock('$lib/services/llm/claudeProvider', () => ({
	ClaudeProvider: vi.fn().mockImplementation(() => ({
		initializeClient: vi.fn()
	}))
}));

vi.mock('$lib/services/llm/geminiProvider', () => ({
	GeminiProvider: vi.fn().mockImplementation(() => ({
		initializeClient: vi.fn()
	}))
}));

vi.mock('$lib/services/llm/deepSeekProvider', () => ({
	DeepSeekProvider: vi.fn().mockImplementation(() => ({
		initializeClient: vi.fn()
	}))
}));

vi.mock('$lib/services/llm/xAIProvider', () => ({
	XAIProvider: vi.fn().mockImplementation(() => ({
		initializeClient: vi.fn()
	}))
}));

vi.mock('$lib/services/llm/llamaProvider', () => ({
	LlamaProvider: vi.fn().mockImplementation(() => ({
		initializeClient: vi.fn()
	}))
}));

describe('LLMProviderFactory', () => {
	let factory: LLMProviderFactoryImpl;

	beforeEach(() => {
		vi.clearAllMocks();
		factory = new LLMProviderFactoryImpl();
	});

	it('should initialize with all providers', () => {
		expect(OpenAIProvider).toHaveBeenCalled();
		expect(ClaudeProvider).toHaveBeenCalled();
		expect(GeminiProvider).toHaveBeenCalled();
		expect(DeepSeekProvider).toHaveBeenCalled();
		expect(XAIProvider).toHaveBeenCalled();
		expect(LlamaProvider).toHaveBeenCalled();
	});

	it('should return the correct provider for OpenAI', () => {
		const provider = factory.getProvider(ApiProvider.openAI);
		expect(provider).toBeDefined();
		expect(OpenAIProvider).toHaveBeenCalled();
	});

	it('should return the correct provider for Claude', () => {
		const provider = factory.getProvider(ApiProvider.anthropic);
		expect(provider).toBeDefined();
		expect(ClaudeProvider).toHaveBeenCalled();
	});

	it('should return the correct provider for Gemini', () => {
		const provider = factory.getProvider(ApiProvider.google);
		expect(provider).toBeDefined();
		expect(GeminiProvider).toHaveBeenCalled();
	});

	it('should return the correct provider for DeepSeek', () => {
		const provider = factory.getProvider(ApiProvider.deepSeek);
		expect(provider).toBeDefined();
		expect(DeepSeekProvider).toHaveBeenCalled();
	});

	it('should return the correct provider for xAI', () => {
		const provider = factory.getProvider(ApiProvider.xAI);
		expect(provider).toBeDefined();
		expect(XAIProvider).toHaveBeenCalled();
	});

	it('should return the correct provider for Llama', () => {
		const provider = factory.getProvider(ApiProvider.meta);
		expect(provider).toBeDefined();
		expect(LlamaProvider).toHaveBeenCalled();
	});

	it('should throw an error for unknown provider', () => {
		// @ts-ignore - testing invalid value
		expect(() => factory.getProvider('unknown')).toThrow('Provider not implemented');
	});
});
