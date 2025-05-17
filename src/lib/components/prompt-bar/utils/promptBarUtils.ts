/**
 * Utility functions for the PromptBar component
 */

import type { Message, Model, ModelDictionary } from '$lib/types/types';
import type { ApiProvider } from '@prisma/client';
import { calculateImageCostByProvider } from '$lib/models/cost-calculators/imageCalculator';
import { formatModelEnumToReadable } from '$lib/models/modelUtils';
import { estimateTokenCount } from '$lib/models/cost-calculators/tokenCounter';


/**
 * Formats pasted text to make it safe for insertion in the contenteditable area
 * @param plainText Text from clipboard
 * @returns Formatted HTML string
 */
export function formatPastedText(plainText: string): string {
    // Replace newlines with <br> tags
    let formattedText = plainText.replace(/\n/g, '<br>');
    
    // Escape HTML entities
    formattedText = formattedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // Replace <br> back as they should stay as tags
    formattedText = formattedText.replace(/&lt;br&gt;/g, '<br>');
    
    return formattedText;
}

/**
 * Filters models based on search query
 * @param modelDict Dictionary of available models
 * @param query Search query
 * @returns Filtered array of models
 */
export function filterModels(
    modelDict: ModelDictionary,
    query: string
): { company: ApiProvider; model: Model; formattedName: string }[] {
    const filteredModels: { company: ApiProvider; model: Model; formattedName: string }[] = [];
    
    // Loop through each company and their models
    Object.entries(modelDict).forEach(([companyKey, company]) => {
        // Object.values(models) to get array of models 
        if (company && company.models) {
            Object.values(company.models).forEach((modelValue) => {
                const model = modelValue as Model;
                // Check if model name contains the query
                if (
                    model.name.toLowerCase().includes(query.toLowerCase()) ||
                    String(companyKey).toLowerCase().includes(query.toLowerCase())
                ) {
                    filteredModels.push({
                        company: companyKey as ApiProvider,
                        model,
                        formattedName: formatModelEnumToReadable(model.name)
                    });
                }
            });
        }
    });
    
    return filteredModels;
}

/**
 * Gets text before the last @ mention
 * @param content HTML content
 * @returns Text with the last @ mention removed
 */
export function getTextBeforeLastMention(content: string): string {
    const lastAtIndex = content.lastIndexOf('@');
    if (lastAtIndex >= 0) {
        return content.substring(0, lastAtIndex);
    }
    return content;
}

/**
 * Focus at the end of the contenteditable element
 * @param element HTML element to focus
 */
export function focusAtEnd(element: HTMLElement): void {
    // Set focus to the element
    element.focus();
    
    // Create a range and set the selection to the end
    const range = document.createRange();
    const selection = window.getSelection();
    
    range.selectNodeContents(element);
    range.collapse(false); // false collapses to end
    
    selection?.removeAllRanges();
    selection?.addRange(range);
}

/**
 * Calculates tokens and price for the current prompt
 * @param fullPrompt The complete prompt
 * @param imageAttachments Any image attachments
 * @param chosenModel The selected model
 * @param chosenCompany The selected company
 * @returns Object with token count and price
 */
export async function calculateTokensAndPrice(
    fullPrompt: Message[] | string,
    imageAttachments: any[],
    chosenModel: Model,
    chosenCompany: ApiProvider
): Promise<{ tokens: number; price: number }> {
    // Default values
    let tokens = 0;
    let price = 0;

    if (chosenModel.generatesImages || fullPrompt === '<br>') {
        return { tokens, price };
    }
    
    try {
        tokens = estimateTokenCount(JSON.stringify(fullPrompt));
        // const result = await countTokens(fullPrompt, chosenModel);
        // tokens = result.tokens;
        // price = result.price;
        
        // Add tokens for images if applicable
        if (imageAttachments.length > 0 && chosenModel.handlesImages) {
            const imageTokens = calculateImageCostByProvider(imageAttachments, chosenModel, chosenCompany).tokens;
            tokens += imageTokens;
        }
        
        // Calculate price based on tokens and model pricing
        if (chosenModel.input_price && tokens > 0) {
            price = (tokens / 1000000) * chosenModel.input_price;
        }
    } catch (error) {
        console.error('Error calculating tokens:', error);
    }
    
    return { tokens, price };
}

/**
 * Prepares a prompt with file attachments for token counting
 * @param fullPrompt The full prompt
 * @param fileAttachments File attachments to include
 * @returns A message or string representing the full prompt with attachments
 */
export function preparePromptWithAttachments(
    fullPrompt: Message[] | string,
    fileAttachments: any[]
): Message[] | string {
    // If it's already a string, append file info
    if (typeof fullPrompt === 'string') {
        let result = fullPrompt;
        fileAttachments.forEach((file) => {
            result += `\n\nFile: ${file.name}\nContent: ${file.content.substring(0, 500)}${
                file.content.length > 500 ? '...' : ''
            }`;
        });
        return result;
    }
    
    // If it's messages, add file attachments as system messages
    if (Array.isArray(fullPrompt)) {
        const result = [...fullPrompt];
        fileAttachments.forEach((file) => {
            result.push({
                role: 'system',
                content: `File: ${file.name}\nContent: ${file.content.substring(0, 500)}${
                    file.content.length > 500 ? '...' : ''
                }`
            });
        });
        return result;
    }
    
    return fullPrompt;
} 