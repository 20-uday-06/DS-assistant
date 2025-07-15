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

// Enhanced prompts with emojis
const DATA_SCIENCE_PROMPT = `You are an expert Data Science Co-Pilot with deep knowledge in Python, SQL, statistics, Machine learning, Deep Learning and data analysis. 

🎯 RESPONSE STRATEGY - MATCH THE QUESTION TYPE:

For BROAD/CONCEPTUAL questions (e.g., "what is z test", "explain machine learning"):
- Provide comprehensive, detailed explanations with relevant emojis 📚✨
- Include background, theory, applications, and examples 🔬
- Add code snippets and practical implementations 💻
- Cover advantages, disadvantages, and use cases 📊
- Make them feel completely confident about the topic 🎯

For SPECIFIC/DIRECT questions (e.g., "what is z test formula", "difference between list and tuple"):
- Give DIRECT, concise answers immediately ⚡
- No unnecessary background or lengthy explanations
- Focus ONLY on what they specifically asked 🎯
- Be precise and to-the-point
- If it's a formula, give the formula. If it's a quick fact, state it clearly.

🔧 TECHNICAL APPROACH:
- Always include working code examples when relevant 💻
- Mention best practices and common pitfalls ⚠️
- Show real-world applications where appropriate 🌍
- Compare different approaches when it adds value 🔄
- Use emojis to make responses engaging and friendly 😊

IMPORTANT: At the end of COMPREHENSIVE responses only (not direct/specific answers), add:

📚 Related Topics You Might Like:
- Topic 1: Brief description 🔗
- Topic 2: Brief description 🔗
- Topic 3: Brief description 🔗

Your goal: Give users EXACTLY what they're looking for - comprehensive learning for broad questions, direct answers for specific queries. Always use emojis to make responses friendly and engaging! 🚀`;

const NEET_DOUBT_EXPERT_PROMPT = `You are a Class 11th and 12th NCERT expert specializing in Physics, Chemistry, and Biology for NEET preparation.

🎯 RESPONSE STRATEGY - MATCH THE QUESTION TYPE:

For BROAD/CONCEPTUAL questions (e.g., "explain projectile motion", "what is photosynthesis"):
- Provide comprehensive explanations with NCERT depth 📚
- Include theory, real-life examples, and visual descriptions 🔬
- Cover all aspects: definition, mechanism, significance, applications ✨
- Use memory techniques and mnemonics 🧠
- Connect to NEET exam patterns and question types 🎯
- Reference NCERT chapters and diagrams 📖
- Use emojis to make learning fun and engaging! 😊

For SPECIFIC/DIRECT questions (e.g., "formula for projectile motion", "what is unit of force"):
- Give DIRECT, precise answers immediately ⚡
- No unnecessary explanations or background
- State the exact fact, formula, or information requested 🎯
- Be concise and crystal clear

For NUMERICAL/PROBLEM questions:
- Show step-by-step solution clearly 📝
- Use NCERT methodology and standard formulas 📐
- Point out common mistakes to avoid ⚠️
- Include units and significant figures 📊

🎯 NEET-SPECIFIC APPROACH:
- Use exact NCERT terminology and language 📚
- Reference specific chapters when helpful 📖
- Mention how concepts appear in NEET questions 🎯
- Include memory tricks for complex topics 🧠
- Connect to previous year NEET patterns 📊

Your goal: Give NEET students EXACTLY what they need with engaging emojis! 🚀`;

const JEE_DOUBT_EXPERT_PROMPT = `You are a Class 11th and 12th expert specializing in Physics, Chemistry, and Mathematics for JEE Main and Advanced preparation.

🎯 RESPONSE STRATEGY - MATCH THE QUESTION TYPE:

For BROAD/CONCEPTUAL questions (e.g., "explain integration", "what is entropy"):
- Provide comprehensive explanations with mathematical rigor 📚
- Include theory, derivations, and mathematical proofs where applicable 🔬
- Cover all aspects: definition, physical significance, applications, limitations ✨
- Use mathematical visualization and geometric interpretation 📐
- Connect to JEE exam patterns and question types (both Main and Advanced) 🎯
- Reference NCERT chapters and advanced concepts 📖
- Use emojis to make complex topics more engaging! 😊

For SPECIFIC/DIRECT questions (e.g., "formula for acceleration", "what is derivative of sin x"):
- Give DIRECT, precise answers immediately ⚡
- No unnecessary explanations or background
- State the exact fact, formula, or information requested 🎯
- Be concise and crystal clear

For NUMERICAL/PROBLEM questions:
- Show step-by-step solution with mathematical precision 📝
- Use multiple approaches when applicable (algebraic, geometric, calculus) 🔄
- Point out common mistakes and conceptual traps ⚠️
- Include proper units, significant figures, and mathematical notation 📊

🎯 JEE-SPECIFIC APPROACH:
- Use exact mathematical terminology and notation 📚
- Reference specific chapters when helpful 📖
- Mention how concepts appear in JEE Main and Advanced questions 🎯
- Include problem-solving strategies and shortcuts 🧠
- Connect to previous year JEE patterns and difficulty levels 📊

Your goal: Give JEE students EXACTLY what they need with exciting emojis! 🚀`;

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
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <SyntaxHighlighter
                        style={syntaxTheme as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                            margin: 0,
                            padding: '20px',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            background: theme === 'dark' ? '#1f2937' : '#f8fafc'
                        }}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <code style={{
                    backgroundColor: theme === 'dark' ? '#374151' : '#f1f5f9',
                    color: theme === 'dark' ? '#f8fafc' : '#1e293b',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'JetBrains Mono, Monaco, Consolas, "Courier New", monospace',
                    fontWeight: '500'
                }} {...props}>
                    {children}
                </code>
            );
        },
        p: ({ children }) => (
            <p style={{
                margin: '16px 0',
                lineHeight: '1.7',
                fontSize: '15px',
                color: theme === 'dark' ? '#e2e8f0' : '#334155'
            }}>
                {children}
            </p>
        ),
        h1: ({ children }) => (
            <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                margin: '24px 0 16px 0',
                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                borderBottom: `3px solid ${theme === 'dark' ? '#475569' : '#e2e8f0'}`,
                paddingBottom: '12px'
            }}>
                {children}
            </h1>
        ),
        h2: ({ children }) => (
            <h2 style={{
                fontSize: '22px',
                fontWeight: '600',
                margin: '20px 0 12px 0',
                color: theme === 'dark' ? '#f8fafc' : '#0f172a'
            }}>
                {children}
            </h2>
        ),
        h3: ({ children }) => (
            <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: '18px 0 10px 0',
                color: theme === 'dark' ? '#f8fafc' : '#0f172a'
            }}>
                {children}
            </h3>
        ),
        ul: ({ children }) => (
            <ul style={{
                margin: '16px 0',
                paddingLeft: '24px',
                listStyle: 'disc'
            }}>
                {children}
            </ul>
        ),
        ol: ({ children }) => (
            <ol style={{
                margin: '16px 0',
                paddingLeft: '24px',
                listStyle: 'decimal'
            }}>
                {children}
            </ol>
        ),
        li: ({ children }) => (
            <li style={{
                margin: '6px 0',
                lineHeight: '1.6',
                color: theme === 'dark' ? '#e2e8f0' : '#334155'
            }}>
                {children}
            </li>
        ),
        blockquote: ({ children }) => (
            <blockquote style={{
                margin: '20px 0',
                padding: '16px 20px',
                borderLeft: '4px solid #3b82f6',
                backgroundColor: theme === 'dark' ? '#374151' : '#f1f5f9',
                borderRadius: '0 8px 8px 0',
                fontStyle: 'italic',
                boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
            }}>
                {children}
            </blockquote>
        ),
        table: ({ children }) => (
            <div style={{ margin: '20px 0', overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }) => (
            <thead style={{
                backgroundColor: theme === 'dark' ? '#374151' : '#f8fafc'
            }}>
                {children}
            </thead>
        ),
        th: ({ children }) => (
            <th style={{
                padding: '16px',
                textAlign: 'left',
                fontWeight: '600',
                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#cbd5e1'}`
            }}>
                {children}
            </th>
        ),
        td: ({ children }) => (
            <td style={{
                padding: '16px',
                borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e2e8f0'}`,
                color: theme === 'dark' ? '#e2e8f0' : '#334155'
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
                    cursor: 'pointer',
                    fontWeight: '500'
                }}
            >
                {children}
            </a>
        ),
        strong: ({ children }) => (
            <strong style={{
                fontWeight: '700',
                color: theme === 'dark' ? '#f8fafc' : '#0f172a'
            }}>
                {children}
            </strong>
        ),
        em: ({ children }) => (
            <em style={{
                fontStyle: 'italic',
                color: theme === 'dark' ? '#e2e8f0' : '#334155'
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
            lineHeight: '1.7',
            color: theme === 'dark' ? '#e2e8f0' : '#334155'
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
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`w-full ${
                isModel 
                    ? 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/30' 
                    : 'bg-white dark:bg-slate-900/70'
            } border-b border-gray-100 dark:border-gray-700/50`}
        >
            <div className="max-w-4xl mx-auto px-6 py-8 flex gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                            isModel 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}
                    >
                        {isModel ? '🤖' : '👤'}
                    </motion.div>
                </div>
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
                        <FormattedMessageContent content={message.text} />
                        {message.isLoading && (
                            <div className="flex items-center gap-3 mt-4">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                opacity: [0.3, 1, 0.3],
                                                scale: [1, 1.2, 1],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                delay: i * 0.2,
                                            }}
                                            className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                                        />
                                    ))}
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

const ChatModule: React.FC<{ appMode?: 'datascience' | 'neet' | 'jee' }> = ({ appMode = 'datascience' }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'initial-message',
            role: 'model',
            text: appMode === 'neet' 
                ? "Hello! I'm your NEET Doubt Expert 🎯 Ask me any Physics, Chemistry, or Biology doubt - I'll resolve it completely so you're crystal clear and NEET-ready! 🚀"
                : appMode === 'jee'
                ? "Hello! I'm your JEE Doubt Expert 🎯 Ask me any Physics, Chemistry, or Mathematics doubt - I'll resolve it completely so you're crystal clear and JEE-ready! 🚀"
                : "Hello! I'm your Data Science Doubt Resolver 🤖 Ask me any data science question - I'll give you a comprehensive answer that leaves no confusion behind! ✨",
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
        textarea.style.height = '48px';
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
                        ? "Hello! I'm your NEET Doubt Expert 🎯 Ask me any Physics, Chemistry, or Biology doubt - I'll resolve it completely so you're crystal clear and NEET-ready! 🚀"
                        : appMode === 'jee'
                        ? "Hello! I'm your JEE Doubt Expert 🎯 Ask me any Physics, Chemistry, or Mathematics doubt - I'll resolve it completely so you're crystal clear and JEE-ready! 🚀"
                        : "Hello! I'm your Data Science Doubt Resolver 🤖 Ask me any data science question - I'll give you a comprehensive answer that leaves no confusion behind! ✨",
                }
            ]);
            setInput('');
            
            if (inputRef.current) {
                inputRef.current.style.height = '48px';
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
            inputRef.current.style.height = '48px';
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
        <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
            {/* Chat Messages Container - Fixed height with internal scroll */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    {showGlobalHistory ? (
                        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                            {/* Analytics Section */}
                            {analytics && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700"
                                >
                                    <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                                        📊 Community Analytics
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalSessions}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
                                        </div>
                                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{analytics.totalQueries}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Queries</div>
                                        </div>
                                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.averageQueriesPerSession}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Avg per Session</div>
                                        </div>
                                        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{analytics.topTopics.length}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Topics</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            
                            {/* Global History Section */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                                    🌍 Recent Community Questions
                                </h3>
                                {isLoadingHistory ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {globalHistory.map((item, index) => (
                                            <motion.div
                                                key={`${item.sessionId}-${index}`}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                                            >
                                                <div className="text-gray-900 dark:text-gray-100 mb-3 font-medium">
                                                    {item.query}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                        Session: {item.sessionId.slice(-8)}
                                                    </span>
                                                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {globalHistory.length === 0 && !isLoadingHistory && (
                                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                                <div className="text-6xl mb-4">📭</div>
                                                <p>No global history available yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    ) : (
                        <>
                            {/* Welcome Message - Only show when no messages except initial */}
                            {messages.length === 1 && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="px-6 py-16 text-center"
                                >
                                    <div className="max-w-3xl mx-auto">
                                        <motion.div 
                                            animate={{ 
                                                rotate: [0, 5, -5, 0],
                                                scale: [1, 1.1, 1]
                                            }}
                                            transition={{ 
                                                duration: 2,
                                                repeat: Infinity,
                                                repeatDelay: 3
                                            }}
                                            className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
                                        >
                                            <span className="text-white font-bold text-3xl">🤖</span>
                                        </motion.div>
                                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            {appMode === 'neet' ? 'NEET Doubt Expert' : 
                                             appMode === 'jee' ? 'JEE Doubt Expert' : 
                                             'AI Chat Assistant'}
                                        </h2>
                                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                            {appMode === 'neet' 
                                                ? 'Get comprehensive solutions for Physics, Chemistry, and Biology doubts 🧪⚡🧬' 
                                                : appMode === 'jee'
                                                ? 'Get comprehensive solutions for Physics, Chemistry, and Math doubts 📐⚗️🔢'
                                                : 'Get comprehensive answers to all your data science questions 📊💻🚀'
                                            }
                                        </p>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={toggleGlobalHistory}
                                            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                                        >
                                            🌍 View Community History
                                        </motion.button>
                                    </div>
                                </motion.div>
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

            {/* Input Section - Fixed at bottom with glass effect */}
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex-shrink-0 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-t border-gray-200/50 dark:border-gray-700/50"
            >
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="flex items-end bg-white dark:bg-slate-800 rounded-3xl border-2 border-gray-200 dark:border-gray-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-all duration-200 shadow-xl hover:shadow-2xl">
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
                                    ? "Ask about Physics, Chemistry, Biology concepts... 🧪⚡🧬" 
                                    : appMode === 'jee'
                                    ? "Ask about Physics, Chemistry, Mathematics concepts... 📐⚗️🔢"
                                    : "Ask about data science, Python, SQL, or analysis... 📊💻🚀"
                                }
                                className="flex-1 min-h-[60px] max-h-[200px] p-6 pr-16 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none text-lg"
                                rows={1}
                                disabled={isLoading}
                                style={{ height: '60px' }}
                            />
                            <div className="p-3">
                                {isLoading ? (
                                    <motion.button
                                        type="button"
                                        onClick={handleStop}
                                        className="p-3 rounded-2xl text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <StopIcon className="w-6 h-6" />
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <PaperAirplaneIcon className="w-6 h-6" />
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ChatModule;
