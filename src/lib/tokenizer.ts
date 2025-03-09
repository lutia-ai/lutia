import { AutoTokenizer, env, type PreTrainedTokenizer } from '@xenova/transformers';
import type { Message, Model } from '$lib/types';

let timer: NodeJS.Timeout;
let tokenizer: PreTrainedTokenizer;

const isGemini = (param: string) => {
	const firstWord = param.split('-')[0];
	return firstWord === 'gemini';
};

export const countTokens = async (
	prompt: Message[] | string,
	model: Model,
	io: string = 'input'
): Promise<{ tokens: number; price: number }> => {
	return new Promise((resolve) => {
		if (timer) {
			clearTimeout(timer);
		}

		if (!model.hub) {
			return resolve({ tokens: -1, price: -1 });
		}

		if (prompt === '') {
			return resolve({ tokens: 0, price: 0 });
		}

		// Set a new timeout
		timer = setTimeout(async () => {
			// Only reinitialize the tokenizer if the model hub changes
			if (!tokenizer || (tokenizer as any).hub !== model.hub) {
				env.allowLocalModels = false;
				tokenizer = await AutoTokenizer.from_pretrained(model.hub);
				(tokenizer as any).hub = model.hub; // Store the hub
			}

			// Encode the prompt and calculate the number of tokens
			const encoding = tokenizer.encode(JSON.stringify(prompt));
			const tokens = isGemini(model.param)
				? Math.round(encoding.length * 1.12)
				: encoding.length;
			const price =
				(tokens / 1000000) * (io === 'input' ? model.input_price : model.output_price);

			resolve({ tokens, price }); // Resolve the promise with the token count
		}, 500); // Timeout set to 500ms
	});
};

export const countTokensNoTimeout = async (
	prompt: Message[] | string,
	model: Model,
	io: string = 'input'
): Promise<{ tokens: number; price: number }> => {
	if (!model.hub) {
		return { tokens: -1, price: -1 };
	}
	// Early return if the prompt is empty
	if (prompt === '') {
		return { tokens: 0, price: 0 };
	}

	// Only reinitialize the tokenizer if the model hub changes
	if (!tokenizer || (tokenizer as any).hub !== model.hub) {
		env.allowLocalModels = false;
		tokenizer = await AutoTokenizer.from_pretrained(model.hub);
		(tokenizer as any).hub = model.hub; // Store the hub
	}

	// Encode the prompt and calculate the number of tokens
	const encoding = tokenizer.encode(JSON.stringify(prompt));
	let tokens = encoding.length;

	// Adjust token count for Gemini models
	if (isGemini(model.param)) {
		tokens = Math.round(tokens * 1.12);
	}

	// Calculate price
	const price = (tokens / 1000000) * (io === 'input' ? model.input_price : model.output_price);

	return { tokens, price };
};

export function calculateGptVisionPricing(
	width: number,
	height: number,
	detail: 'low' | 'high' = 'high'
) {
	if (detail === 'low') {
		const price = (85 / 1000000) * 5;
		return { tokens: 85, price };
	}

	// Resize to fit within a 2048x2048 square if necessary
	const maxDimension = 2048;
	if (width > maxDimension || height > maxDimension) {
		const scaleFactor = maxDimension / Math.max(width, height);
		width = Math.floor(width * scaleFactor);
		height = Math.floor(height * scaleFactor);
	}

	// Scale such that the shortest side is 768px
	const minSide = 768;
	const shortestSide = Math.min(width, height);
	const scaleFactor = minSide / shortestSide;
	width = Math.floor(width * scaleFactor);
	height = Math.floor(height * scaleFactor);

	// Calculate the number of 512px squares needed to represent the image
	const squaresWidth = Math.ceil(width / 512);
	const squaresHeight = Math.ceil(height / 512);
	const numberOfSquares = squaresWidth * squaresHeight;

	// Calculate final token cost
	const tokenCost = 170 * numberOfSquares + 85;
	const price = (tokenCost / 1000000) * 5;

	return { tokens: Math.round(tokenCost), price };
}

export function calculateClaudeImageCost(width: number, height: number, model: Model) {
	const maxWidth = 1568;
	const maxHeight = 1568;
	const maxPixels = 1.15 * 1000000; // 1.15 megapixels

	// Resize image if necessary
	if (width > maxWidth || height > maxHeight || width * height > maxPixels) {
		const aspectRatio = width / height;
		if (aspectRatio > 1) {
			width = Math.min(maxWidth, Math.sqrt(maxPixels * aspectRatio));
			height = width / aspectRatio;
		} else {
			height = Math.min(maxHeight, Math.sqrt(maxPixels / aspectRatio));
			width = height * aspectRatio;
		}
	}

	// Calculate tokens
	const tokens = Math.round(Math.ceil((width * height) / 750));

	// Calculate costs
	const pricePerToken = model.input_price / 1000000;
	const price = tokens * pricePerToken;

	return {
		tokens: tokens,
		price
	};
}

export function roundToTwoSignificantDigits(num: number): string {
	if (num === 0) return '0';

	const magnitude = Math.floor(Math.log10(Math.abs(num)));
	const scale = Math.pow(10, magnitude - 1);

	return (Math.round(num / scale) * scale).toFixed(Math.max(0, -(magnitude - 1)));
}
