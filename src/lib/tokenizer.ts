import { AutoTokenizer, env, type PreTrainedTokenizer } from '@xenova/transformers';
import type { FullPrompt, Model } from '$lib/types';

let timer: NodeJS.Timeout;
let tokenizer: PreTrainedTokenizer;

const isGemini = (param: string) => {
	const firstWord = param.split('-')[0];
	return firstWord === 'gemini';
};

export const countTokens = async (
	prompt: FullPrompt | string,
	model: Model,
	io: string = 'input'
): Promise<{ tokens: number; price: number }> => {
	return new Promise((resolve) => {
		if (timer) {
			clearTimeout(timer);
		}

		// Set a new timeout
		timer = setTimeout(async () => {
			if (isGemini(model.param)) {
				const tokens = 0;
				const price = 0;
				return resolve({ tokens, price });
			}

			// Only reinitialize the tokenizer if the model hub changes
			if (!tokenizer || (tokenizer as any).hub !== model.hub) {
				env.allowLocalModels = false;
				tokenizer = await AutoTokenizer.from_pretrained(model.hub);
				(tokenizer as any).hub = model.hub; // Store the hub
			}

			// Encode the prompt and calculate the number of tokens
			const encoding = tokenizer.encode(JSON.stringify(prompt));
			const tokens = encoding.length;
			const price =
				(tokens / 1000000) * (io === 'input' ? model.input_price : model.output_price);

			resolve({ tokens, price }); // Resolve the promise with the token count
		}, 500); // Timeout set to 500ms
	});
};

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
                let roundedPart = (
                    parseFloat(matchedPart) + Math.pow(10, -lastPosition)
                ).toFixed(lastPosition);
                return (parseFloat(integerPart) + parseFloat(roundedPart)).toString();
            }
        }
        let result = parseFloat(integerPart + matchedPart);
        return result.toString();
    } else {
        return str.split('.')[0];
    }
};
