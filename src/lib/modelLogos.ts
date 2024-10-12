import type { ModelDictionary, ModelLogos } from '$lib/types';
import AnthropicIcon from '$lib/components/icons/Anthropic.svelte';
import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte';
import OpenAiIcon from '$lib/components/icons/OpenAiIcon.svelte';
import MetaIcon from '$lib/components/icons/MetaIcon.svelte';

export const modelLogos: ModelLogos = {
	openAI: {
		logo: OpenAiIcon
	},
	anthropic: {
		logo: AnthropicIcon
	},
	google: {
		logo: GoogleIcon
	},
	meta: {
		logo: MetaIcon
	}
};
