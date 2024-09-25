import ComposeIcon from '$lib/components/icons/ComposeIcon.svelte';
import PaintBrushIcon from '$lib/components/icons/PaintBrushIcon.svelte';
import QuestionBubblesIcon from '$lib/components/icons/QuestionBubblesIcon.svelte';
import type { PromptHelpers } from '$lib/types';

export const promptHelpers: PromptHelpers = {
	createImage: [
		{
			prompt: 'Create a cartoon illustration of my pet',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Create a professional logo for my new company',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Design a sitting room with lots of bookshelves',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Generate a futuristic cityscape at night',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Create a realistic portrait of a fantasy creature',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Design a movie poster for a sci-fi thriller',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Illustrate a cozy cabin in the woods during autumn',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Create a surreal landscape with floating islands',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Design a vintage-style travel poster for Mars',
			icon: PaintBrushIcon
		},
		{
			prompt: 'Generate an abstract representation of music',
			icon: PaintBrushIcon
		}
	],
	compose: [
		{
			prompt: 'Can you help me write an email to...',
			icon: ComposeIcon
		},
		{
			prompt: 'Can you help me write an essay on strategy and innovation',
			icon: ComposeIcon
		},
		{
			prompt: 'Write a creative short story about time travel',
			icon: ComposeIcon
		},
		{
			prompt: 'Compose a formal letter of resignation',
			icon: ComposeIcon
		},
		{
			prompt: 'Draft a press release for a new product launch',
			icon: ComposeIcon
		},
		{
			prompt: 'Write a persuasive speech on climate change',
			icon: ComposeIcon
		},
		{
			prompt: 'Create a job description for a software developer position',
			icon: ComposeIcon
		},
		{
			prompt: 'Compose a heartfelt thank-you note to a mentor',
			icon: ComposeIcon
		},
		{
			prompt: 'Write a script for a 30-second commercial',
			icon: ComposeIcon
		},
		{
			prompt: 'Draft a business proposal for a startup idea',
			icon: ComposeIcon
		}
	],
	question: [
		{
			prompt: 'Tell me a random fact',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'What are the main causes of climate change?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'How does artificial intelligence work?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'What were the key events of World War II?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'Can you explain the theory of relativity?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'What are the benefits of meditation?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'How does the human immune system function?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'What are the differences between capitalism and socialism?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'Can you explain the process of photosynthesis?',
			icon: QuestionBubblesIcon
		},
		{
			prompt: 'What are the key principles of effective leadership?',
			icon: QuestionBubblesIcon
		}
	]
};
