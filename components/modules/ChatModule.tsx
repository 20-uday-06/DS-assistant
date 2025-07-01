import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { ChatMessage } from '../../types';
import { PaperAirplaneIcon, StopIcon } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

const FormattedMessageContent: React.FC<{ content: string }> = React.memo(({ content }) => {
    const { theme } = useTheme();
    const syntaxTheme = theme === 'dark' ? vscDarkPlus : prism;

    // Ensure content is properly normalized to prevent rendering issues
    const normalizedContent = content.trim().normalize('NFC');

    const components: Components = {
         code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter
                    style={syntaxTheme as any}
                    language={match[1]}
                    PreTag="div"
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
    };

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none 
                                prose-p:my-2 
                                prose-headings:my-3 prose-headings:font-semibold
                                prose-code:bg-gray-300/70 dark:prose-code:bg-gray-900/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                                prose-table:w-full prose-table:text-sm prose-thead:border-b dark:prose-thead:border-gray-600 prose-th:p-2 prose-th:font-semibold 
                                prose-td:p-2 prose-tr:border-b dark:prose-tr:border-gray-700/50
                                prose-a:text-accent-blue hover:prose-a:underline">
            <ReactMarkdown
                remarkPlugins={[
                    [remarkMath, { singleDollarTextMath: true }],
                    remarkGfm
                ]}
                rehypePlugins={[
                    [rehypeKatex, { 
                        strict: false,
                        trust: true,
                        output: 'html'
                    }]
                ]}
                components={components}
            >
                {normalizedContent}
            </ReactMarkdown>
        </div>
    );
});

const ChatModule: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const currentMessageRef = useRef<string>('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
        setMessages([
            {
                id: 'initial-message',
                role: 'model',
                text: "Hello! I'm your Data Science Co-Pilot. How can I assist you today? Feel free to ask about Python, SQL, statistics, or machine learning.",
            }
        ])
    }, []);

    const handleStop = useCallback(() => {
        setIsLoading(false);
        currentMessageRef.current = ''; // Reset ref
        // Clean up potentially partial message
        setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'model' && lastMessage.isLoading) {
                const newLastMessage = { ...lastMessage, isLoading: false };
                if (!newLastMessage.text.trim()) {
                    return prev.slice(0, -1);
                }
                return [...prev.slice(0, -1), newLastMessage];
            }
            return prev;
        });
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e?: React.FormEvent) => {
        if(e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Check if user typed exactly "new chat" to clear the conversation
        if (input.trim() === 'new chat') {
            setMessages([
                {
                    id: 'initial-message',
                    role: 'model',
                    text: "Hello! I'm your Data Science Co-Pilot. How can I assist you today? Feel free to ask about Python, SQL, statistics, or machine learning.",
                }
            ]);
            setInput('');
            return;
        }

        const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        const modelMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '', isLoading: true }]);
        
        // Reset the current message ref
        currentMessageRef.current = '';

        try {
            await geminiService.streamChat(
                updatedMessages,
                (chunk) => {
                    // Ensure chunk is properly cleaned and doesn't contain control characters
                    const cleanChunk = chunk.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                    
                    // Update the ref with the complete message
                    currentMessageRef.current += cleanChunk;
                    
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === modelMessageId ? { 
                                ...msg, 
                                text: currentMessageRef.current 
                            } : msg
                        )
                    );
                }
            );
        } catch (error) {
            console.error(error);
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === modelMessageId ? { ...msg, text: "An error occurred.", isLoading: false } : msg
                )
            );
        } finally {
            setIsLoading(false);
            currentMessageRef.current = ''; // Reset ref
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === modelMessageId ? { ...msg, isLoading: false } : msg
                )
            );
            inputRef.current?.focus();
        }
    };
    
    return (
        <div className="w-full h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg flex flex-col overflow-hidden">
            <header className="p-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
                <h2 className="text-xl font-bold">AI Chat Assistant</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your expert data science partner</p>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                <AnimatePresence>
                    {messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <footer className="p-4 border-t border-border-light dark:border-border-dark flex-shrink-0">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Ask about PostgreSQL, Python, stats, or upload a dataset..."
                        className="w-full h-12 min-h-[3rem] max-h-48 p-3 pr-20 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-blue focus:outline-none resize-none transition-all duration-300"
                        rows={1}
                        disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isLoading && (
                            <motion.button
                                type="button"
                                onClick={handleStop}
                                className="p-2 rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                            >
                                <StopIcon className="w-5 h-5" />
                            </motion.button>
                        )}
                        <motion.button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-purple text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-glow-blue"
                            whileTap={{ scale: 0.9 }}
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </motion.button>
                    </div>
                </form>
            </footer>
        </div>
    );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isModel = message.role === 'model';
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex items-start gap-3 max-w-4xl w-full ${isModel ? 'justify-start' : 'ml-auto justify-end'}`}
        >
            {isModel && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-bold text-sm shadow-md">
                    AI
                </div>
            )}
            <div
                className={`px-4 py-3 rounded-2xl w-fit max-w-full ${
                    isModel
                        ? 'bg-gray-200/80 dark:bg-gray-700/50 rounded-tl-none'
                        : 'bg-accent-blue text-white rounded-br-none'
                }`}
            >
                <FormattedMessageContent content={message.text} />
                {message.isLoading && <span className="inline-block w-2 h-4 bg-gray-500 dark:bg-gray-300 animate-pulse ml-1 rounded-sm" />}
            </div>
        </motion.div>
    );
};

export default ChatModule;