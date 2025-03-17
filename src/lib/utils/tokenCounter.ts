export function estimateTokenCount(text: string, model: 'gpt' | 'simple' = 'gpt'): number {
    if (!text) return 0;
    
    // Simple character-based estimation (approximately 4 chars per token)
    if (model === 'simple') {
        return Math.ceil(text.length / 4);
    }
    
    // More nuanced estimation for GPT-like models
    
    // Count words (split by whitespace)
    const words = text.trim().split(/\s+/).length;
    
    // Count special elements that often use more tokens
    const urls = (text.match(/https?:\/\/[^\s]+/g) || []).length;
    const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).length;
    const nonLatinCharRatio = countNonLatinCharRatio(text);
    
    // Base estimate: ~1.3 tokens per word
    let tokenEstimate = words * 1.3;
    
    // Add extras for special content
    tokenEstimate += urls * 5; // URLs use more tokens
    tokenEstimate += codeBlocks * 10; // Code blocks often use more tokens
    
    // Adjust for non-Latin scripts which typically use more tokens
    if (nonLatinCharRatio > 0.1) {
        tokenEstimate *= (1 + nonLatinCharRatio); // Scale up based on non-Latin ratio
    }
    
    // Add a 10% buffer for overestimation
    tokenEstimate *= 1.1;
    
    return Math.ceil(tokenEstimate);
}

/**
  * Calculates the ratio of non-Latin characters in the text
  */
function countNonLatinCharRatio(text: string): number {
    if (!text) return 0;
    
    let nonLatinCount = 0;
    const totalChars = text.length;
    
    // Regex for Latin alphabet, numbers, and common punctuation
    const latinRegex = /[a-zA-Z0-9\s.,?!;:'"(){}\[\]<>\/\\|@#$%^&*_+=\-]/;
    
    for (const char of text) {
        if (!latinRegex.test(char)) {
            nonLatinCount++;
        }
    }
    
    return nonLatinCount / totalChars;
}