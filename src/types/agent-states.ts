// Типы для состояний автоматического агента

export type AgentState = 'idle' | 'running' | 'paused' | 'stopped';

export interface AgentStatus {
  state: AgentState;
  lastRun?: Date;
  nextRun?: Date;
  totalSent: number;
  totalErrors: number;
  isActive: boolean;
  sessionId?: string;
  startTime?: Date;
  pauseTime?: Date;
}

export interface AgentSettings {
  intervalHours: number;  // Интервал запуска агента (в часах)
  maxCVDaily: number;     // Максимум CV для отправки за один запуск
  headless: boolean;      // Работать в фоновом режиме (невидимый браузер)
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export interface AgentStats {
  totalSent: number;
  totalErrors: number;
  todaySent: number;
  emailsFound?: number;
  emailsSent?: number;
  lastActivity?: Date;
  uptime: number; // в минутах
  successRate: number;
}
