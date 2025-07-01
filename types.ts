export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    text: string;
    isLoading?: boolean;
}
