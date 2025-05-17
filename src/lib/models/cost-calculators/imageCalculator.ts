import type { Model, Image } from "$lib/types/types";
import { ApiProvider } from "@prisma/client";

/**
 * Calculate image cost based on the provider
 */
export function calculateImageCostByProvider(
	images: Image[],
	model: Model,
	apiProvider: ApiProvider
): { cost: number; tokens: number } {
	let cost = 0;
	let tokens = 0;

	for (const image of images) {
		let result;
		if (apiProvider === ApiProvider.anthropic) {
			result = calculateClaudeImageCost(image.width, image.height, model);
		} else {
			// OpenAI, xAI, DeepSeek all use the same pricing
			result = calculateGptVisionPricing(image.width, image.height);
		}
		cost += result.price;
		tokens += result.tokens;
	}

	return { cost, tokens };
}


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