interface HistorySession {
  sessionId: string;
  summary: string;
  createdAt: string;
  lastUpdated: string;
  queryCount: number;
}

interface HistorySessionDetail {
  sessionId: string;
  summary: string;
  userQueries: Array<{
    query: string;
    timestamp: string;
  }>;
  createdAt: string;
  lastUpdated: string;
}

const getApiBaseUrl = () => {
  // Always use Netlify functions for both dev and production
  return '';
};

const API_BASE_URL = getApiBaseUrl();

export class HistoryService {
  static async getHistorySessions(): Promise<HistorySession[]> {
    try {
      // Use Netlify function to get history sessions
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/history-global`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Convert global history to sessions format
      const sessions: HistorySession[] = [];
      const sessionMap = new Map<string, HistorySession>();
      
      data.forEach((item: any) => {
        if (!sessionMap.has(item.sessionId)) {
          sessionMap.set(item.sessionId, {
            sessionId: item.sessionId,
            summary: item.query,
            createdAt: item.timestamp,
            lastUpdated: item.timestamp,
            queryCount: 1
          });
        } else {
          const session = sessionMap.get(item.sessionId)!;
          session.queryCount++;
          session.lastUpdated = item.timestamp;
        }
      });
      
      return Array.from(sessionMap.values());
    } catch (error) {
      console.error('Failed to fetch history sessions:', error);
      return [];
    }
  }

  static async getSessionDetail(sessionId: string): Promise<HistorySessionDetail | null> {
    try {
      // Use Netlify function to get session detail
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/history-global`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Filter data for specific session
      const sessionQueries = data.filter((item: any) => item.sessionId === sessionId);
      
      if (sessionQueries.length === 0) {
        return null;
      }
      
      return {
        sessionId,
        summary: sessionQueries[0].query,
        userQueries: sessionQueries.map((item: any) => ({
          query: item.query,
          timestamp: item.timestamp
        })),
        createdAt: sessionQueries[sessionQueries.length - 1].timestamp,
        lastUpdated: sessionQueries[0].timestamp
      };
    } catch (error) {
      console.error('Failed to fetch session detail:', error);
      return null;
    }
  }

  static async saveUserQuery(sessionId: string, userQuery: string, summary?: string): Promise<boolean> {
    try {
      // Use Netlify function to save chat session
      const response = await fetch(`${API_BASE_URL}/.netlify/functions/save-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          summary: summary || userQuery,
          userQueries: [{
            query: userQuery,
            timestamp: new Date().toISOString()
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Chat session saved to MongoDB successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save user query:', error);
      return false;
    }
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export type { HistorySession, HistorySessionDetail };
