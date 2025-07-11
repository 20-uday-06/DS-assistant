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
- Provide comprehensive, detailed explanations with relevant emojis throughout 📚✨
- Include background, theory, applications, and examples 🔬
- Add code snippets and practical implementations 💻 (minimal comments - only for complex parts)
- Cover advantages, disadvantages, and use cases 📊
- Make them feel completely confident about the topic 🎯
- Use emojis liberally to make content engaging 😊🚀

For SPECIFIC/DIRECT questions (e.g., "what is z test formula", "difference between list and tuple"):
- Give DIRECT, concise answers immediately ⚡
- No unnecessary background or lengthy explanations
- Focus ONLY on what they specifically asked 🎯
- Be precise and to-the-point
- If it's a formula, give the formula. If it's a quick fact, state it clearly.
- Still use relevant emojis to make it friendly 😊

🔧 TECHNICAL APPROACH:
- Always include working code examples when relevant 💻
- Keep code comments minimal - only for truly complex logic 🤓
- Mention best practices and common pitfalls ⚠️
- Show real-world applications where appropriate 🌍
- Compare different approaches when it adds value 🔄
- Use emojis extensively to make responses engaging and friendly 😊🎉

EMOJI USAGE RULES:
- Start sections with relevant emojis 🚀
- Use emojis in bullet points ✅
- Add emojis to highlight key concepts 💡
- Use celebration emojis for achievements 🎉
- Include tool/technology emojis (🐍 for Python, 📊 for data, 🤖 for ML, etc.)
- Make every response feel lively and engaging! 😄

IMPORTANT: At the end of COMPREHENSIVE responses only (not direct/specific answers), add:

📚 Related Topics You Might Like:
- Topic 1: Brief description 🔗
- Topic 2: Brief description 🔗  
- Topic 3: Brief description 🔗

Your goal: Give users EXACTLY what they're looking for with LOTS of relevant emojis - comprehensive learning for broad questions, direct answers for specific queries. Make every response feel exciting and engaging! 🚀✨😊`;

const NEET_DOUBT_EXPERT_PROMPT = `You are a Class 11th and 12th NCERT expert specializing in Physics, Chemistry, and Biology for NEET preparation.

🎯 RESPONSE STRATEGY - MATCH THE QUESTION TYPE:

For BROAD/CONCEPTUAL questions (e.g., "explain projectile motion", "what is photosynthesis"):
- Provide comprehensive explanations with NCERT depth 📚
- Include theory, real-life examples, and visual descriptions 🔬
- Cover all aspects: definition, mechanism, significance, applications ✨
- Use memory techniques and mnemonics 🧠
- Connect to NEET exam patterns and question types 🎯
- Reference NCERT chapters and diagrams 📖
- Use emojis extensively to make learning fun and engaging! 😊🎉

For SPECIFIC/DIRECT questions (e.g., "formula for projectile motion", "what is unit of force"):
- Give DIRECT, precise answers immediately ⚡
- No unnecessary explanations or background
- State the exact fact, formula, or information requested 🎯
- Be concise and crystal clear
- Still use relevant emojis to keep it friendly 😊

For NUMERICAL/PROBLEM questions:
- Show step-by-step solution clearly 📝
- Use NCERT methodology and standard formulas 📐
- Point out common mistakes to avoid ⚠️
- Include units and significant figures 📊
- Keep code comments minimal - only for complex logic 🤓

🎯 NEET-SPECIFIC APPROACH:
- Use exact NCERT terminology and language 📚
- Reference specific chapters when helpful 📖
- Mention how concepts appear in NEET questions 🎯
- Include memory tricks for complex topics 🧠
- Connect to previous year NEET patterns 📊

EMOJI USAGE RULES:
- Start sections with subject emojis (⚡ Physics, 🧪 Chemistry, 🧬 Biology)
- Use emojis in bullet points ✅
- Add emojis to highlight key concepts 💡
- Use celebration emojis for achievements 🎉
- Include relevant subject emojis throughout 🔬⚗️🧬
- Make every response feel lively and engaging! 😄

Your goal: Give NEET students EXACTLY what they need with LOTS of engaging emojis! 🚀✨😊`;

const JEE_DOUBT_EXPERT_PROMPT = `You are a Class 11th and 12th expert specializing in Physics, Chemistry, and Mathematics for JEE Main and Advanced preparation.

🎯 RESPONSE STRATEGY - MATCH THE QUESTION TYPE:

For BROAD/CONCEPTUAL questions (e.g., "explain integration", "what is entropy"):
- Provide comprehensive explanations with mathematical rigor 📚
- Include theory, derivations, and mathematical proofs where applicable 🔬
- Cover all aspects: definition, physical significance, applications, limitations ✨
- Use mathematical visualization and geometric interpretation 📐
- Connect to JEE exam patterns and question types (both Main and Advanced) 🎯
- Reference NCERT chapters and advanced concepts 📖
- Use emojis extensively to make complex topics more engaging! 😊🎉

For SPECIFIC/DIRECT questions (e.g., "formula for acceleration", "what is derivative of sin x"):
- Give DIRECT, precise answers immediately ⚡
- No unnecessary explanations or background
- State the exact fact, formula, or information requested 🎯
- Be concise and crystal clear
- Still use relevant emojis to keep it friendly 😊

For NUMERICAL/PROBLEM questions:
- Show step-by-step solution with mathematical precision 📝
- Use multiple approaches when applicable (algebraic, geometric, calculus) 🔄
- Point out common mistakes and conceptual traps ⚠️
- Include proper units, significant figures, and mathematical notation 📊
- Keep code comments minimal - only for complex logic 🤓

🎯 JEE-SPECIFIC APPROACH:
- Use exact mathematical terminology and notation 📚
- Reference specific chapters when helpful 📖
- Mention how concepts appear in JEE Main and Advanced questions 🎯
- Include problem-solving strategies and shortcuts 🧠
- Connect to previous year JEE patterns and difficulty levels 📊

EMOJI USAGE RULES:
- Start sections with subject emojis (⚡ Physics, 🧪 Chemistry, 📐 Mathematics)
- Use emojis in bullet points ✅
- Add emojis to highlight key concepts 💡
- Use celebration emojis for achievements 🎉
- Include relevant subject emojis throughout 🔬⚗️📊
- Make every response feel lively and engaging! 😄

Your goal: Give JEE students EXACTLY what they need with LOTS of exciting emojis! 🚀✨😊`;

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
            color: theme === 'dark' ? '#e2e8f0' : '#334155',
            maxWidth: '100%',
            overflow: 'hidden'
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
                    ? 'bg-gray-100 dark:bg-gray-800' 
                    : 'bg-white dark:bg-gray-900'
            } border-b border-gray-200 dark:border-gray-700`}
        >
            <div className="max-w-5xl mx-auto px-6 py-8 flex gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                            isModel 
                                ? 'bg-gray-600 dark:bg-gray-700' 
                                : 'bg-blue-500'
                        }`}
                    >
                        {isModel ? '🤖' : '👤'}
                    </motion.div>
                </div>
                
                {/* Message Content */}
                <div className="flex-1 min-w-0 max-w-none overflow-hidden">
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
                                            className="w-2 h-2 bg-blue-500 rounded-full"
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
        // Only auto-scroll for new messages, not when user is manually scrolling
        if (isLoading) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }, [isLoading]);

    useEffect(() => {
        // Only scroll to bottom when loading new messages
        if (isLoading) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom, isLoading]);

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
            // Check if we're in development or production
            const isProduction = window.location.hostname !== 'localhost';
            let history: GlobalHistoryItem[] = [];
            
            if (!isProduction) {
                // Only try backend in development
                try {
                    const response = await fetch('http://localhost:5000/api/history/global');
                    if (response.ok) {
                        const data = await response.json();
                        history = data || [];
                    }
                } catch (backendError) {
                    console.log('Backend not available, using mock data');
                }
            }
            
            // If no data from backend or in production, use mock data
            if (history.length === 0) {
                history = [
                    {
                        query: "What are the best practices for data preprocessing?",
                        sessionId: "session-004",
                        timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
                    },
                    {
                        query: "Explain the difference between supervised and unsupervised learning",
                        sessionId: "session-002", 
                        timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
                    },
                    {
                        query: "How to implement a neural network in Python?",
                        sessionId: "session-003",
                        timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
                    },
                    {
                        query: "What is machine learning and how does it work?",
                        sessionId: "session-001",
                        timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
                    },
                    {
                        query: "How do I use pandas for data analysis?",
                        sessionId: "session-005",
                        timestamp: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
                    },
                    {
                        query: "What's the difference between linear and logistic regression?",
                        sessionId: "session-006",
                        timestamp: new Date(Date.now() - 14400000).toISOString() // 4 hours ago
                    },
                    {
                        query: "How to handle missing values in datasets?",
                        sessionId: "session-007",
                        timestamp: new Date(Date.now() - 21600000).toISOString() // 6 hours ago
                    },
                    {
                        query: "Explain random forest algorithm with example",
                        sessionId: "session-008",
                        timestamp: new Date(Date.now() - 25200000).toISOString() // 7 hours ago
                    }
                ];
            }
            
            // Sort by timestamp (most recent first)
            history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            console.log('Global history loaded:', history.length, 'items');
            setGlobalHistory(history);
            
        } catch (error) {
            console.error('Failed to fetch global history:', error);
            // Fallback to empty array
            setGlobalHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            // Check if we're in development or production
            const isProduction = window.location.hostname !== 'localhost';
            let analytics: Analytics | null = null;
            
            if (!isProduction) {
                // Only try backend in development
                try {
                    const response = await fetch('http://localhost:5000/api/analytics');
                    if (response.ok) {
                        const data = await response.json();
                        analytics = data;
                    }
                } catch (backendError) {
                    console.log('Backend not available, using mock analytics');
                }
            }
            
            // If no data from backend or in production, use mock data
            if (!analytics) {
                analytics = {
                    totalSessions: 247,
                    totalQueries: 891,
                    topTopics: [
                        { topic: "Machine Learning", count: 87 },
                        { topic: "Data Analysis", count: 73 },
                        { topic: "Python Programming", count: 65 },
                        { topic: "Statistics", count: 52 },
                        { topic: "Deep Learning", count: 41 }
                    ],
                    averageQueriesPerSession: "3.6"
                };
            }
            
            setAnalytics(analytics);
            
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
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Chat Messages Container - Fixed height with internal scroll */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 dark:scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-track-gray-700 min-h-0 chat-scroll-container">
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
                                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalSessions}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{analytics.totalQueries}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Queries</div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.averageQueriesPerSession}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Avg per Session</div>
                                        </div>
                                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
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
                                                <p>No community history available yet.</p>
                                                <p className="text-sm mt-2">This might be due to backend unavailability.</p>
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
                                    <div className="max-w-4xl mx-auto">
                                        <motion.h1 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-5xl font-bold text-gray-900 dark:text-white mb-6"
                                        >
                                            What's on your mind today?
                                        </motion.h1>
                                        
                                        <motion.p 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            className="text-xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed font-medium"
                                        >
                                            {appMode === 'neet' 
                                                ? 'I\'m here to help with all your data science questions and insights ✨📊📚🚀' 
                                                : appMode === 'jee'
                                                ? 'I\'m here to help with all your data science questions and insights ✨📊��'
                                                : 'I\'m here to help with all your data science questions and insights ✨📊�🚀'
                                            }
                                        </motion.p>
                                        
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6 }}
                                            className="flex justify-center"
                                        >
                                            <motion.button
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={toggleGlobalHistory}
                                                className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-lg"
                                            >
                                                🌍 Explore Community Questions
                                            </motion.button>
                                        </motion.div>
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

            {/* Input Section - Fixed at bottom with transparent background */}
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex-shrink-0 bg-transparent"
            >
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-3xl border-2 border-gray-300 dark:border-gray-500 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-all duration-200 shadow-xl hover:shadow-2xl min-h-[72px]">
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
                                className="flex-1 min-h-[60px] max-h-[200px] p-6 pr-16 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none text-lg chat-input-textarea"
                                rows={1}
                                disabled={isLoading}
                                style={{ 
                                    height: '60px',
                                    lineHeight: '1.5',
                                    paddingTop: '18px',
                                    paddingBottom: '18px'
                                }}
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
                                        className="p-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
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
