import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubbleLeftRightIcon, CommandLineIcon, DocumentArrowUpIcon, ChartBarIcon, BookOpenIcon, CpuChipIcon, ClockIcon } from './constants';
import ChatModule from './components/modules/ChatModule';
import CodeInterpreterModule from './components/modules/CodeInterpreterModule';
import FileAnalysisModule from './components/modules/FileAnalysisModule';
import VisualizationModule from './components/modules/VisualizationModule';
import LearningHubModule from './components/modules/LearningHubModule';
import ModelSuggesterModule from './components/modules/ModelSuggesterModule';
import HistoryModule from './components/modules/HistoryModule';

type ModuleType = 'chat' | 'code' | 'upload' | 'viz' | 'learn' | 'model' | 'history';

const modules: { id: ModuleType; name: string; icon: React.ReactNode }[] = [
    { id: 'chat', name: 'AI Chat', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" /> },
    { id: 'code', name: 'Code Interpreter', icon: <CommandLineIcon className="w-5 h-5" /> },
    { id: 'upload', name: 'File Analysis', icon: <DocumentArrowUpIcon className="w-5 h-5" /> },
    { id: 'viz', name: 'Visualization', icon: <ChartBarIcon className="w-5 h-5" /> },
    { id: 'learn', name: 'Learning Hub', icon: <BookOpenIcon className="w-5 h-5" /> },
    { id: 'model', name: 'Model Suggester', icon: <CpuChipIcon className="w-5 h-5" /> },
    { id: 'history', name: 'History', icon: <ClockIcon className="w-5 h-5" /> },
];

const AppContent: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const [activeModule, setActiveModule] = useState<ModuleType>('chat');

    const renderModule = () => {
        switch (activeModule) {
            case 'chat':
                return <ChatModule />;
            case 'code':
                return <CodeInterpreterModule />;
            case 'upload':
                return <FileAnalysisModule />;
            case 'viz':
                return <VisualizationModule />;
            case 'learn':
                return <LearningHubModule />;
            case 'model':
                return <ModelSuggesterModule />;
            case 'history':
                return <HistoryModule />;
            default:
                return <ChatModule />;
        }
    };

    return (
        <div className={`min-h-screen w-full transition-colors duration-500 ${theme === 'dark' ? 'dark bg-brand-dark text-gray-200' : 'bg-brand-light text-gray-800'}`}>
            <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-brand-dark bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="fixed inset-0 -z-10 h-full w-full bg-transparent bg-[radial-gradient(circle_500px_at_50%_200px,#3b82f644,transparent)] dark:bg-[radial-gradient(circle_500px_at_50%_200px,#3b82f622,transparent)]"></div>

            <main className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-8 h-screen">
                {/* Sidebar */}
                <motion.aside 
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="flex-shrink-0"
                >
                    <div className="p-4 bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 px-2 mb-8">
                                <motion.div 
                                    className="w-10 h-10 bg-gradient-to-br from-accent-blue to-accent-purple rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                />
                                <h1 className="text-xl font-bold tracking-tighter">Co-Pilot</h1>
                            </div>
                            <nav className="flex flex-row md:flex-col gap-2">
                                {modules.map(module => (
                                    <button
                                        key={module.id}
                                        onClick={() => setActiveModule(module.id)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 w-full text-left ${
                                            activeModule === module.id 
                                            ? 'bg-accent-blue/20 text-accent-blue dark:text-white dark:bg-accent-blue/30 shadow-md' 
                                            : 'hover:bg-gray-500/10'
                                        }`}
                                    >
                                        {module.icon}
                                        <span className="hidden md:inline">{module.name}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                        <div className="px-2">
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                        </div>
                    </div>
                </motion.aside>

                {/* Main Content */}
                <motion.section 
                    className="flex-1 flex flex-col overflow-hidden"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeModule}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="h-full flex flex-col"
                        >
                            {renderModule()}
                        </motion.div>
                    </AnimatePresence>
                </motion.section>
            </main>
        </div>
    );
};

const ThemeToggle: React.FC<{ theme: string; toggleTheme: () => void }> = ({ theme, toggleTheme }) => (
    <button onClick={toggleTheme} className="w-full flex justify-between items-center p-2 rounded-lg hover:bg-gray-500/10 transition-colors">
        <span className="text-sm font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
        <div className="w-12 h-6 flex items-center bg-gray-300 dark:bg-gray-700 rounded-full p-1 duration-300 ease-in-out">
            <motion.div
                layout
                className="w-4 h-4 bg-white dark:bg-brand-dark rounded-full shadow-md"
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
            />
        </div>
    </button>
);

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
};

export default App;