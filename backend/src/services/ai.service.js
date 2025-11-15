import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import { FORM_GENERATION_PROMPT } from '../prompt/form-generation.prompt.js';

dotenv.config();

const API_KEY = process.env.API_KEY;
const genAI = new GoogleGenAI({ apiKey: API_KEY });

const AVAILABLE_MODELS = {
    PRO: 'gemini-2.5-pro',
    FLASH: 'gemini-2.5-flash',
    FLASH_LITE: 'gemini-2.5-flash-lite',
    FLASH_TTS: 'gemini-2.5-flash-tts',
    FLASH_2: 'gemini-2.0-flash',
    FLASH_2_LITE: 'gemini-2.0-flash-lite',
    FLASH_2_PREVIEW_IMAGE: 'gemini-2.0-flash-preview-image-generation',
    FLASH_2_EXP: 'gemini-2.0-flash-exp',
};


const MODEL_FALLBACK_ORDER = [
    AVAILABLE_MODELS.FLASH,         
    AVAILABLE_MODELS.FLASH_LITE,      
    AVAILABLE_MODELS.FLASH_2,         
    AVAILABLE_MODELS.FLASH_2_LITE,
    AVAILABLE_MODELS.PRO            
];


const parseAIResponse = (text) => {
    try {
        let cleanText = text.trim();
        
        // Remove markdown code blocks if present
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // First attempt: try parsing as-is
        try {
            const formSchema = JSON.parse(cleanText);
            return formSchema;
        } catch (initialError) {
            console.warn('⚠️ Initial JSON parse failed, attempting repair...');
            
            // Check if response is truncated (common issue)
            if (cleanText.length > 0 && !cleanText.endsWith('}')) {
                console.warn('🔧 Detected truncated response, attempting to close JSON...');
                
                // Try to repair truncated JSON by adding missing closing braces
                let repairedText = cleanText;
                let openBraces = (repairedText.match(/\{/g) || []).length;
                let closeBraces = (repairedText.match(/\}/g) || []).length;
                let openBrackets = (repairedText.match(/\[/g) || []).length;
                let closeBrackets = (repairedText.match(/\]/g) || []).length;
                
                // Add missing closing brackets first
                while (closeBrackets < openBrackets) {
                    repairedText += ']';
                    closeBrackets++;
                }
                
                // Add missing closing braces
                while (closeBraces < openBraces) {
                    repairedText += '}';
                    closeBraces++;
                }
                
                try {
                    const repairedSchema = JSON.parse(repairedText);
                    console.log('✅ Successfully repaired truncated JSON');
                    return repairedSchema;
                } catch (repairError) {
                    console.warn('⚠️ JSON repair failed, trying truncation at last valid field...');
                    
                    // Try to truncate at the last complete field
                    const lastFieldMatch = repairedText.lastIndexOf('},');
                    if (lastFieldMatch > -1) {
                        const truncatedText = repairedText.substring(0, lastFieldMatch + 1) + ']}';
                        try {
                            const truncatedSchema = JSON.parse(truncatedText);
                            console.log('✅ Successfully parsed by truncating to last complete field');
                            return truncatedSchema;
                        } catch (truncateError) {
                            // Fall through to original error
                        }
                    }
                }
            }
            
            // If all repair attempts fail, throw the original error
            throw initialError;
        }

    } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('Received text length:', text.length);
        console.error('First 500 chars:', text.substring(0, 500));
        console.error('Last 500 chars:', text.substring(Math.max(0, text.length - 500)));
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }
};



// Helper function to check if error should trigger model fallback
const shouldRetryWithDifferentModel = (error) => {
    const errorMsg = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status;
    
    return (
        // Quota/traffic errors
        errorMsg.includes('quota exceeded') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('too many requests') ||
        errorMsg.includes('resource exhausted') ||
        errorMsg.includes('service unavailable') ||
        errorMsg.includes('temporarily unavailable') ||
        // JSON parsing errors (model might be truncating responses)
        errorMsg.includes('failed to parse ai response') ||
        errorMsg.includes('unterminated string') ||
        errorMsg.includes('unexpected end of json') ||
        // HTTP status codes for rate limiting
        errorCode === 429 ||  // Too Many Requests
        errorCode === 503 ||  // Service Unavailable
        errorCode === 509     // Bandwidth Limit Exceeded
    );
};



// Attempt generation with automatic model fallback
const attemptGenerationWithFallback = async (fullPrompt) => {
    let lastError;
    
    for (let i = 0; i < MODEL_FALLBACK_ORDER.length; i++) {
        const currentModel = MODEL_FALLBACK_ORDER[i];
        
        try {
            console.log(`🔄 Trying model: ${currentModel}${i > 0 ? ' (fallback)' : ''}`);
            
            const response = await genAI.models.generateContent({
                model: currentModel,
                contents: fullPrompt,
                config: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048,
                }
            });

            console.log("✅ Successfully used model:", response);

            const text = response.text;
            console.log("✅ Successfully used model:", text);
            
            // Try to parse the response
            try {
                const formSchema = parseAIResponse(text);
                return { text, formSchema };
            } catch (parseError) {
                console.warn(`⚠️ Parse failed for model ${currentModel}:`, parseError.message);
                
                // If parsing fails, try next model
                if (shouldRetryWithDifferentModel(parseError)) {
                    lastError = parseError;
                    continue;
                }
                
                // If it's not a retryable parse error, throw it
                throw parseError;
            }
            
        } catch (error) {
            console.warn(`⚠️  Model ${currentModel} failed:`, error.message);
            lastError = error;
            
            // If it's a retryable error, try next model
            if (shouldRetryWithDifferentModel(error)) {
                console.log(`🔄 Retrying with next model due to: ${error.message.substring(0, 100)}...`);
                continue;
            }
            
            // If it's not a quota error (auth, invalid prompt, etc), don't retry
            console.error(`❌ Non-retryable error with ${currentModel}:`, error);
            throw error;
        }
    }
    
    // If we get here, all models failed
    throw new Error(`All models failed. Last error: ${lastError.message}`);
};

const validateFormSchema = (schema) => {
    if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid form schema: not an object');
    }

    if (!schema.fields || !Array.isArray(schema.fields)) {
        throw new Error('Invalid form schema: fields array is missing');
    }

    if (schema.fields.length === 0) {
        throw new Error('Invalid form schema: fields array is empty');
    }

    // Validate each field has required properties
    schema.fields.forEach((field, index) => {
        if (!field.name || !field.label || !field.type) {
            throw new Error(`Invalid field at index ${index}: missing required properties (name, label, type)`);
        }
    });
};

export const generateFormSchema = async (prompt) => {
    try {
        if (!API_KEY) {
            throw new Error(
                'No Google API key configured. Please set one of: GOOGLE_API_KEY, API_KEY, GCLOUD_API_KEY, or GOOGLE_APIKEY in your environment variables or .env file.\n' +
                'Get your API key from: https://aistudio.google.com/app/apikey\n' +
                'Alternatively, set up Application Default Credentials: https://cloud.google.com/docs/authentication/getting-started'
            );
        }

        const fullPrompt = `${FORM_GENERATION_PROMPT}\n\nUser Request: ${prompt}`;
        
        const result = await attemptGenerationWithFallback(fullPrompt);
        const { formSchema } = result;

        validateFormSchema(formSchema);

        return formSchema;

    } catch (error) {
        console.error('❌ Error in generateFormSchema:', error);
        throw error;
    }
};

export const isConfigured = () => {
    return !!(API_KEY);
};