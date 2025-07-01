import { GoogleGenAI, Content } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';
import { ChatMessage } from '../types';

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set. Please set it in your environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
                model: 'gemini-2.5-flash-preview-04-17',
                contents,
                config: { systemInstruction },
            });

            for await (const chunk of responseStream) {
                if (chunk.text) {
                    onChunk(chunk.text);
                }
            }
        } catch (error) {
            console.error("Error streaming chat:", error);
            onChunk("\n\n> Sorry, I encountered an error while processing your request. Please try again.");
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
                   ...(isJsonOutput && { responseMimeType: "application/json" }),
                },
            });
            return response.text;
        } catch (error) {
            console.error("Error generating content:", error);
            const errorMsg = "Sorry, I encountered an error. Please try again.";
            return isJsonOutput ? JSON.stringify({ error: errorMsg }) : errorMsg;
        }
    }
}

export const geminiService = new GeminiService();