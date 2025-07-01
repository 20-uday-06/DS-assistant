import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { useTheme } from '../../hooks/useTheme';
import { DocumentArrowUpIcon, ChartBarIcon } from '../../constants';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

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
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={components}
            >
                {normalizedContent}
            </ReactMarkdown>
        </div>
    );
});


const VisualizationModule: React.FC = () => {
    const { theme } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [prompt, setPrompt] = useState('Create a histogram of the age distribution.');
    const [chartData, setChartData] = useState<any>(null);
    const [analysis, setAnalysis] = useState('');
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
            if (!['text/csv', 'application/json'].includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.json')) {
                setError('Invalid file type. Please upload a CSV or JSON file.');
                return;
            }
            
            setFile(selectedFile);
            setChartData(null);
            setAnalysis('');
            
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
        setChartData(null);
        setAnalysis('');
        setError('');

        const fullPrompt = `
You are a data visualization expert and analyst. A user has uploaded a file and wants to create a plot and get an analysis.

File Name: "${file.name}"
File Content Preview (first 5000 characters):
\`\`\`
${fileContent.substring(0, 5000)}
\`\`\`

User's Request: "${prompt}"

Based on the data and the request, generate a response with two parts:
1.  A valid Plotly JSON chart specification.
2.  A detailed analysis of the visualization in Markdown format. Explain what the chart shows, point out key insights, trends, or outliers.

Respond ONLY with a single JSON object with two keys: "plotlySpec" and "analysis".
- "plotlySpec": The Plotly JSON object (with "data" and "layout" keys).
- "analysis": A string containing the markdown analysis.

Do not include any other text, explanations, or markdown formatting like \`\`\`json. Just the raw JSON object.
`;
        try {
            const responseText = await geminiService.generateContent(fullPrompt, true);
            let jsonStr = responseText.trim();
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
              jsonStr = match[2].trim();
            }
            
            const parsedData = JSON.parse(jsonStr);

            if (parsedData.error) {
                setError(parsedData.error);
            } else if (!parsedData.plotlySpec || !parsedData.analysis || !parsedData.plotlySpec.data || !parsedData.plotlySpec.layout) {
                setError("AI response was not in the expected format (missing 'plotlySpec' or 'analysis'). Please rephrase your request.");
            } else {
                setChartData(parsedData.plotlySpec);
                setAnalysis(parsedData.analysis);
            }
        } catch (e) {
            console.error(e);
            setError("Failed to parse AI response as JSON. The model may have returned an invalid format. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const plotLayout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            color: theme === 'dark' ? '#E5E7EB' : '#1F2937'
        },
        xaxis: {
            gridcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            linecolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        },
        yaxis: {
            gridcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            linecolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        },
        legend: {
            bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)',
            bordercolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        }
    };

    return (
        <div className="w-full h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg flex flex-col overflow-hidden">
            <header className="p-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
                <h2 className="text-xl font-bold">Visualization Studio</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Generate interactive reports from your data</p>
            </header>
            <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 overflow-y-auto">
                {/* File Upload & Prompt */}
                <div className="flex flex-col gap-4">
                     <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-xl p-6 text-center bg-gray-500/10 hover:bg-gray-500/20 transition-colors">
                        <input type="file" id="vis-file-upload" className="hidden" onChange={handleFileChange} accept=".csv,.json" />
                        <label htmlFor="vis-file-upload" className="cursor-pointer">
                            <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-gray-400" />
                            <p className="mt-2 text-sm font-semibold text-accent-blue">
                                {file ? `Selected: ${file.name}` : 'Upload a CSV or JSON file'}
                            </p>
                            <p className="text-xs text-gray-500">Max 2MB.</p>
                        </label>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the chart you want to create..."
                            className="flex-1 p-3 bg-gray-200/50 dark:bg-brand-dark/50 border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-blue focus:outline-none transition-all duration-300 disabled:opacity-50"
                            disabled={!file}
                        />
                        <motion.button
                            onClick={handleSubmit}
                            disabled={isLoading || !file || !prompt.trim()}
                            className="px-6 py-3 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-purple text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-glow-blue"
                            whileTap={{ scale: 0.95 }}
                        >
                            {isLoading ? 'Generating...' : 'Generate Report'}
                        </motion.button>
                    </div>
                </div>
                 {error && <div className="text-center text-red-500 px-4 mt-2">{error}</div>}

                {/* Report Display */}
                <div className="flex-1 flex flex-col mt-4 border border-border-light dark:border-border-dark rounded-xl bg-gray-500/10 min-h-[400px]">
                    {isLoading && <div className="m-auto text-center text-gray-500">Building your report...</div>}
                    
                    {!isLoading && !error && !chartData && 
                      <div className="m-auto text-center text-gray-400 dark:text-gray-500">
                        <ChartBarIcon className="w-16 h-16 mx-auto" />
                        <p className="mt-2">Your generated chart and analysis will appear here.</p>
                      </div>
                    }

                    {chartData && analysis && (
                         <motion.div className="w-full h-full flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="w-full h-[400px] p-4 flex-shrink-0">
                                <Plot
                                    data={chartData.data}
                                    layout={{ ...chartData.layout, ...plotLayout, uirevision: 'true', responsive: true }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ responsive: true, displaylogo: false }}
                                />
                            </div>
                            <div className="border-t border-border-light dark:border-border-dark p-4 md:p-6 overflow-y-auto">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">AI Analysis</h3>
                                <FormattedResponse content={analysis} />
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisualizationModule;