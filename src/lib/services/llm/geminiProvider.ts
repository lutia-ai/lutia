import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';
import type { LLMProvider, UsageMetrics } from './types';
import type { Model } from '$lib/types/types';
import { addFilesToMessage } from '$lib/utils/fileHandling';

/**
 * Implementation of LLMProvider for Google's Gemini
 */
export class GeminiProvider implements LLMProvider {
    private genAI!: GoogleGenerativeAI;
    private genAIModel: any;
    private finalContent: string = '';
    private inputTokens: number = 0;

    /**
     * Initialize the Gemini client
     */
    initializeClient() {
        this.genAI = new GoogleGenerativeAI(env.VITE_GOOGLE_GEMINI_API_KEY);
        return this.genAI;
    }

    /**
     * Process messages according to Gemini requirements
     */
    processMessages(messages: any[], images: any[], files: any[]) {
        console.log('[Gemini Provider] Processing messages');
        let processedMessages = [...messages];
        let geminiImage: any = null;

        if (images.length > 0) {
            // For Gemini, we need to handle images differently
            const image = images[0]; // Only first image is supported in Gemini
            // Extract the base64 data from the data URL
            const base64Data = image.data.split(',')[1];
            geminiImage = {
                inlineData: {
                    data: base64Data,
                    mimeType: image.media_type
                }
            };
        }

        if (files.length > 0) {
            processedMessages = addFilesToMessage(processedMessages, files);
        }

        // Convert messages to Gemini format
        const prompt = {
            contents: processedMessages.map((message) => ({
                role: message.role === 'user' ? message.role : 'model',
                parts: [{ text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }]
            }))
        };

        // Store the prompt and image for later use
        return { prompt, geminiImage };
    }

    /**
     * Create a streaming completion request
     */
    async createCompletionStream({ model, messages, reasoningEnabled }: { 
        model: Model, 
        messages: any,
        reasoningEnabled?: boolean
    }) {
        console.log('[Gemini Provider] Creating completion stream');
        const client = this.initializeClient();
        this.genAIModel = client.getGenerativeModel({ model: model.param });
        
        const { prompt, geminiImage } = messages;

        // Count input tokens
        let inputCountResult: { totalTokens: number };
        try {
            if (geminiImage) {
                inputCountResult = await this.genAIModel.countTokens([JSON.stringify(prompt), geminiImage]);
            } else {
                inputCountResult = await this.genAIModel.countTokens(prompt);
            }
            this.inputTokens = inputCountResult.totalTokens;
            console.log(`[Gemini Provider] Input tokens: ${this.inputTokens}`);
        } catch (err) {
            console.error('[Gemini Provider] Error counting tokens:', err);
            this.inputTokens = 0;
        }

        // Generate the stream
        try {
            let stream;
            if (geminiImage) {
                stream = await this.genAIModel.generateContentStream([
                    JSON.stringify(prompt),
                    geminiImage
                ]);
            } else {
                stream = await this.genAIModel.generateContentStream(prompt);
            }
            return stream;
        } catch (err) {
            console.error('[Gemini Provider] Error creating stream:', err);
            throw err;
        }
    }

    /**
     * Handle a chunk of data from the stream
     */
    handleStreamChunk(chunk: any, callbacks: {
        onFirstChunk: (requestId: string, conversationId: string) => void;
        onUsage: (usage: UsageMetrics, model: any) => void;
        onContent: (content: string) => void;
        onReasoning?: (content: string) => void;
    }) {
        try {
            // Check if the response has the expected structure
            const candidate = chunk.candidates?.[0];
            const content = candidate?.content?.parts?.[0]?.text || '';
            
            if (content) {
                this.finalContent += content;
                callbacks.onContent(content);
            }
            
            // If this is the end of the stream (final chunk), calculate token usage
            if (chunk.isLast) {
                // We need to count output tokens at the end
                this.genAIModel.countTokens(this.finalContent).then((outputCountResult: any) => {
                    const usage: UsageMetrics = {
                        prompt_tokens: this.inputTokens,
                        completion_tokens: outputCountResult.totalTokens,
                        total_tokens: this.inputTokens + outputCountResult.totalTokens
                    };
                    callbacks.onUsage(usage, {
                        input_price: 0.00000125,
                        output_price: 0.00000375
                    });
                });
                
                // Reset for next use
                this.finalContent = '';
            }
        } catch (err) {
            console.error('[Gemini Provider] Error handling chunk:', err);
        }

        // For Gemini, we need to generate a first chunk notification
        // since it doesn't have a specific "start" event
        if (!this.finalContent) {
            callbacks.onFirstChunk(crypto.randomUUID(), '');
        }
    }
} 