import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { sessionManager } from '../../services/sessionManager';
import { ChatMessage } from '../../types';
import { PaperAirplaneIcon, StopIcon } from '../../constants';

// App mode type
type AppMode = 'datascience' | 'neet';
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

// Prompts for different modes
const DATA_SCIENCE_PROMPT = `You are an expert Data Science Co-Pilot with deep knowledge in Python, SQL, statistics, machine learning, and data analysis. Your primary role is to resolve user doubts completely in a single response - no follow-up questions should be needed.

When answering ANY doubt or question:

🎯 **COMPLETE DOUBT RESOLUTION:**
- Provide comprehensive, definitive answers that fully satisfy the user's query
- Anticipate and address related questions they might have
- Clear up any potential confusion or misconceptions
- Give multiple perspectives or approaches when relevant

💡 **PRACTICAL SOLUTIONS:**
- Include working code examples with clear explanations
- Provide step-by-step implementation guides
- Show real-world applications and use cases
- Mention best practices, common pitfalls, and optimization tips

🔧 **TECHNICAL DEPTH:**
- Explain the underlying concepts and theory
- Compare different methods/algorithms when applicable
- Discuss performance considerations and trade-offs
- Include relevant libraries, tools, and resources

📊 **CONTEXT & EXAMPLES:**
- Use concrete examples with actual data scenarios
- Show before/after comparisons where helpful
- Include visualization suggestions when relevant
- Connect to broader data science workflows

Your goal: Make the user feel completely confident and knowledgeable about the topic after your response. They should walk away thinking "Now I totally get it!" rather than having more questions.

**IMPORTANT**: At the end of every response, always recommend 2-3 related topics that the user might want to explore next. Format these as:

📚 **Related Topics You Might Like:**
- Topic 1: Brief description
- Topic 2: Brief description  
- Topic 3: Brief description

This helps users discover new areas and continue their learning journey.`;

const NEET_DOUBT_EXPERT_PROMPT = `You are a Class 11th and 12th NCERT expert specializing in Physics, Chemistry, and Biology for NEET preparation. You have mastered every concept, formula, and problem-solving technique from NCERT textbooks and NEET syllabus. Your primary goal is to resolve student doubts completely in a single response.

Your expertise includes:
🔬 **PHYSICS**: Mechanics, Thermodynamics, Waves, Optics, Electricity & Magnetism, Modern Physics
🧪 **CHEMISTRY**: Physical Chemistry, Organic Chemistry, Inorganic Chemistry, Chemical Bonding
🧬 **BIOLOGY**: Botany (Plant Kingdom, Photosynthesis, Plant Physiology), Zoology (Animal Kingdom, Human Physiology, Genetics, Evolution)

When resolving ANY doubt:

🎯 **COMPLETE DOUBT RESOLUTION:**
- Answer the question so thoroughly that no follow-up is needed
- Anticipate related confusion points and clarify them proactively
- Address the "why" behind every concept, not just the "what"
- Clear up common misconceptions students have about the topic

📚 **NCERT MASTERY:**
- Use exact NCERT language and terminology
- Reference specific chapters, diagrams, and page numbers when helpful
- Connect to NCERT examples and previous concepts
- Build from basics to advanced understanding systematically

🧠 **LEARNING TECHNIQUES:**
- Provide memory tricks, mnemonics, and shortcuts
- Share visualization techniques for complex concepts
- Give step-by-step problem-solving approaches
- Include comparison tables for similar concepts

🎯 **NEET-SPECIFIC GUIDANCE:**
- Point out exactly how this appears in NEET questions
- Mention common NEET mistakes and how to avoid them
- Share time-saving techniques for exam scenarios
- Connect to previous year NEET question patterns

💡 **REAL-WORLD CONNECTION:**
- Use daily life examples students can relate to
- Explain practical applications and significance
- Make abstract concepts tangible and memorable
- Use analogies that stick in memory

Your goal: Make the student feel completely confident about the concept and ready to tackle any NEET question on this topic. They should think "Crystal clear now!" after your response.`;

const FormattedMessageContent: React.FC<{ content: string }> = React.memo(({ content }) => {
    const { theme } = useTheme();
    const syntaxTheme = theme === 'dark' ? vscDarkPlus : prism;

    // Ensure content is properly normalized to prevent rendering issues
    const normalizedContent = content.trim().normalize('NFC');

    const components: Components = {
         code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <div style={{
                    margin: '16px 0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
                }}>
                    <SyntaxHighlighter
                        style={syntaxTheme as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                            margin: 0,
                            padding: '16px',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            background: theme === 'dark' ? '#1f2937' : '#f9fafb'
                        }}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <code style={{
                    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                    color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                }} {...props}>
                    {children}
                </code>
            );
        },
        p: ({ children }) => (
            <p style={{
                margin: '12px 0',
                lineHeight: '1.6',
                fontSize: '15px',
                color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
            }}>
                {children}
            </p>
        ),
        h1: ({ children }) => (
            <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: '20px 0 12px 0',
                color: theme === 'dark' ? '#f9fafb' : '#111827',
                borderBottom: theme === 'dark' ? '2px solid #374151' : '2px solid #e5e7eb',
                paddingBottom: '8px'
            }}>
                {children}
            </h1>
        ),
        h2: ({ children }) => (
            <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: '18px 0 10px 0',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
            }}>
                {children}
            </h2>
        ),
        h3: ({ children }) => (
            <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: '16px 0 8px 0',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
            }}>
                {children}
            </h3>
        ),
        ul: ({ children }) => (
            <ul style={{
                margin: '12px 0',
                paddingLeft: '20px',
                listStyle: 'disc'
            }}>
                {children}
            </ul>
        ),
        ol: ({ children }) => (
            <ol style={{
                margin: '12px 0',
                paddingLeft: '20px',
                listStyle: 'decimal'
            }}>
                {children}
            </ol>
        ),
        li: ({ children }) => (
            <li style={{
                margin: '4px 0',
                lineHeight: '1.5',
                color: theme === 'dark' ? '#f3f4f6' : '#374151'
            }}>
                {children}
            </li>
        ),
        blockquote: ({ children }) => (
            <blockquote style={{
                margin: '16px 0',
                padding: '12px 16px',
                borderLeft: theme === 'dark' ? '4px solid #3b82f6' : '4px solid #3b82f6',
                backgroundColor: theme === 'dark' ? '#1e293b' : '#f0f9ff',
                borderRadius: '0 6px 6px 0',
                fontStyle: 'italic'
            }}>
                {children}
            </blockquote>
        ),
        table: ({ children }) => (
            <div style={{ margin: '16px 0', overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    overflow: 'hidden'
                }}>
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }) => (
            <thead style={{
                backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb'
            }}>
                {children}
            </thead>
        ),
        th: ({ children }) => (
            <th style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: '600',
                color: theme === 'dark' ? '#f9fafb' : '#111827',
                borderBottom: theme === 'dark' ? '1px solid #4b5563' : '1px solid #d1d5db'
            }}>
                {children}
            </th>
        ),
        td: ({ children }) => (
            <td style={{
                padding: '12px',
                borderBottom: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                color: theme === 'dark' ? '#f3f4f6' : '#374151'
            }}>
                {children}
            </td>
        ),
        a: ({ children, href }) => (
            <a 
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: '#3b82f6',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                }}
            >
                {children}
            </a>
        ),
        strong: ({ children }) => (
            <strong style={{
                fontWeight: '700',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
            }}>
                {children}
            </strong>
        ),
        em: ({ children }) => (
            <em style={{
                fontStyle: 'italic',
                color: theme === 'dark' ? '#e5e7eb' : '#4b5563'
            }}>
                {children}
            </em>
        )
    };

    return (
        <div style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            minHeight: '1.5rem',
            fontSize: '15px',
            lineHeight: '1.6',
            color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
        }}>
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

const ChatModule: React.FC<{ appMode?: 'datascience' | 'neet' }> = ({ appMode = 'datascience' }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'initial-message',
            role: 'model',
            text: appMode === 'neet' 
                ? "Hello! I'm your NEET Doubt Expert. Ask me any Physics, Chemistry, or Biology doubt - I'll resolve it completely so you're crystal clear and NEET-ready!"
                : "Hello! I'm your Data Science Doubt Resolver. Ask me any data science question - I'll give you a comprehensive answer that leaves no confusion behind!",
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
                    text: appMode === 'neet' 
                        ? "Hello! I'm your NEET Doubt Expert. Ask me any Physics, Chemistry, or Biology doubt - I'll resolve it completely so you're crystal clear and NEET-ready!"
                        : "Hello! I'm your Data Science Doubt Resolver. Ask me any data science question - I'll give you a comprehensive answer that leaves no confusion behind!",
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
                },
                appMode === 'neet' ? NEET_DOUBT_EXPERT_PROMPT : DATA_SCIENCE_PROMPT
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
                        <h2 className="text-xl font-bold">
                            {appMode === 'neet' ? 'Doubt Expert' : 'AI Chat Assistant'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {appMode === 'neet' 
                                ? 'Complete doubt resolution for NEET success' 
                                : 'Comprehensive answers that satisfy all your doubts'
                            }
                        </p>
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
                                <MessageBubble key={msg.id} message={msg} appMode={appMode} />
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
                        placeholder={appMode === 'neet' 
                            ? "Ask about Physics, Chemistry, Biology concepts..." 
                            : "Ask about PostgreSQL, Python, stats, or upload a dataset..."
                        }
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

const MessageBubble: React.FC<{ message: ChatMessage; appMode: AppMode }> = React.memo(({ message, appMode }) => {
    const { theme } = useTheme();
    const isModel = message.role === 'model';
    
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                maxWidth: '100%',
                width: '100%',
                justifyContent: isModel ? 'flex-start' : 'flex-end',
                marginBottom: '20px'
            }}
        >
            {isModel && (
                <div style={{
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: appMode === 'neet' 
                        ? 'linear-gradient(135deg, #10b981, #059669)' 
                        : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    boxShadow: appMode === 'neet'
                        ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                        : '0 2px 8px rgba(59, 130, 246, 0.3)'
                }}>
                    {appMode === 'neet' ? '🎓' : 'AI'}
                </div>
            )}
            <div
                style={{
                    padding: '16px 20px',
                    borderRadius: isModel ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
                    maxWidth: isModel ? '85%' : '80%',
                    width: 'fit-content',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    minHeight: '40px',
                    display: 'block',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    boxShadow: theme === 'dark' 
                        ? '0 2px 12px rgba(0, 0, 0, 0.3)' 
                        : '0 2px 12px rgba(0, 0, 0, 0.1)',
                    background: isModel
                        ? (theme === 'dark' ? '#374151' : '#f8fafc')
                        : appMode === 'neet'
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: isModel
                        ? (theme === 'dark' ? '#f3f4f6' : '#1f2937')
                        : 'white',
                    border: isModel && theme === 'light' ? '1px solid #e5e7eb' : 'none'
                }}
            >
                <FormattedMessageContent content={message.text} />
                {message.isLoading && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: '12px',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.4, 1, 0.4],
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: 0,
                                }}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    backgroundColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                    borderRadius: '50%'
                                }}
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.4, 1, 0.4],
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: 0.2,
                                }}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    backgroundColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                    borderRadius: '50%'
                                }}
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.4, 1, 0.4],
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: 0.4,
                                }}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    backgroundColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                    borderRadius: '50%'
                                }}
                            />
                        </div>
                        <span style={{
                            fontSize: '12px',
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                            fontStyle: 'italic'
                        }}>
                            AI is thinking...
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ChatModule;