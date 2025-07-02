import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { sessionManager } from '../../services/sessionManager';
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

// Global history types
interface GlobalHistoryItem {
    query: string;
    sessionId: string;
    timestamp: string;
}

interface Analytics {
    totalSessions: number;
    totalQueries: number;
    topTopics: Array<{ topic: string; count: number }>;
    averageQueriesPerSession: string;
}

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
                                prose-a:text-accent-blue hover:prose-a:underline"
                                style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minHeight: '1.5rem' }}>
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
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'initial-message',
            role: 'model',
            text: "Hello! I'm your Data Science Co-Pilot. How can I assist you today? Feel free to ask about Python, SQL, statistics, or machine learning.",
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showGlobalHistory, setShowGlobalHistory] = useState(false);
    const [globalHistory, setGlobalHistory] = useState<GlobalHistoryItem[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const streamingMessageRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsLoading(false);
        inputRef.current?.focus();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        setInput(textarea.value);
        
        // Auto-resize textarea
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const maxHeight = 192;
        textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }, []);

    const fetchGlobalHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const apiBase = window.location.hostname !== 'localhost' ? '' : 'http://localhost:5000';
            const response = await fetch(`${apiBase}/api/global-history?limit=50`);
            if (response.ok) {
                const data = await response.json();
                setGlobalHistory(data);
            }
        } catch (error) {
            console.error('Failed to fetch global history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const apiBase = window.location.hostname !== 'localhost' ? '' : 'http://localhost:5000';
            const response = await fetch(`${apiBase}/api/analytics`);
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    }, []);

    const toggleGlobalHistory = useCallback(() => {
        setShowGlobalHistory(!showGlobalHistory);
        if (!showGlobalHistory) {
            fetchGlobalHistory();
            fetchAnalytics();
        }
    }, [showGlobalHistory, fetchGlobalHistory, fetchAnalytics]);

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if(e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Check if user typed "new chat" to clear the conversation
        if (input.trim() === 'new chat') {
            setMessages([
                {
                    id: 'initial-message',
                    role: 'model',
                    text: "Hello! I'm your Data Science Co-Pilot. How can I assist you today? Feel free to ask about Python, SQL, statistics, or machine learning.",
                }
            ]);
            setInput('');
            
            if (inputRef.current) {
                inputRef.current.style.height = '3rem';
            }
            
            sessionManager.startNewSession();
            return;
        }

        const userQueryText = input.trim();
        const summary = userQueryText.length > 100 ? userQueryText.substring(0, 100) + '...' : userQueryText;
        
        // Save to history (async, don't wait)
        sessionManager.saveUserQuery(userQueryText, summary).catch(console.error);

        const newUserMessage: ChatMessage = { 
            id: Date.now().toString(), 
            role: 'user', 
            text: input.trim() 
        };
        
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput('');
        
        if (inputRef.current) {
            inputRef.current.style.height = '3rem';
        }
        
        setIsLoading(true);
        streamingMessageRef.current = '';

        const modelMessageId = (Date.now() + 1).toString();
        const loadingMessage: ChatMessage = { 
            id: modelMessageId, 
            role: 'model', 
            text: '', 
            isLoading: true 
        };
        
        setMessages(prev => [...prev, loadingMessage]);
        
        abortControllerRef.current = new AbortController();

        try {
            let isStreamActive = true;
            let lastUpdateTime = 0;
            const UPDATE_THROTTLE = 100;
            
            await geminiService.streamChat(
                updatedMessages,
                (chunk) => {
                    if (!isStreamActive || abortControllerRef.current?.signal.aborted) {
                        return;
                    }
                    
                    const cleanChunk = chunk.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                    streamingMessageRef.current += cleanChunk;
                    
                    const now = Date.now();
                    if (now - lastUpdateTime >= UPDATE_THROTTLE) {
                        lastUpdateTime = now;
                        
                        setMessages(prevMessages => 
                            prevMessages.map(msg =>
                                msg.id === modelMessageId 
                                    ? { ...msg, text: streamingMessageRef.current, isLoading: true }
                                    : msg
                            )
                        );
                    }
                }
            );
            
            isStreamActive = false;
            
            // Final update - ensure message is preserved
            const finalText = streamingMessageRef.current;
            if (finalText && !abortControllerRef.current?.signal.aborted) {
                setMessages(prevMessages => 
                    prevMessages.map(msg =>
                        msg.id === modelMessageId 
                            ? { ...msg, text: finalText, isLoading: false }
                            : msg
                    )
                );
            }
            
        } catch (error: any) {
            if (!abortControllerRef.current?.signal.aborted) {
                console.error("Streaming error:", error);
                setMessages(prevMessages => 
                    prevMessages.map(msg =>
                        msg.id === modelMessageId 
                            ? { 
                                ...msg, 
                                text: streamingMessageRef.current || "I apologize, but I encountered an error. Please try again.", 
                                isLoading: false 
                              }
                            : msg
                    )
                );
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
            streamingMessageRef.current = '';
            inputRef.current?.focus();
        }
    }, [input, isLoading, messages]);
    
    return (
        <div className="w-full h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg flex flex-col overflow-hidden">
            <header className="p-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">AI Chat Assistant</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Your expert data science partner</p>
                    </div>
                    <button
                        onClick={toggleGlobalHistory}
                        className="px-3 py-2 text-sm bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-lg hover:shadow-glow-blue transition-all duration-300"
                    >
                        {showGlobalHistory ? 'Hide' : 'Show'} Global History
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {showGlobalHistory ? (
                    <div className="space-y-6">
                        {/* Analytics Section */}
                        {analytics && (
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-4">Community Analytics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-accent-blue">{analytics.totalSessions}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-accent-purple">{analytics.totalQueries}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Queries</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-500">{analytics.averageQueriesPerSession}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg per Session</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-orange-500">{analytics.topTopics.length}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Topics</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Global History Section */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Recent Community Questions</h3>
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {globalHistory.map((item, index) => (
                                        <motion.div
                                            key={`${item.sessionId}-${index}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                                        >
                                            <div className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                                                {item.query}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                                                <span>Session: {item.sessionId.slice(-8)}</span>
                                                <span>{new Date(item.timestamp).toLocaleString()}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {globalHistory.length === 0 && !isLoadingHistory && (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            No global history available yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <AnimatePresence mode="popLayout">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <footer className="p-4 border-t border-border-light dark:border-border-dark flex-shrink-0">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Ask about PostgreSQL, Python, stats, or upload a dataset..."
                        className="w-full min-h-[3rem] max-h-48 p-3 pr-20 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-blue focus:outline-none resize-none transition-all duration-300 overflow-y-auto leading-normal"
                        rows={1}
                        disabled={isLoading}
                        style={{ height: '3rem' }}
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

const MessageBubble: React.FC<{ message: ChatMessage }> = React.memo(({ message }) => {
    const isModel = message.role === 'model';
    
    return (
        <div
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
                style={{ 
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    minHeight: '3rem',
                    display: 'block'
                }}
            >
                <FormattedMessageContent content={message.text} />
                {message.isLoading && (
                    <div className="flex items-center mt-2">
                        <div className="flex space-x-1">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: 0,
                                }}
                                className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full"
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: 0.2,
                                }}
                                className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full"
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: 0.4,
                                }}
                                className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full"
                            />
                        </div>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Thinking...</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ChatModule;