import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../hooks/useTheme';
import { DocumentArrowUpIcon } from '../../constants';
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


const FileAnalysisModule: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [prompt, setPrompt] = useState('Summarize this data. What are the key columns and potential insights?');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setError('');
            if (selectedFile.size > 2 * 1024 * 1024) { // 2MB limit
                setError('File is too large. Please upload a file smaller than 2MB.');
                return;
            }
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                setFileContent(event.target?.result as string);
            };
            reader.readAsText(selectedFile);
        }
    };
    
    const handleSubmit = async () => {
        if (!file || !prompt.trim() || isLoading) return;
        setIsLoading(true);
        setResponse('');
        setError('');

        const fullPrompt = `Analyze the following data from the file named "${file.name}".
File Content (first 5000 characters):
\`\`\`
${fileContent.substring(0, 5000)}
\`\`\`

User Request: "${prompt}"

Provide a detailed analysis based on the user's request.
`;
        try {
             await geminiService.streamChat(
                [{ id: '1', role: 'user', text: fullPrompt }],
                (chunk) => setResponse(prev => prev + chunk)
            );
        } catch (e) {
            setError("An error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg flex flex-col overflow-hidden">
            <header className="p-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
                <h2 className="text-xl font-bold">File Analysis</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get insights from your CSV, JSON, or SQL files</p>
            </header>
             <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 overflow-y-auto">
                <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-xl p-6 text-center bg-gray-500/10 hover:bg-gray-500/20 transition-colors">
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".csv,.json,.txt,.sql,.py,.md" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm font-semibold text-accent-blue">
                            {file ? `Selected: ${file.name}` : 'Click to upload a file'}
                        </p>
                        <p className="text-xs text-gray-500">Max 2MB. CSV, JSON, TXT, SQL supported.</p>
                    </label>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                
                {file && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="What would you like to know about this file?"
                            className="w-full h-24 p-3 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-blue focus:outline-none resize-none transition-all duration-300"
                        />
                        <motion.button
                            onClick={handleSubmit}
                            disabled={isLoading || !fileContent}
                            className="w-full mt-4 p-3 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-purple text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-glow-blue"
                            whileTap={{ scale: 0.95 }}
                        >
                            {isLoading ? 'Analyzing...' : 'Analyze File'}
                        </motion.button>
                    </motion.div>
                )}

                {(response || isLoading) && (
                    <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
                        <div className="bg-gray-200/20 dark:bg-brand-dark/20 p-4 rounded-lg min-h-[100px] border border-border-light dark:border-border-dark">
                           <FormattedResponse content={response} />
                           {isLoading && <span className="inline-block w-2 h-4 bg-gray-500 dark:bg-gray-300 animate-pulse ml-1 rounded-sm" />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileAnalysisModule;