import { HistoryService } from './historyService';

class SessionManager {
  private static instance: SessionManager;
  private currentSessionId: string | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  getCurrentSessionId(): string {
    if (!this.currentSessionId) {
      this.currentSessionId = HistoryService.generateSessionId();
    }
    return this.currentSessionId;
  }

  startNewSession(): string {
    this.currentSessionId = HistoryService.generateSessionId();
    return this.currentSessionId;
  }

  async saveUserQuery(userQuery: string, summary?: string): Promise<boolean> {
    const sessionId = this.getCurrentSessionId();
    return HistoryService.saveUserQuery(sessionId, userQuery, summary);
  }

  resetSession(): void {
    this.currentSessionId = null;
  }
}

export const sessionManager = SessionManager.getInstance();
