import { useState, useEffect, useCallback } from 'react';
import { AgentState, AgentStatus, AgentSettings, AgentLog, AgentStats } from '@/types/agent-states';
import { agentServerAPI } from '@/lib/api/agent-server';

const STORAGE_KEYS = {
  STATUS: 'cvflow_agent_status',
  SETTINGS: 'cvflow_agent_settings',
  LOGS: 'cvflow_agent_logs',
  STATS: 'cvflow_agent_stats'
};

export const useAgentState = () => {
  const [status, setStatus] = useState<AgentStatus>({
    state: 'idle',
    totalSent: 0,
    totalErrors: 0,
    isActive: false
  });

  const [settings, setSettings] = useState<AgentSettings>({
    intervalHours: 1,      // Запуск каждый час
    maxCVDaily: 10,        // Макс 10 CV за один запуск
    headless: true         // Работаем в фоновом режиме (невидимый браузер)
  });

  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    totalSent: 0,
    totalErrors: 0,
    todaySent: 0,
    emailsFound: 0,
    emailsSent: 0,
    uptime: 0,
    successRate: 0
  });

  // Загрузка данных из localStorage
  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = useCallback(() => {
    try {
      // Загружаем статус
      const savedStatus = localStorage.getItem(STORAGE_KEYS.STATUS);
      if (savedStatus) {
        const parsed = JSON.parse(savedStatus);
        setStatus({
          ...parsed,
          lastRun: parsed.lastRun ? new Date(parsed.lastRun) : undefined,
          nextRun: parsed.nextRun ? new Date(parsed.nextRun) : undefined,
          startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
          pauseTime: parsed.pauseTime ? new Date(parsed.pauseTime) : undefined
        });
      }

      // Загружаем настройки
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Загружаем логи
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setLogs(parsedLogs);
      }

      // Загружаем статистику
      const savedStats = localStorage.getItem(STORAGE_KEYS.STATS);
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        setStats({
          ...parsed,
          lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : undefined
        });
      }
    } catch (error) {
      console.error('Failed to load agent state:', error);
    }
  }, []);

  // Сохранение в localStorage
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save agent state:', error);
    }
  }, []);

  // Добавление лога
  const addLog = useCallback((type: AgentLog['type'], message: string, details?: any) => {
    const newLog: AgentLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      details
    };

    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100); // Храним последние 100 логов
      saveToStorage(STORAGE_KEYS.LOGS, updated);
      return updated;
    });
  }, [saveToStorage]);

  // Управление состоянием агента
  const startAgent = useCallback((sessionId?: string) => {
    const newStatus: AgentStatus = {
      state: 'running',
      totalSent: status.totalSent,
      totalErrors: status.totalErrors,
      isActive: true,
      sessionId,
      startTime: new Date(),
      lastRun: new Date()
    };

    // Устанавливаем флаг ручного запуска в sessionStorage
    // Это предотвратит повторный автозапуск при перезагрузке страницы
    sessionStorage.setItem('agent_manual_start_session', Date.now().toString());
    console.log('✅ Флаг ручного запуска установлен в sessionStorage');

    setStatus(newStatus);
    saveToStorage(STORAGE_KEYS.STATUS, newStatus);
    addLog('info', 'Агент запущен');
  }, [status.totalSent, status.totalErrors, saveToStorage]);

  const pauseAgent = useCallback(() => {
    const newStatus: AgentStatus = {
      ...status,
      state: 'paused',
      isActive: false,
      pauseTime: new Date()
    };

    setStatus(newStatus);
    saveToStorage(STORAGE_KEYS.STATUS, newStatus);
    addLog('warning', 'Агент приостановлен');
  }, [status, saveToStorage]);

  const stopAgent = useCallback(() => {
    const newStatus: AgentStatus = {
      ...status,
      state: 'stopped',
      isActive: false,
      sessionId: undefined
    };

    setStatus(newStatus);
    saveToStorage(STORAGE_KEYS.STATUS, newStatus);
    addLog('info', 'Агент остановлен');
  }, [status, saveToStorage]);

  const resumeAgent = useCallback(() => {
    const newStatus: AgentStatus = {
      ...status,
      state: 'running',
      isActive: true,
      pauseTime: undefined
    };

    setStatus(newStatus);
    saveToStorage(STORAGE_KEYS.STATUS, newStatus);
    addLog('info', 'Агент возобновлен');
  }, [status, saveToStorage]);

  // Обновление настроек
  const updateSettings = useCallback(async (newSettings: Partial<AgentSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveToStorage(STORAGE_KEYS.SETTINGS, updated);
    
    // Синхронизируем с сервером
    try {
      await agentServerAPI.updateSettings(updated);
    } catch (error) {
      console.error('Failed to sync settings with server:', error);
    }
    
    addLog('info', 'Настройки обновлены и синхронизированы');
  }, [settings, saveToStorage, addLog]);

  // Загрузка настроек с сервера
  const fetchSettingsFromServer = useCallback(async () => {
    try {
      const serverSettings = await agentServerAPI.getSettings();
      if (serverSettings) {
        setSettings(prev => ({ ...prev, ...serverSettings }));
        saveToStorage(STORAGE_KEYS.SETTINGS, { ...settings, ...serverSettings });
      }
    } catch (error) {
      console.error('Failed to fetch settings from server:', error);
    }
  }, [settings, saveToStorage]);


  // Обновление статистики
  const updateStats = useCallback((updates: Partial<AgentStats>) => {
    const newStats = { ...stats, ...updates };
    setStats(newStats);
    saveToStorage(STORAGE_KEYS.STATS, newStats);
  }, [stats, saveToStorage]);

  // Запись успешной отправки
  const recordSuccess = useCallback(() => {
    setStatus(prev => ({ ...prev, totalSent: prev.totalSent + 1 }));
    setStats(prev => { 
      const newTotalSent = prev.totalSent + 1;
      const newTodaySent = prev.todaySent + 1;
      return {
        ...prev, 
        totalSent: newTotalSent, 
        todaySent: newTodaySent,
        lastActivity: new Date(),
        successRate: prev.totalErrors > 0 ? newTotalSent / (newTotalSent + prev.totalErrors) * 100 : 100
      };
    });

    addLog('success', 'CV успешно отправлено');
  }, [addLog]);

  // Запись нескольких успешных отправок (для агента)
  const recordMultipleSuccesses = useCallback((count: number) => {
    if (count <= 0) return;
    
    setStatus(prev => ({ ...prev, totalSent: prev.totalSent + count }));
    setStats(prev => { 
      const newTotalSent = prev.totalSent + count;
      const newTodaySent = prev.todaySent + count;
      return {
        ...prev, 
        totalSent: newTotalSent, 
        todaySent: newTodaySent,
        lastActivity: new Date(),
        successRate: prev.totalErrors > 0 ? newTotalSent / (newTotalSent + prev.totalErrors) * 100 : 100
      };
    });

    addLog('success', `Успешно отправлено ${count} CV`);
  }, [addLog]);

  // Запись ошибки
  const recordError = useCallback((error: string) => {
    setStatus(prev => ({ ...prev, totalErrors: prev.totalErrors + 1 }));
    setStats(prev => {
      const newTotalErrors = prev.totalErrors + 1;
      return {
        ...prev, 
        totalErrors: newTotalErrors,
        lastActivity: new Date(),
        successRate: newTotalErrors > 0 ? prev.totalSent / (prev.totalSent + newTotalErrors) * 100 : 100
      };
    });

    addLog('error', `Ошибка: ${error}`);
  }, [addLog]);

  // Очистка логов
  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  }, []);

  // Сброс статистики
  const resetStats = useCallback(() => {
    const newStats: AgentStats = {
      totalSent: 0,
      totalErrors: 0,
      todaySent: 0,
      emailsFound: 0,
      emailsSent: 0,
      uptime: 0,
      successRate: 0
    };
    
    setStats(newStats);
    setStatus(prev => ({ ...prev, totalSent: 0, totalErrors: 0 }));
    saveToStorage(STORAGE_KEYS.STATS, newStats);
    addLog('info', 'Статистика сброшена');
  }, [addLog, saveToStorage]);

  return {
    // Состояние
    status,
    settings,
    logs,
    stats,
    
    // Действия
    startAgent,
    pauseAgent,
    stopAgent,
    resumeAgent,
    updateSettings,
    addLog,
    updateStats,
    recordSuccess,
    recordMultipleSuccesses,
    recordError,
    clearLogs,
    resetStats,
    fetchSettingsFromServer
  };
};
