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

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export class HistoryService {
  static async getHistorySessions(): Promise<HistorySession[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch history sessions:', error);
      return [];
    }
  }

  static async getSessionDetail(sessionId: string): Promise<HistorySessionDetail | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch session detail:', error);
      return null;
    }
  }

  static async saveUserQuery(sessionId: string, userQuery: string, summary?: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userQuery,
          summary,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to save user query:', error);
      return false;
    }
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export type { HistorySession, HistorySessionDetail };
