import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { sessionManager } from '../../services/sessionManager';
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

const ModelSuggesterModule: React.FC = () => {
    const [problemType, setProblemType] = useState('Classification');
    const [datasetSize, setDatasetSize] = useState('Medium (10k-1M rows)');
    const [dataType, setDataType] = useState('Tabular');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        setIsLoading(true);
        setResponse('');
        const prompt = `
You are a seasoned ML consultant with 15+ years of experience building production ML systems across diverse industries. A client has approached you for model recommendations.

**Client Requirements:**
- **Problem Type**: ${problemType}
- **Dataset Size**: ${datasetSize}
- **Primary Data Type**: ${dataType}

Based on your extensive experience, provide **3 carefully selected model recommendations** that would work well for this scenario. For each model, structure your response as follows:

## Model [X]: [Model Name]

### Why This Model Fits
- Explain the specific characteristics that make this model suitable
- Reference your "experience" with similar projects

### Preprocessing Pipeline
- Detailed preprocessing steps specific to this data type and problem
- Common gotchas and best practices you've learned

### Hyperparameter Strategy
- **Critical hyperparameters** to tune first
- **Recommended starting ranges** based on dataset size
- **Tuning methodology** (grid search, random search, Bayesian optimization)

### Production Considerations
- **Potential challenges** you've encountered with this model type
- **Performance expectations** (training time, inference speed, resource requirements)
- **When this model might fail** and warning signs to watch for

### Implementation Tips
- Recommended libraries/frameworks
- Code architecture suggestions
- Monitoring and maintenance considerations

---

**Overall Recommendation:** Provide a final paragraph summarizing which model you'd start with and why, based on the specific combination of problem type, data size, and data type.

Use your experience-backed insights throughout - mention specific scenarios where you've seen these models succeed or fail.`;

        // Save user query to history
        const userQueryText = `Model suggestion for ${problemType} problem with ${datasetSize} ${dataType} data`;
        const summary = `Model Suggester: ${problemType} (${datasetSize})`;
        sessionManager.saveUserQuery(userQueryText, summary).catch(error => {
            console.error('Failed to save user query to history:', error);
        });

        try {
            let accumulatedResponse = '';
            let lastUpdateTime = 0;
            const UPDATE_THROTTLE = 150; // Throttle updates to prevent UI collapse
            
            await geminiService.streamChat(
                [{ id: '1', role: 'user', text: prompt }],
                (chunk) => {
                    accumulatedResponse += chunk;
                    
                    // Throttle UI updates to prevent performance issues with long responses
                    const now = Date.now();
                    if (now - lastUpdateTime >= UPDATE_THROTTLE) {
                        setResponse(accumulatedResponse);
                        lastUpdateTime = now;
                    }
                }
            );
            
            // Ensure final state is set after streaming completes
            setResponse(accumulatedResponse);
        } catch (error) {
            console.error("Error generating suggestions:", error);
            setResponse("An error occurred while generating suggestions. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="w-full h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg flex flex-col overflow-hidden">
            <header className="p-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
                <h2 className="text-xl font-bold">ML Model Suggester</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get expert recommendations for your ML problems</p>
            </header>
            <div className="flex-1 flex flex-col md:flex-row gap-px overflow-hidden">
                {/* Input Form */}
                <div className="flex-[0.5] p-4 md:p-6 bg-white/10 dark:bg-black/10 flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Problem Type</label>
                        <select value={problemType} onChange={e => setProblemType(e.target.value)} className="w-full p-2 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-accent-blue focus:outline-none">
                            <option>Classification</option>
                            <option>Regression</option>
                            <option>Clustering</option>
                            <option>Time Series Forecasting</option>
                            <option>Natural Language Processing</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-2">Dataset Size</label>
                        <select value={datasetSize} onChange={e => setDatasetSize(e.target.value)} className="w-full p-2 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-accent-blue focus:outline-none">
                            <option>Small (&lt;10k rows)</option>
                            <option>Medium (10k-1M rows)</option>
                            <option>Large (&gt;1M rows)</option>
                            <option>Big Data (Distributed)</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-2">Primary Data Type</label>
                        <select value={dataType} onChange={e => setDataType(e.target.value)} className="w-full p-2 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-accent-blue focus:outline-none">
                            <option>Tabular</option>
                            <option>Text</option>
                            <option>Image</option>
                            <option>Audio</option>
                            <option>Mixed</option>
                        </select>
                    </div>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full mt-auto p-3 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-purple text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-glow-blue"
                        whileTap={{ scale: 0.95 }}
                    >
                        {isLoading ? 'Generating...' : 'Get Suggestions'}
                    </motion.button>
                </div>
                {/* Output Panel */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto module-container">
                     <h3 className="text-lg font-semibold mb-2">AI Recommendations</h3>
                     <div className="response-container streaming-response min-h-[200px]">
                        {isLoading && !response && <div className="text-center text-gray-500">Generating recommendations based on your input...</div>}
                        {response ? <FormattedResponse content={response} /> : !isLoading && <div className="text-center text-gray-400 dark:text-gray-500">Your model suggestions will appear here.</div>}
                        {isLoading && <span className="inline-block w-2 h-4 bg-gray-500 dark:bg-gray-300 animate-pulse ml-1 rounded-sm" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelSuggesterModule;