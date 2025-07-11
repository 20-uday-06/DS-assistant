import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubbleLeftRightIcon, CommandLineIcon, DocumentArrowUpIcon, ChartBarIcon, BookOpenIcon, CpuChipIcon, ClockIcon, ChevronDownIcon } from './constants';
import ChatModule from './components/modules/ChatModule';
import CodeInterpreterModule from './components/modules/CodeInterpreterModule';
import FileAnalysisModule from './components/modules/FileAnalysisModule';
import VisualizationModule from './components/modules/VisualizationModule';
import LearningHubModule from './components/modules/LearningHubModule';
import ModelSuggesterModule from './components/modules/ModelSuggesterModule';
import HistoryModule from './components/modules/HistoryModule';

type ModuleType = 'chat' | 'code' | 'upload' | 'viz' | 'learn' | 'model' | 'history';
type AppMode = 'datascience' | 'neet' | 'jee';

const allModules: { id: ModuleType; name: string; neetName?: string; jeeName?: string; icon: React.ReactNode; modes: AppMode[] }[] = [
    { id: 'chat', name: 'AI Chat', neetName: 'Doubt Expert', jeeName: 'JEE Mentor', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />, modes: ['datascience', 'neet', 'jee'] },
    { id: 'code', name: 'Code Interpreter', icon: <CommandLineIcon className="w-5 h-5" />, modes: ['datascience'] },
    { id: 'upload', name: 'File Analysis', icon: <DocumentArrowUpIcon className="w-5 h-5" />, modes: ['datascience'] },
    { id: 'viz', name: 'Visualization', icon: <ChartBarIcon className="w-5 h-5" />, modes: ['datascience'] },
    { id: 'learn', name: 'Learning Hub', icon: <BookOpenIcon className="w-5 h-5" />, modes: ['datascience', 'neet', 'jee'] },
    { id: 'model', name: 'Model Suggester', icon: <CpuChipIcon className="w-5 h-5" />, modes: ['datascience'] },
    { id: 'history', name: 'History', icon: <ClockIcon className="w-5 h-5" />, modes: ['datascience'] },
];

const AppContent: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const [activeModule, setActiveModule] = useState<ModuleType>('chat');
    const [appMode, setAppMode] = useState<AppMode>('datascience');
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    // Filter modules based on current mode
    const availableModules = allModules.filter(module => module.modes.includes(appMode));

    // If current module is not available in the new mode, switch to first available
    React.useEffect(() => {
        if (!availableModules.find(m => m.id === activeModule)) {
            setActiveModule(availableModules[0]?.id || 'chat');
        }
    }, [appMode, availableModules, activeModule]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => {
            setShowModeDropdown(false);
        };
        
        if (showModeDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showModeDropdown]);

    const handleModeChange = (newMode: AppMode) => {
        setAppMode(newMode);
        setShowModeDropdown(false);
    };

    const getModeDisplayName = (mode: AppMode) => {
        if (mode === 'datascience') return 'Data Science';
        if (mode === 'neet') return 'NEET';
        return 'JEE';
    };

    const getModuleName = (module: typeof allModules[0]) => {
        if (appMode === 'neet' && module.neetName) {
            return module.neetName;
        }
        if (appMode === 'jee' && module.jeeName) {
            return module.jeeName;
        }
        return module.name;
    };

    const renderModule = () => {
        switch (activeModule) {
            case 'chat':
                return <ChatModule appMode={appMode} />;
            case 'code':
                return <CodeInterpreterModule />;
            case 'upload':
                return <FileAnalysisModule />;
            case 'viz':
                return <VisualizationModule />;
            case 'learn':
                return <LearningHubModule appMode={appMode} />;
            case 'model':
                return <ModelSuggesterModule />;
            case 'history':
                return <HistoryModule />;
            default:
                return <ChatModule appMode={appMode} />;
        }
    };

    return (
        <div className="h-screen flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden">
            {/* ChatGPT-style Sidebar */}
            <motion.div
                initial={false}
                animate={{
                    width: sidebarExpanded ? 260 : 60,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="relative bg-gray-200 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 flex flex-col"
                onMouseEnter={() => setSidebarExpanded(true)}
                onMouseLeave={() => setSidebarExpanded(false)}
            >
                {/* Header */}
                <div className="flex items-center h-16 px-3 border-b border-gray-300 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">AI</span>
                        </div>
                        <motion.span
                            initial={false}
                            animate={{
                                opacity: sidebarExpanded ? 1 : 0,
                                x: sidebarExpanded ? 0 : -10,
                            }}
                            transition={{ duration: 0.2 }}
                            className="font-semibold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden"
                            style={{ 
                                display: sidebarExpanded ? 'block' : 'none',
                                width: sidebarExpanded ? 'auto' : '0'
                            }}
                        >
                            AI Co-Pilot
                        </motion.span>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="px-3 py-3 border-b border-gray-300 dark:border-gray-600">
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowModeDropdown(!showModeDropdown);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-300 dark:hover:bg-gray-700 ${
                                sidebarExpanded ? 'justify-between' : 'justify-center'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">🎯</span>
                                <motion.span
                                    initial={false}
                                    animate={{
                                        opacity: sidebarExpanded ? 1 : 0,
                                        x: sidebarExpanded ? 0 : -10,
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="whitespace-nowrap overflow-hidden"
                                    style={{ 
                                        display: sidebarExpanded ? 'block' : 'none',
                                        width: sidebarExpanded ? 'auto' : '0'
                                    }}
                                >
                                    {getModeDisplayName(appMode)}
                                </motion.span>
                            </div>
                            <motion.div
                                initial={false}
                                animate={{
                                    opacity: sidebarExpanded ? 1 : 0,
                                    rotate: showModeDropdown ? 180 : 0,
                                }}
                                transition={{ duration: 0.2 }}
                                style={{ 
                                    display: sidebarExpanded ? 'block' : 'none',
                                    width: sidebarExpanded ? 'auto' : '0'
                                }}
                            >
                                <ChevronDownIcon className="w-4 h-4" />
                            </motion.div>
                        </button>
                        
                        <AnimatePresence>
                            {showModeDropdown && sidebarExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => handleModeChange('datascience')}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors rounded-t-lg ${
                                            appMode === 'datascience' 
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        Data Science
                                    </button>
                                    <button
                                        onClick={() => handleModeChange('neet')}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                            appMode === 'neet' 
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        NEET Expert
                                    </button>
                                    <button
                                        onClick={() => handleModeChange('jee')}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors rounded-b-lg ${
                                            appMode === 'jee' 
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        JEE Expert
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                
                {/* Navigation */}
                <nav className="flex-1 px-3 py-2 space-y-1">
                    {availableModules.map(module => (
                        <button
                            key={module.id}
                            onClick={() => setActiveModule(module.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeModule === module.id 
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                                    : 'hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            } ${sidebarExpanded ? '' : 'justify-center'}`}
                        >
                            <div className="flex-shrink-0">
                                {module.icon}
                            </div>
                            <motion.span
                                initial={false}
                                animate={{
                                    opacity: sidebarExpanded ? 1 : 0,
                                    x: sidebarExpanded ? 0 : -10,
                                }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap overflow-hidden"
                                style={{ 
                                    display: sidebarExpanded ? 'block' : 'none',
                                    width: sidebarExpanded ? 'auto' : '0'
                                }}
                            >
                                {getModuleName(module)}
                            </motion.span>
                        </button>
                    ))}
                </nav>
                
                {/* Footer */}
                <div className="px-3 py-3 border-t border-gray-300 dark:border-gray-600">
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${
                            sidebarExpanded ? '' : 'justify-center'
                        }`}
                    >
                        <span className="text-lg">
                            {theme === 'dark' ? '🌙' : '☀️'}
                        </span>
                        <motion.span
                            initial={false}
                            animate={{
                                opacity: sidebarExpanded ? 1 : 0,
                                x: sidebarExpanded ? 0 : -10,
                            }}
                            transition={{ duration: 0.2 }}
                            className="whitespace-nowrap overflow-hidden"
                            style={{ 
                                display: sidebarExpanded ? 'block' : 'none',
                                width: sidebarExpanded ? 'auto' : '0'
                            }}
                        >
                            {theme === 'dark' ? 'Dark' : 'Light'} Mode
                        </motion.span>
                    </button>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeModule}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="flex-1 flex flex-col min-h-0 overflow-hidden"
                    >
                        {renderModule()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
};

export default App;