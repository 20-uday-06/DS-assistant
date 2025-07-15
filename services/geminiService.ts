import { GoogleGenAI, Content } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';
import { ChatMessage } from '../types';

// Fixed API key access to work in Vite browser environment
const getApiKey = (): string => {
    // Check if we're in browser environment with Vite
    if (typeof window !== 'undefined' && import.meta?.env?.VITE_GEMINI_API_KEY) {
        return import.meta.env.VITE_GEMINI_API_KEY;
    }
    
    // Fallback for other environments
    if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) {
        return process.env.VITE_GEMINI_API_KEY;
    }
    
    // Final fallback - for development only
    return 'AIzaSyAPBDKDl0x1a-w3PZ3GClCUgc8-V331_5M';
};

const apiKey = getApiKey();

if (!apiKey) {
    console.error('GEMINI_API_KEY not found. Please check your environment variables.');
}

// Initialize Google Genai API
const ai = new GoogleGenAI({ apiKey });


const formatHistory = (history: ChatMessage[]): Content[] => {
    // Filter out the system message if it exists, as it's handled by systemInstruction
    return history
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
};

class GeminiService {
    public async streamChat(
        historyWithNewPrompt: ChatMessage[],
        onChunk: (chunk: string) => void,
        systemInstruction: string = SYSTEM_PROMPT
    ): Promise<void> {
        const contents = formatHistory(historyWithNewPrompt);
        
        try {
            const responseStream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash-preview-05-20',
                contents,
                config: { 
                    systemInstruction,
                    maxOutputTokens: 16384, // Increased token limit for longer educational responses
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40
                },
            });

            let hasReceivedContent = false;
            
            for await (const chunk of responseStream) {
                if (chunk.text) {
                    hasReceivedContent = true;
                    onChunk(chunk.text);
                }
            }
            
            // Check if we received any content
            if (!hasReceivedContent) {
                console.warn("No content received from Gemini API");
                onChunk("\n\n> I apologize, but I didn't receive a complete response. Please try asking your question again.");
            }
            
        } catch (error) {
            console.error("Error streaming chat:", error);
            
            // More specific error messages
            if (error instanceof Error) {
                if (error.message.includes('quota') || error.message.includes('limit')) {
                    onChunk("\n\n> I've reached my usage limit. Please try again in a few moments.");
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    onChunk("\n\n> Network error occurred. Please check your connection and try again.");
                } else {
                    onChunk("\n\n> Sorry, I encountered an error while processing your request. Please try again.");
                }
            } else {
                onChunk("\n\n> Sorry, I encountered an unexpected error. Please try again.");
            }
        }
    }
    
    public async generateContent(
        prompt: string,
        isJsonOutput: boolean = false
    ): Promise<string> {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: prompt,
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                    maxOutputTokens: 8192, // Increase token limit for longer responses
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                   ...(isJsonOutput && { responseMimeType: "application/json" }),
                },
            });
            return response.text || "";
        } catch (error) {
            console.error("Error generating content:", error);
            const errorMsg = "Sorry, I encountered an error. Please try again.";
            return isJsonOutput ? JSON.stringify({ error: errorMsg }) : errorMsg;
        }
    }
}

export const geminiService = new GeminiService();