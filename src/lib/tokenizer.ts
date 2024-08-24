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

export function roundToFirstTwoNonZeroDecimals(num: number, roundUp: boolean = true): string {
	let str = num.toFixed(20);
	let match = str.match(/\.(?:0*[1-9]\d?|0*[1-9]\d|0+[1-9])\d?/);

	if (match) {
		let matchedPart = match[0];
		let integerPart = str.split('.')[0];
		let lastPosition = matchedPart.length - 1;

		if (roundUp && matchedPart.length < str.length - integerPart.length - 1) {
			let nextDigit = parseInt(str[integerPart.length + matchedPart.length]);
			if (nextDigit >= 5) {
				let roundedPart = (parseFloat(matchedPart) + Math.pow(10, -lastPosition)).toFixed(
					lastPosition
				);
				return (parseFloat(integerPart) + parseFloat(roundedPart)).toString();
			}
		}
		let result = parseFloat(integerPart + matchedPart);
		// check if the result is in scientific notation, if so then just return 0 as number is so small
		return /^-?\d+(\.\d+)?[eE][-+]?\d+$/.test(result.toString()) ? '0' : result.toString();
	} else {
		return str.split('.')[0];
	}
}
