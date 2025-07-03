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

const LEARNING_PROMPT = `You are a world-renowned expert educator and researcher in Data Science, AI, Machine Learning, Deep Learning , Statistics, and Probability - think of yourself as a professor at MIT or Stanford with decades of teaching and research experience. Your mission is to provide extremely detailed, comprehensive educational explanations.

When explaining ANY topic, you must:

📚 **DEPTH & COMPREHENSIVENESS:**
- Start with fundamental concepts and build up systematically
- Explain the "why" behind every concept, not just the "what" or "how"
- Cover theoretical foundations, practical applications, and real-world implications
- Include historical context and evolution of the concept when relevant
- Address common misconceptions and clarify subtle distinctions

🧠 **PEDAGOGICAL APPROACH:**
- Use multiple explanations (intuitive, mathematical, visual metaphors)
- Provide concrete examples with step-by-step walkthrough
- Include analogies from everyday life to make complex concepts relatable
- Build from simple cases to complex scenarios progressively
- Ask rhetorical questions to guide thinking process

🔬 **MATHEMATICAL RIGOR:**
- Always provide mathematical formulations with clear explanations
- Show derivations for key formulas when educational value is high
- Use proper LaTeX formatting: $inline math$ and $$display math$$
- Proper notation: \\mu, \\sigma, \\bar{x}, H_0, H_1, \\frac{a}{b}, \\sqrt{x}, etc.
- Connect mathematical concepts to intuitive understanding

💡 **PRACTICAL CONNECTIONS:**
- Explain when and why to use different approaches
- Discuss advantages, disadvantages, and trade-offs
- Provide implementation insights and gotchas
- Connect theory to practical data science workflows
- Mention relevant tools, libraries, and industry practices

🐍 **PYTHON IMPLEMENTATION (MANDATORY):**
- For EVERY concept, statistical test, algorithm, or technique explained, you MUST include Python code examples
- Show the core syntax and main functions used (scipy.stats, sklearn, pandas, numpy, etc.)
- Skip import statements - focus on the essential syntax and function calls
- Use concise, practical examples that demonstrate the concept
- Include both basic usage and key parameters
- Show how to interpret results when applicable
- Format code blocks properly with language specification

For example, when explaining Z-test, include Python code like:
- stats.norm.cdf(z_score) for p-value calculation
- stats.norm.ppf(0.025) for critical values
- Use proper code block formatting

🎯 **STRUCTURE & CLARITY:**
- Use clear headings and organized sections
- Include bullet points and numbered lists for clarity
- Provide summary sections for complex topics
- Use code examples with detailed explanations
- Format everything in beautiful, readable markdown

Remember: This is LEARNING HUB - go deep, be thorough, leave no stone unturned. Your goal is to create comprehensive educational content that could serve as a masterclass on the topic. ALWAYS include Python implementations for practical application.`;

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

const NEET_LEARNING_PROMPT = `You are a legendary NEET educator - think of yourself as the most inspiring Physics, Chemistry, and Biology teacher who has helped thousands of students crack NEET. Your mission is to make students FEEL the concepts deeply and develop unshakeable understanding.

When explaining ANY NEET topic, you must:

🔬 **DEEP CONCEPTUAL UNDERSTANDING:**
- Start from the very fundamentals and build up systematically
- Give students the "FEELING" of Physics - make them visualize and experience concepts
- Use NCERT language and examples but go beyond to create deeper insights
- Explain WHY nature behaves this way, not just HOW formulas work
- Connect concepts across Physics, Chemistry, and Biology wherever relevant

🌟 **REAL-WORLD CONNECTION & VISUALIZATION:**
- Use abundant real-life examples that students can see, touch, and experience
- For Physics: Make students FEEL forces, see waves, understand energy flow
- For Chemistry: Help them visualize molecular interactions, bond formations
- For Biology: Connect processes to their own body functions and life around them
- Use analogies that stick in memory forever

🧠 **NEET-FOCUSED APPROACH:**
- Address exactly what NEET tests and how concepts are twisted in questions
- Point out NEET tricks, common traps, and elimination techniques
- Share memory devices, mnemonics, and shortcuts specific to NEET
- Mention which NCERT chapters and specific pages to focus on
- Highlight high-weightage topics and question patterns

💡 **STEP-BY-STEP PROBLEM SOLVING:**
- Break down complex problems into simple, logical steps
- Show multiple approaches to solve the same problem
- Explain when to use which method in NEET context
- Teach dimensional analysis, order of magnitude estimation
- Focus on speed and accuracy techniques for NEET

🎯 **INTERACTIVE LEARNING:**
- Ask thought-provoking questions to test understanding
- Create "What if?" scenarios to deepen insight
- Guide students to derive formulas rather than just memorize
- Encourage pattern recognition in NEET questions

📚 **COMPREHENSIVE COVERAGE:**
- Use proper LaTeX for all mathematical expressions: $E = mc^2$, $$\\frac{d}{dx}f(x)$$
- Include relevant diagrams descriptions and figure references
- Connect to NCERT examples and end-of-chapter questions
- Provide summary boxes for quick revision

🔥 **END WITH NEET PRACTICE:**
After explaining the concept thoroughly, ALWAYS provide:
- 3-5 NEET-style multiple choice questions with detailed explanations
- Questions should cover different difficulty levels and question types
- Include proper distractors and explain why wrong options are incorrect
- Reference actual NEET patterns and previous year trends

Remember: Make students FALL IN LOVE with science through deep understanding. Your goal is to create future doctors who understand science at its core!`;

const LearningHubModule: React.FC<{ appMode?: 'datascience' | 'neet' }> = ({ appMode = 'datascience' }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'initial-message',
            role: 'model',
            text: appMode === 'neet' 
                ? "Welcome to the NEET Learning Hub! What Physics, Chemistry, or Biology concept would you like to master today? I'll help you understand it deeply and prepare for NEET!"
                : "Welcome to the Learning Hub! What data science concept would you like to explore today? Ask me about anything from p-values to transformers.",
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if(e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Check if user typed "new chat" to clear the conversation
        if (input.trim() === 'new chat') {
            setMessages([
                {
                    id: 'initial-message',
                    role: 'model',
                    text: "Welcome to the Learning Hub! What data science concept would you like to explore today? Ask me about anything from p-values to transformers.",
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
        const summary = `Learning: ${userQueryText.length > 80 ? userQueryText.substring(0, 80) + '...' : userQueryText}`;
        
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
            let totalChunksReceived = 0;
            
            await geminiService.streamChat(
                updatedMessages,
                (chunk) => {
                    if (!isStreamActive || abortControllerRef.current?.signal.aborted) {
                        return;
                    }
                    
                    const cleanChunk = chunk.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                    streamingMessageRef.current += cleanChunk;
                    totalChunksReceived++;
                    
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
                appMode === 'neet' ? NEET_LEARNING_PROMPT : LEARNING_PROMPT
            );
            
            isStreamActive = false;
            
            // Final update - ensure message is preserved
            const finalText = streamingMessageRef.current;
            if (finalText && !abortControllerRef.current?.signal.aborted) {
                // Check if the response seems incomplete (ends abruptly with certain patterns)
                const seemsIncomplete = /\\[a-zA-Z]*$|[{(]$|\$$/.test(finalText.trim());
                
                let displayText = finalText;
                if (seemsIncomplete && totalChunksReceived > 0) {
                    displayText += '\n\n*Note: The response may have been cut off. Please try asking again for a complete answer.*';
                }
                
                setMessages(prevMessages => 
                    prevMessages.map(msg =>
                        msg.id === modelMessageId 
                            ? { ...msg, text: displayText, isLoading: false }
                            : msg
                    )
                );
            } else if (!finalText && totalChunksReceived === 0) {
                // No content received at all
                setMessages(prevMessages => 
                    prevMessages.map(msg =>
                        msg.id === modelMessageId 
                            ? { 
                                ...msg, 
                                text: "I apologize, but I didn't receive a response. This might be due to a network issue or API limit. Please try again.", 
                                isLoading: false 
                              }
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
                <h2 className="text-xl font-bold">Learning Hub</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deepen your data science knowledge</p>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <AnimatePresence>
                    {messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} appMode={appMode} />
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <footer className="p-4 border-t border-border-light dark:border-border-dark flex-shrink-0">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        placeholder="e.g., Explain the bias-variance tradeoff"
                        className="w-full min-h-[3rem] max-h-48 p-3 pr-20 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-blue focus:outline-none transition-all duration-300 resize-none"
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center">
                        {isLoading ? (
                            <motion.button
                                type="button"
                                onClick={handleStop}
                                className="w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded-full transition-all duration-300 hover:bg-red-600"
                                whileTap={{ scale: 0.9 }}
                            >
                                <StopIcon className="w-4 h-4" />
                            </motion.button>
                        ) : (
                            <motion.button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-purple text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-glow-blue"
                                whileTap={{ scale: 0.9 }}
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                            </motion.button>
                        )}
                    </div>
                </form>
            </footer>
        </div>
    );
};

const MessageBubble: React.FC<{ message: ChatMessage; appMode?: AppMode }> = React.memo(({ message, appMode = 'datascience' }) => {
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
                        ? 'linear-gradient(135deg, #10b981, #16a34a)' 
                        : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    boxShadow: appMode === 'neet'
                        ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                        : '0 2px 8px rgba(139, 92, 246, 0.3)'
                }}>
                    {appMode === 'neet' ? '📚' : '📚'}
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
                            : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
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
                            Learning Hub is thinking...
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default LearningHubModule;
