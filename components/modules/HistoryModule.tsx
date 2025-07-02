import React, { useState, useEffect } from 'react';
import { ChevronRight, Clock, MessageCircle, ArrowLeft } from 'lucide-react';
import { HistoryService, HistorySession, HistorySessionDetail } from '../../services/historyService';

const HistoryModule: React.FC = () => {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<HistorySessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistorySessions();
  }, []);

  const loadHistorySessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await HistoryService.getHistorySessions();
      setSessions(data);
    } catch (err) {
      setError('Failed to load chat history');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = async (sessionId: string) => {
    setLoading(true);
    try {
      const sessionDetail = await HistoryService.getSessionDetail(sessionId);
      setSelectedSession(sessionDetail);
    } catch (err) {
      setError('Failed to load session details');
      console.error('Error loading session detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedSession(null);
    loadHistorySessions(); // Refresh the list
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full h-full bg-glass-light dark:bg-glass-dark border border-border-light dark:border-border-dark rounded-2xl backdrop-blur-lg shadow-lg flex flex-col overflow-hidden">
      <header className="p-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
        <h2 className="text-xl font-bold">Chat History</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">View your global conversation history</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading && !selectedSession ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Loading chat history...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <MessageCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadHistorySessions}
              className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        ) : selectedSession ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <button
                onClick={handleBackToList}
                className="flex items-center space-x-1 text-accent-blue hover:text-accent-blue/80"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to History</span>
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Chat Session</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">{selectedSession.summary}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Created: {formatDate(selectedSession.createdAt)}</span>
                <span>Last updated: {formatDate(selectedSession.lastUpdated)}</span>
                <span>{selectedSession.userQueries.length} queries</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">User Queries</h4>
              {selectedSession.userQueries.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No queries in this session</p>
              ) : (
                selectedSession.userQueries.map((query, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Query #{index + 1}</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">{formatTime(query.timestamp)}</span>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{query.query}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No chat history</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Start a conversation in any module to see your chat history here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Conversations</h3>
              <button
                onClick={loadHistorySessions}
                className="text-accent-blue hover:text-accent-blue/80 underline text-sm"
              >
                Refresh
              </button>
            </div>
            
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => handleSessionClick(session.sessionId)}
                  className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.summary}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(session.lastUpdated)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{session.queryCount} queries</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryModule;
