import { ApiProvider } from '@prisma/client';
import type { LLMProvider, LLMProviderFactory } from './types';
import { OpenAIProvider } from './openAIProvider';
import { DeepSeekProvider } from './deepSeekProvider';
import { ClaudeProvider } from './claudeProvider';
import { GeminiProvider } from './geminiProvider';
import { LlamaProvider } from './llamaProvider';
import { XAIProvider } from './xAIProvider';

/**
 * Factory class to create the appropriate LLM provider
 */
export class LLMProviderFactoryImpl implements LLMProviderFactory {
	private providers: Map<ApiProvider, LLMProvider> = new Map();

	constructor() {
		console.log('[Provider Factory] Initializing providers...');
		this.providers.set(ApiProvider.openAI, new OpenAIProvider());
		this.providers.set(ApiProvider.deepSeek, new DeepSeekProvider());
		this.providers.set(ApiProvider.anthropic, new ClaudeProvider());
		this.providers.set(ApiProvider.google, new GeminiProvider());
		this.providers.set(ApiProvider.xAI, new XAIProvider());
		this.providers.set(ApiProvider.meta, new LlamaProvider());
		console.log(
			`[Provider Factory] Providers initialized: ${[...this.providers.keys()].join(', ')}`
		);
	}

	/**
	 * Get the provider instance for the specified API provider
	 */
	getProvider(apiProvider: ApiProvider): LLMProvider {
		console.log(`[Provider Factory] Requested provider: ${apiProvider}`);
		console.log(
			`[Provider Factory] Available providers: ${[...this.providers.keys()].join(', ')}`
		);
		const provider = this.providers.get(apiProvider);

		if (!provider) {
			console.error(`[Provider Factory] Provider not implemented for ${apiProvider}`);
			throw new Error(`Provider not implemented for ${apiProvider}`);
		}

		console.log(`[Provider Factory] Found provider for: ${apiProvider}`);
		return provider;
	}
}

// Singleton instance
export const llmProviderFactory = new LLMProviderFactoryImpl();
