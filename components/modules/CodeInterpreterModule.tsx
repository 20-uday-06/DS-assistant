import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../hooks/useTheme';
import type { Components } from 'react-markdown';

const FormattedResponse: React.FC<{ content: string }> = React.memo(({ content }) => {
    const { theme } = useTheme();
    const syntaxTheme = theme === 'dark' ? vscDarkPlus : prism;

    // Ensure content is properly normalized to prevent rendering issues
    const normalizedContent = content.trim().normalize('NFC');

    const components: Components = {
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter style={syntaxTheme as any} language={match[1]} PreTag="div">
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
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-headings:font-semibold prose-code:bg-gray-300/70 dark:prose-code:bg-gray-900/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md">
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


const CodeInterpreterModule: React.FC = () => {
    const [code, setCode] = useState('import pandas as pd\n\n# Create a sample DataFrame\ndata = {\'Name\': [\'Alice\', \'Bob\', \'Charlie\'],\n        \'Age\': [25, 30, 35],\n        \'City\': [\'New York\', \'Paris\', \'London\']}\ndf = pd.DataFrame(data)\n\n# Display the first 5 rows\nprint(df.head())');
    const [language, setLanguage] = useState('python');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!code.trim() || isLoading) return;
        setIsLoading(true);
        setResponse('');

        const prompt = `Act as a code interpreter and senior programmer. Explain the following ${language} code, describe its functionality step-by-step, predict its output, and point out any potential improvements.

Code:
\`\`\`${language}
${code}
\`\`\`
`;

        try {
            await geminiService.streamChat(
                [{ id: '1', role: 'user', text: prompt }],
                (chunk) => setResponse(prev => prev + chunk)
            );
        } catch (error) {
            setResponse("An error occurred while interpreting the code.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg flex flex-col overflow-hidden">
            <header className="p-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
                <h2 className="text-xl font-bold">Code Interpreter</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Analyze code snippets with AI</p>
            </header>
            <div className="flex-1 flex flex-col md:flex-row gap-px overflow-hidden">
                {/* Input Panel */}
                <div className="flex-1 flex flex-col p-4 bg-white/10 dark:bg-black/10">
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="language-select" className="text-sm font-medium">Language</label>
                        <select
                            id="language-select"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-accent-blue focus:outline-none"
                        >
                            <option value="python">Python</option>
                            <option value="sql">SQL</option>
                            <option value="javascript">JavaScript</option>
                            <option value="r">R</option>
                        </select>
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={`// Paste your ${language} code here`}
                        className="w-full flex-1 p-3 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-blue focus:outline-none resize-none font-mono text-sm"
                    />
                    <motion.button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full mt-4 p-3 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-purple text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-glow-blue"
                        whileTap={{ scale: 0.95 }}
                    >
                        {isLoading ? 'Analyzing...' : 'Run Analysis'}
                    </motion.button>
                </div>
                {/* Output Panel */}
                <div className="flex-1 p-4 overflow-y-auto">
                     <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
                     <div className="bg-gray-200/20 dark:bg-brand-dark/20 p-4 rounded-lg min-h-[100px]">
                        {isLoading && !response && <div className="text-center text-gray-500">Generating analysis...</div>}
                        <FormattedResponse content={response} />
                        {isLoading && <span className="inline-block w-2 h-4 bg-gray-500 dark:bg-gray-300 animate-pulse ml-1 rounded-sm" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodeInterpreterModule;