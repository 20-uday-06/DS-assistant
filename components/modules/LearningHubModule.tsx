import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { sessionManager } from '../../services/sessionManager';
import { ChatMessage } from '../../types';
import { PaperAirplaneIcon, StopIcon, BookOpenIcon } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

const LEARNING_PROMPT = `You are a world-renowned expert educator and researcher in Data Science, AI, Machine Learning, Statistics, and Probability - think of yourself as a professor at MIT or Stanford with decades of teaching and research experience. Your mission is to provide extremely detailed, comprehensive educational explanations.

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

🎯 **STRUCTURE & CLARITY:**
- Use clear headings and organized sections
- Include bullet points and numbered lists for clarity
- Provide summary sections for complex topics
- Use code examples with detailed explanations
- Format everything in beautiful, readable markdown

Remember: This is LEARNING HUB - go deep, be thorough, leave no stone unturned. Your goal is to create comprehensive educational content that could serve as a masterclass on the topic.`;

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


const LearningHubModule: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'initial-message',
            role: 'model',
            text: "Welcome to the Learning Hub! What data science concept would you like to explore today? Ask me about anything from p-values to transformers.",
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
                LEARNING_PROMPT
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

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isModel = message.role === 'model';
    
    return (
        <motion.div
            layout={false}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex items-start gap-3 max-w-4xl w-full ${isModel ? 'justify-start' : 'ml-auto justify-end'}`}
        >
            {isModel && (
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    <BookOpenIcon className="w-4 h-4" />
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
                    minHeight: '3rem'
                }}
            >
                <FormattedMessageContent content={message.text} />
                {message.isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center mt-2"
                    >
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
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default LearningHubModule;