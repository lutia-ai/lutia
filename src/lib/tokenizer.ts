import { AutoTokenizer, env, type PreTrainedTokenizer } from '@xenova/transformers';
// import { tokenization } from '@google-cloud/vertexai';

interface Model {
	name: string;
	param: string;
	input_price: number;
	output_price: number;
	context_window: number;
	hub: string;
}

let timer: NodeJS.Timeout;
let tokenizer: PreTrainedTokenizer;

const isGemini = (param: string) => {
	const firstWord = param.split('-')[0];
	return firstWord === 'gemini';
};

export const updateTokens = async (
	prompt: string,
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
			if (!tokenizer || tokenizer.hub !== model.hub) {
				env.allowLocalModels = false;
				tokenizer = await AutoTokenizer.from_pretrained(model.hub);
				tokenizer.hub = model.hub; // Store the hub
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
