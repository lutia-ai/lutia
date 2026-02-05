import type { Model } from '$lib/models/types';
import type { Image } from '$lib/types/attachment';
import { formatModelEnumToReadable } from '$lib/models/modelUtils';

/**
 * Validates if the current number of images can accommodate additional images based on model constraints
 * @param currentImages Current array of images
 * @param newImagesCount Number of new images being added
 * @param model The current model with its constraints
 * @returns Object with validation result and error message if applicable
 */
export function validateImageUpload(
	currentImages: Image[],
	newImagesCount: number,
	model: Model
): { isValid: boolean; errorMessage?: string; maxImages: number } {
	const currentImageCount = currentImages.length;
	const totalImages = currentImageCount + newImagesCount;
	const maxImages = model.maxImages;
	const formattedModelName = formatModelEnumToReadable(model.name);

	// If model doesn't handle images at all
	if (!model.handlesImages) {
		return {
			isValid: false,
			errorMessage: `${formattedModelName} doesn't support image uploads`,
			maxImages: 0
		};
	}

	// If adding these images would exceed the limit
	if (totalImages > maxImages) {
		const remainingSlots = Math.max(0, maxImages - currentImageCount);

		if (remainingSlots === 0) {
			return {
				isValid: false,
				errorMessage: `Maximum of ${maxImages} image${maxImages !== 1 ? 's' : ''} allowed for ${formattedModelName}. Remove existing images to add new ones.`,
				maxImages
			};
		} else {
			return {
				isValid: false,
				errorMessage: `Maximum of ${maxImages} image${maxImages !== 1 ? 's' : ''} allowed for ${formattedModelName}. You can only add ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}.`,
				maxImages
			};
		}
	}

	return {
		isValid: true,
		maxImages
	};
}
