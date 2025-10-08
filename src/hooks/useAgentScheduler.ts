import { useEffect, useRef, useCallback } from 'react';
import { AgentState, AgentSettings } from '@/types/agent-states';
import { agentServerAPI } from '@/lib/api/agent-server';

interface SchedulerProps {
  status: AgentState;
  settings: AgentSettings;
  sessionId: string | null;
  onTaskComplete: (success: boolean, count: number, errors: number) => void;
  onLog: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const useAgentScheduler = ({
  status,
  settings,
  sessionId,
  onTaskComplete,
  onLog
}: SchedulerProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const isInitializedRef = useRef(false); // Флаг для предотвращения множественных запусков

  // Проверка, нужно ли выполнять задачу
  const shouldRunTask = useCallback(() => {
    if (status !== 'running' || isRunningRef.current) {
      return false;
    }

    if (!sessionId) {
      console.log('⚠️ Нет sessionId - агент не может отправить CV');
      return false;
    }

    return true;
  }, [status, sessionId]);

  // Выполнение задачи агента (используем ту же логику что и "Разовая отправка")
  const runAgentTask = useCallback(async () => {
    console.log('🔍 Планировщик: Проверяем shouldRunTask...');
    if (!shouldRunTask()) {
      console.log('❌ Планировщик: shouldRunTask вернул false');
      return;
    }

    console.log('✅ Планировщик: shouldRunTask прошел, продолжаем...');
    console.log('🚀 Планировщик: Запускаем задачу отправки CV...');
    
    isRunningRef.current = true;
    onLog('🤖 Начинаем автоотправку CV на IT вакансии...', 'info');

    try {
      // Получаем AI анализ CV из cvFile (так же как в handleAutoApply)
      const cvFileData = localStorage.getItem('cvflow_cv_file');
      
      if (!cvFileData) {
        console.error('❌ CV файл не найден в localStorage!');
        onLog('Ошибка: CV файл не найден', 'error');
        onTaskComplete(false, 0, 1);
        return;
      }

      let cvFile;
      try {
        cvFile = JSON.parse(cvFileData);
      } catch (e) {
        console.error('❌ Не удалось распарсить CV файл:', e);
        onLog('Ошибка: Поврежденные данные CV', 'error');
        onTaskComplete(false, 0, 1);
        return;
      }

      const aiAnalysis = cvFile.aiAnalysis;
      
      if (!aiAnalysis) {
        console.warn('⚠️ CV файл найден, но нет AI анализа.');
        onLog('Ошибка: Сначала проанализируйте CV в разделе AI', 'error');
        onTaskComplete(false, 0, 1);
        return;
      }

      console.log('✅ AI анализ CV загружен');
      console.log('🚀 Запускаем autoApplyToJobs с параметрами:', {
        sessionId: sessionId?.substring(0, 20) + '...',
        hasAIAnalysis: true,
        maxJobs: settings.maxCVDaily,
        headless: settings.headless
      });
      
      // Запускаем автоматическую отправку (так же как handleAutoApply)
      const result = await agentServerAPI.autoApplyToJobs(
        sessionId,
        aiAnalysis,
        { 
          maxJobs: settings.maxCVDaily,  // Используем настройку из агента
          minMatchScore: 0,              // Отправляем на все вакансии
          headless: settings.headless    // Фоновый режим
        }
      );

      if (result.success) {
        const appliedCount = result.appliedCount || 0;
        const skippedCount = result.skippedCount || 0;
        const totalProcessed = result.total || 0;
        
        // "Пропущенные" вакансии - это НЕ ошибки!
        // Это просто вакансии без кнопки CV или уже обработанные
        // Ошибок нет, если API вернул success=true
        onTaskComplete(true, appliedCount, 0); // errorCount = 0, так как операция успешна
        
        if (skippedCount > 0) {
          onLog(`✅ Отправлено ${appliedCount} CV, пропущено ${skippedCount} (нет кнопки CV)`, 'success');
        } else {
          onLog(`✅ Отправлено ${appliedCount} CV`, 'success');
        }
        
        console.log('📊 Результат автоотправки:', {
          success: true,
          appliedCount,
          skippedCount,
          totalProcessed
        });
      } else {
        onTaskComplete(false, 0, 1);
        onLog(`❌ Ошибка: ${result.message || 'Неизвестная ошибка'}`, 'error');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('❌ Критическая ошибка планировщика:', errorMessage);
      onTaskComplete(false, 0, 1);
      onLog(`❌ Критическая ошибка: ${errorMessage}`, 'error');
    } finally {
      isRunningRef.current = false;
      console.log('✅ Задача планировщика завершена');
    }
  }, [shouldRunTask, sessionId, settings.maxCVDaily, settings.headless, onTaskComplete, onLog]);

  // Планирование следующего запуска
  const scheduleNextRun = useCallback(() => {
    console.log('📅 scheduleNextRun вызван, статус:', status, 'sessionId:', sessionId, 'isInitialized:', isInitializedRef.current);
    
    // Предотвращаем множественные запуски
    if (isInitializedRef.current) {
      console.log('⚠️ Планировщик уже инициализирован, пропускаем');
      return;
    }

    if (intervalRef.current) {
      console.log('🔄 Очищаем существующий интервал');
      clearInterval(intervalRef.current);
    }

    if (status === 'running' && sessionId) {
      isInitializedRef.current = true; // Устанавливаем флаг
      const intervalMs = settings.intervalHours * 60 * 60 * 1000; // Конвертируем часы в миллисекунды
      
      console.log(`✅ Планировщик настроен: следующий запуск через ${settings.intervalHours} час(ов)`);
      
      intervalRef.current = setInterval(() => {
        runAgentTask();
      }, intervalMs);

      // Запускаем первую задачу сразу
      console.log('🚀 Планировщик: Запускаем первую задачу через 2 секунды...');
      setTimeout(() => {
        console.log('🚀 Планировщик: Выполняем первую задачу...');
        runAgentTask();
      }, 2000); // Небольшая задержка для инициализации
    } else {
      console.log('❌ Не можем запустить планировщик: статус =', status, ', sessionId =', sessionId);
    }
  }, [status, sessionId, settings.intervalHours, runAgentTask]);

  // Очистка интервала
  const clearScheduler = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRunningRef.current = false;
    isInitializedRef.current = false; // Сбрасываем флаг инициализации
    console.log('🛑 Планировщик остановлен и сброшен');
  }, []);

  // Управление планировщиком - автозапуск при status=running, очистка при остановке
  useEffect(() => {
    console.log('🔍 useEffect сработал, статус:', status, 'sessionId:', sessionId, 'intervalRef:', !!intervalRef.current, 'isInitialized:', isInitializedRef.current);
    
    // Запускаем планировщик автоматически когда статус меняется на running
    if (status === 'running' && sessionId && !isInitializedRef.current) {
      console.log('✨ Статус изменился на running, автоматически запускаем планировщик');
      scheduleNextRun();
    }
    
    // Очищаем планировщик если статус изменился на не-running
    if (status !== 'running' && intervalRef.current) {
      console.log('⚠️ Статус изменился на не-running, очищаем планировщик');
      clearScheduler();
    }

    // Очистка при размонтировании компонента
    return () => {
      console.log('🧹 Cleanup useAgentScheduler, intervalRef:', !!intervalRef.current);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isRunningRef.current = false;
        isInitializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId]);

  return {
    isRunning: isRunningRef.current,
    clearScheduler,
    startScheduler: scheduleNextRun // Экспортируем для ручного запуска
  };
};
