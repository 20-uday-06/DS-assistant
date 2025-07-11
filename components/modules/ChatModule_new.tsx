import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { sessionManager } from '../../services/sessionManager';
import { ChatMessage } from '../../types';
import { PaperAirplaneIcon, StopIcon } from '../../constants';

// App mode type
type AppMode = 'datascience' | 'neet' | 'jee';
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
const DATA_SCIENCE_PROMPT = `You are an expert Data Science Co-Pilot with deep knowledge in Python, SQL, statistics, Machine learning, Deep Learning and data analysis. Your role is to provide the PERFECT response based on the user's question type.

🎯 **RESPONSE STRATEGY - MATCH THE QUESTION TYPE:**

**For BROAD/CONCEPTUAL questions** (e.g., "what is z test", "explain machine learning", "how does neural network work"):
- Provide comprehensive, detailed explanations
- Include background, theory, applications, and examples
- Add code snippets and practical implementations
- Cover advantages, disadvantages, and use cases
- Make them feel completely confident about the topic

**For SPECIFIC/DIRECT questions** (e.g., "what is z test formula", "difference between list and tuple", "do we do input×weight or weight×input"):
- Give DIRECT, concise answers immediately
- No unnecessary background or lengthy explanations
- Focus ONLY on what they specifically asked
- Be precise and to-the-point
- If it's a formula, give the formula. If it's a quick fact, state it clearly.

🔧 **TECHNICAL APPROACH:**
- Always include working code examples when relevant
- Mention best practices and common pitfalls
- Show real-world applications where appropriate
- Compare different approaches when it adds value

**IMPORTANT**: At the end of COMPREHENSIVE responses only (not direct/specific answers), add:

📚 **Related Topics You Might Like:**
- Topic 1: Brief description
- Topic 2: Brief description  
- Topic 3: Brief description

Your goal: Give users EXACTLY what they're looking for - comprehensive learning for broad questions, direct answers for specific queries.`;

const NEET_DOUBT_EXPERT_PROMPT = `You are a Class 11th and 12th NCERT expert specializing in Physics, Chemistry, and Biology for NEET preparation. You provide the PERFECT response based on the question type.

🎯 **RESPONSE STRATEGY - MATCH THE QUESTION TYPE:**

**For BROAD/CONCEPTUAL questions** (e.g., "explain projectile motion", "what is photosynthesis", "how does heart work"):
- Provide comprehensive explanations with NCERT depth
- Include theory, real-life examples, and visual descriptions
- Cover all aspects: definition, mechanism, significance, applications
- Use memory techniques and mnemonics
- Connect to NEET exam patterns and question types
- Reference NCERT chapters and diagrams

**For SPECIFIC/DIRECT questions** (e.g., "formula for projectile motion", "what is unit of force", "which enzyme breaks down starch"):
- Give DIRECT, precise answers immediately
- No unnecessary explanations or background
- State the exact fact, formula, or information requested
- Be concise and crystal clear
- If it's a formula, just give the formula. If it's a definition, state it directly.

**For NUMERICAL/PROBLEM questions**:
- Show step-by-step solution clearly
- Use NCERT methodology and standard formulas
- Point out common mistakes to avoid
- Include units and significant figures

🎯 **NEET-SPECIFIC APPROACH:**
- Use exact NCERT terminology and language
- Reference specific chapters when helpful
- Mention how concepts appear in NEET questions
- Include memory tricks for complex topics
- Connect to previous year NEET patterns

🧠 **LEARNING TECHNIQUES:**
- Use daily life analogies for complex concepts
- Provide visualization techniques
- Share mnemonics and memory aids
- Include comparison tables for similar concepts

Your goal: Give NEET students EXACTLY what they need - comprehensive understanding for broad concepts, direct answers for specific queries, always keeping NEET success in mind.`;

const JEE_DOUBT_EXPERT_PROMPT = `You are a Class 11th and 12th expert specializing in Physics, Chemistry, and Mathematics for JEE Main and Advanced preparation. You provide the PERFECT response based on the question type.

🎯 **RESPONSE STRATEGY - MATCH THE QUESTION TYPE:**

**For BROAD/CONCEPTUAL questions** (e.g., "explain integration", "what is entropy", "how does induction work"):
- Provide comprehensive explanations with mathematical rigor
- Include theory, derivations, and mathematical proofs where applicable
- Cover all aspects: definition, physical significance, applications, limitations
- Use mathematical visualization and geometric interpretation
- Connect to JEE exam patterns and question types (both Main and Advanced)
- Reference NCERT chapters and advanced concepts

**For SPECIFIC/DIRECT questions** (e.g., "formula for acceleration", "what is derivative of sin x", "which reagent is used for this reaction"):
- Give DIRECT, precise answers immediately
- No unnecessary explanations or background
- State the exact fact, formula, or information requested
- Be concise and crystal clear
- If it's a formula, just give the formula. If it's a definition, state it directly.

**For NUMERICAL/PROBLEM questions**:
- Show step-by-step solution with mathematical precision
- Use multiple approaches when applicable (algebraic, geometric, calculus)
- Point out common mistakes and conceptual traps
- Include proper units, significant figures, and mathematical notation

🎯 **JEE-SPECIFIC APPROACH:**
- Use exact mathematical terminology and notation
- Reference specific chapters when helpful
- Mention how concepts appear in JEE Main and Advanced questions
- Include problem-solving strategies and shortcuts
- Connect to previous year JEE patterns and difficulty levels

🧠 **LEARNING TECHNIQUES:**
- Use mathematical analogies and geometric visualization
- Provide derivation techniques and mathematical insights
- Share problem-solving strategies and time management tips
- Include comparison tables for similar concepts and formulas

Your goal: Give JEE students EXACTLY what they need - comprehensive understanding for broad concepts, direct answers for specific queries, always keeping JEE success in mind.`;

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
                color: theme === 'dark' ? '#e5e7eb' : '#374151'
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
                borderBottom: `2px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
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
                color: theme === 'dark' ? '#e5e7eb' : '#374151'
            }}>
                {children}
            </li>
        ),
        blockquote: ({ children }) => (
            <blockquote style={{
                margin: '16px 0',
                padding: '12px 16px',
                borderLeft: '4px solid #3b82f6',
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
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
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
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
                borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`
            }}>
                {children}
            </th>
        ),
        td: ({ children }) => (
            <td style={{
                padding: '12px',
                borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                color: theme === 'dark' ? '#e5e7eb' : '#374151'
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
                color: theme === 'dark' ? '#e5e7eb' : '#374151'
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
            color: theme === 'dark' ? '#e5e7eb' : '#374151'
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

const MessageBubble: React.FC<{ message: ChatMessage; appMode: AppMode }> = React.memo(({ message, appMode }) => {
    const { theme } = useTheme();
    const isModel = message.role === 'model';
    
    return (
        <div className={`w-full ${isModel ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} border-b border-gray-200 dark:border-gray-700`}>
            <div className="max-w-3xl mx-auto px-4 py-6 flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-white font-bold text-xs ${
                        isModel 
                            ? 'bg-green-600' 
                            : 'bg-blue-600'
                    }`}>
                        {isModel ? 'AI' : 'U'}
                    </div>
                </div>
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
                        <FormattedMessageContent content={message.text} />
                        {message.isLoading && (
                            <div className="flex items-center gap-2 mt-3">
                                <div className="flex gap-1">
                                    <motion.div
                                        animate={{
                                            opacity: [0.3, 1, 0.3],
                                        }}
                                        transition={{
                                            duration: 1.2,
                                            repeat: Infinity,
                                            delay: 0,
                                        }}
                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                    />
                                    <motion.div
                                        animate={{
                                            opacity: [0.3, 1, 0.3],
                                        }}
                                        transition={{
                                            duration: 1.2,
                                            repeat: Infinity,
                                            delay: 0.4,
                                        }}
                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                    />
                                    <motion.div
                                        animate={{
                                            opacity: [0.3, 1, 0.3],
                                        }}
                                        transition={{
                                            duration: 1.2,
                                            repeat: Infinity,
                                            delay: 0.8,
                                        }}
                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

const ChatModule: React.FC<{ appMode?: 'datascience' | 'neet' | 'jee' }> = ({ appMode = 'datascience' }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'initial-message',
            role: 'model',
            text: appMode === 'neet' 
                ? "Hello! I'm your NEET Doubt Expert. Ask me any Physics, Chemistry, or Biology doubt - I'll resolve it completely so you're crystal clear and NEET-ready!"
                : appMode === 'jee'
                ? "Hello! I'm your JEE Doubt Expert. Ask me any Physics, Chemistry, or Mathematics doubt - I'll resolve it completely so you're crystal clear and JEE-ready!"
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
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        inputRef.current?.focus();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        setInput(textarea.value);
        
        // Auto-resize textarea (ChatGPT style)
        textarea.style.height = '44px';
        const scrollHeight = textarea.scrollHeight;
        const maxHeight = 200;
        textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }, []);

    const fetchGlobalHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const apiBase = window.location.hostname !== 'localhost' ? '' : 'http://localhost:5000';
            const response = await fetch(`${apiBase}/api/history/global`);
            if (response.ok) {
                const data = await response.json();
                setGlobalHistory(data.history || []);
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
                        : appMode === 'jee'
                        ? "Hello! I'm your JEE Doubt Expert. Ask me any Physics, Chemistry, or Mathematics doubt - I'll resolve it completely so you're crystal clear and JEE-ready!"
                        : "Hello! I'm your Data Science Doubt Resolver. Ask me any data science question - I'll give you a comprehensive answer that leaves no confusion behind!",
                }
            ]);
            setInput('');
            
            if (inputRef.current) {
                inputRef.current.style.height = '44px';
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
            inputRef.current.style.height = '44px';
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
                    if (abortControllerRef.current?.signal.aborted) {
                        isStreamActive = false;
                        return;
                    }
                    
                    streamingMessageRef.current += chunk;
                    
                    const now = Date.now();
                    if (now - lastUpdateTime >= UPDATE_THROTTLE) {
                        lastUpdateTime = now;
                        
                        if (isStreamActive) {
                            setMessages(prevMessages => 
                                prevMessages.map(msg =>
                                    msg.id === modelMessageId 
                                        ? { ...msg, text: streamingMessageRef.current, isLoading: true }
                                        : msg
                                )
                            );
                        }
                    }
                },
                appMode === 'neet' ? NEET_DOUBT_EXPERT_PROMPT : 
                appMode === 'jee' ? JEE_DOUBT_EXPERT_PROMPT : 
                DATA_SCIENCE_PROMPT
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
    }, [input, isLoading, messages, appMode]);
    
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Chat Messages - ChatGPT style */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    {showGlobalHistory ? (
                        <div className="px-4 py-8 space-y-6">
                            {/* Analytics Section */}
                            {analytics && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Community Analytics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalSessions}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.totalQueries}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Queries</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.averageQueriesPerSession}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Avg per Session</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analytics.topTopics.length}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Topics</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Global History Section */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Community Questions</h3>
                                {isLoadingHistory ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {globalHistory.map((item, index) => (
                                            <motion.div
                                                key={`${item.sessionId}-${index}`}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">
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
                            {/* Welcome Message - Only show when no messages */}
                            {messages.length === 1 && (
                                <div className="px-4 py-8 text-center">
                                    <div className="max-w-2xl mx-auto">
                                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-white font-bold text-xl">AI</span>
                                        </div>
                                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                            {appMode === 'neet' ? 'NEET Doubt Expert' : 
                                             appMode === 'jee' ? 'JEE Doubt Expert' : 
                                             'AI Chat Assistant'}
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                                            {appMode === 'neet' 
                                                ? 'Get comprehensive solutions for Physics, Chemistry, and Biology doubts' 
                                                : appMode === 'jee'
                                                ? 'Get comprehensive solutions for Physics, Chemistry, and Math doubts'
                                                : 'Get comprehensive answers to all your data science questions'
                                            }
                                        </p>
                                        <button
                                            onClick={toggleGlobalHistory}
                                            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            View Community History
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            <div className="space-y-0">
                                <AnimatePresence mode="popLayout">
                                    {messages.slice(1).map((msg) => (
                                        <MessageBubble key={msg.id} message={msg} appMode={appMode} />
                                    ))}
                                </AnimatePresence>
                                <div ref={messagesEndRef} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Input Section - ChatGPT style */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="flex items-end bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors shadow-sm">
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
                                    : appMode === 'jee'
                                    ? "Ask about Physics, Chemistry, Mathematics concepts..."
                                    : "Ask about data science, Python, SQL, or analysis..."
                                }
                                className="flex-1 min-h-[52px] max-h-[200px] p-4 pr-12 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none"
                                rows={1}
                                disabled={isLoading}
                                style={{ height: '52px' }}
                            />
                            <div className="p-2">
                                {isLoading ? (
                                    <motion.button
                                        type="button"
                                        onClick={handleStop}
                                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                    >
                                        <StopIcon className="w-5 h-5" />
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatModule;
