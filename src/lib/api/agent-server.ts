// API для взаимодействия с Node.js агентом
export interface AgentServerConfig {
  baseUrl: string;
  timeout: number;
}

export class AgentServerAPI {
  private config: AgentServerConfig;

  constructor(config: AgentServerConfig = {
    baseUrl: import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5050`,
    timeout: 120000 // Увеличиваем до 2 минут для авторизации
  }) {
    this.config = config;
  }

  async login(credentials: { email: string; password: string }): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    cookies?: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server login error:', error);
      return {
        success: false,
        message: 'Не удалось подключиться к серверу агента'
      };
    }
  }

  async syncCV(sessionId: string, cvData: { fileName: string; filePath?: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/sync-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          fileName: cvData.fileName,
          filePath: cvData.filePath
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server sync CV error:', error);
      return {
        success: false,
        message: 'Не удалось синхронизировать CV'
      };
    }
  }

  async startAgent(config: {
    sessionId: string;
    headless: boolean;
    maxApplications: number;
  }): Promise<{
    success: boolean;
    message: string;
    jobId?: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server start error:', error);
      return {
        success: false,
        message: 'Не удалось запустить агента'
      };
    }
  }

  async getStatus(jobId: string): Promise<{
    status: 'running' | 'completed' | 'error';
    progress: number;
    currentTask: string;
    results?: any[];
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/status/${jobId}`, {
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server status error:', error);
      return {
        status: 'error',
        progress: 0,
        currentTask: 'Ошибка получения статуса'
      };
    }
  }

  async stopAgent(jobId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/stop/${jobId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server stop error:', error);
      return {
        success: false,
        message: 'Не удалось остановить агента'
      };
    }
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkCVStatus(sessionId: string): Promise<{
    success: boolean;
    cvExists: boolean;
    needsUpload: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/check-cv-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server check CV status error:', error);
      return {
        success: false,
        cvExists: false,
        needsUpload: true,
        message: 'Не удалось проверить статус CV'
      };
    }
  }

  async autoApplyToJobs(sessionId: string, cvData: any, options?: { maxJobs?: number; minMatchScore?: number; headless?: boolean; isScheduled?: boolean }): Promise<{
    success: boolean;
    message: string;
    appliedCount?: number;
    skippedCount?: number;
    total?: number;
    results?: any[];
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/auto-apply-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          cvData,
          maxJobs: options?.maxJobs || 10,
          minMatchScore: options?.minMatchScore || 70,
          headless: options?.headless ?? true, // По умолчанию headless режим
          isScheduled: options?.isScheduled ?? false // Флаг автоматического запуска
        }),
        signal: AbortSignal.timeout(600000) // 10 минут для автоотправки (достаточно для 20+ вакансий)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server auto-apply error:', error);
      return {
        success: false,
        message: 'Не удалось выполнить автоотправку'
      };
    }
  }

  async closeAgent(sessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
        signal: AbortSignal.timeout(10000) // 10 секунд для закрытия
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server close error:', error);
      return {
        success: false,
        message: 'Не удалось закрыть агента'
      };
    }
  }

  async checkAgentStatus(sessionId: string): Promise<{
    active: boolean;
    browserActive: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/agent/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
        signal: AbortSignal.timeout(5000)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Agent server status check error:', error);
      return {
        active: false,
        browserActive: false,
        message: 'Не удалось проверить статус агента'
      };
    }
  }
}

export const agentServerAPI = new AgentServerAPI();
