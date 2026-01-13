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
  const hasManualStartRef = useRef(false); // Флаг ручного запуска в этой сессии

  const LAST_RUN_KEY = 'agent_last_run_timestamp';
  const MANUAL_START_KEY = 'agent_manual_start_session'; // sessionStorage!
  
  // Проверка времени последнего запуска
  const canRunNow = useCallback(() => {
    const lastRunStr = localStorage.getItem(LAST_RUN_KEY);
    if (!lastRunStr) {
      return true; // Первый запуск
    }

    const lastRunTime = parseInt(lastRunStr, 10);
    const now = Date.now();
    const timeSinceLastRun = now - lastRunTime;
    
    // Используем интервал из настроек (в миллисекундах)
    const requiredInterval = settings.intervalHours * 60 * 60 * 1000;

    if (timeSinceLastRun < requiredInterval) {
      const hoursLeft = ((requiredInterval - timeSinceLastRun) / (60 * 60 * 1000)).toFixed(1);
      const hoursPassed = (timeSinceLastRun / (60 * 60 * 1000)).toFixed(1);
      console.log(`⏱️ Задача выполнялась ${hoursPassed}ч назад. Следующий запуск через ${hoursLeft}ч (интервал: ${settings.intervalHours}ч)`);
      return false;
    }

    return true;
  }, [settings.intervalHours]);

  // Сохранение времени запуска
  const saveRunTimestamp = useCallback(() => {
    localStorage.setItem(LAST_RUN_KEY, Date.now().toString());
  }, []);

  // Проверка, нужно ли выполнять задачу
  // При ручном запуске (hasManualStartRef) игнорируем проверку времени
  const shouldRunTask = useCallback((ignoreTimeCheck = false) => {
    if (status !== 'running' || isRunningRef.current) {
      return false;
    }

    if (!sessionId) {
      console.log('⚠️ Нет sessionId - агент не может отправить CV');
      return false;
    }

    // При ручном запуске игнорируем проверку времени
    if (!ignoreTimeCheck && !canRunNow()) {
      console.log('⏭️ Пропускаем запуск - задача выполнялась недавно');
      return false;
    }

    return true;
  }, [status, sessionId, canRunNow]);

  // Выполнение задачи агента (используем ту же логику что и "Разовая отправка")
  const runAgentTask = useCallback(async (isManualStart = false) => {
    console.log('🔍 Планировщик: Проверяем shouldRunTask (isManualStart:', isManualStart, ')...');
    // При ручном запуске игнорируем проверку времени
    if (!shouldRunTask(isManualStart)) {
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
          headless: settings.headless,   // Фоновый режим
          isScheduled: true              // Флаг автоматического запуска
        }
      );

      if (result.success) {
        const appliedCount = result.appliedCount || 0;
        const skippedCount = result.skippedCount || 0;
        const totalProcessed = result.total || 0;
        
        // Сохраняем время УСПЕШНОГО выполнения задачи
        saveRunTimestamp();
        console.log(`💾 Время выполнения задачи сохранено. Следующий запуск через ${settings.intervalHours}ч`);
        
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
      // Сбрасываем флаг ручного запуска после выполнения задачи
      // чтобы следующие автоматические запуски проверяли время
      if (hasManualStartRef.current) {
        hasManualStartRef.current = false;
        console.log('🔄 Флаг ручного запуска сброшен');
      }
      console.log('✅ Задача планировщика завершена');
    }
  }, [shouldRunTask, sessionId, settings.maxCVDaily, settings.headless, settings.intervalHours, onTaskComplete, onLog, saveRunTimestamp]);

  // Планирование следующего запуска (только настройка интервала, БЕЗ первого запуска)
  const scheduleNextRun = useCallback((runImmediately = false) => {
    console.log('📅 scheduleNextRun вызван, статус:', status, 'sessionId:', sessionId, 'isInitialized:', isInitializedRef.current, 'runImmediately:', runImmediately);
    
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
        runAgentTask(false); // false = автоматический запуск по расписанию
      }, intervalMs);

      // Запускаем первую задачу ТОЛЬКО если это ручной запуск
      if (runImmediately) {
        // При ручном запуске (нажатие кнопки) ИГНОРИРУЕМ проверку времени
        // Пользователь явно хочет запустить задачу СРАЗУ
        console.log('🚀 Планировщик: Ручной запуск - выполняем первую задачу через 2 секунды (игнорируем проверку времени)...');
        hasManualStartRef.current = true;
        
        setTimeout(() => {
          console.log('🚀 Планировщик: Выполняем первую задачу (ручной запуск)...');
          // Принудительно запускаем задачу, игнорируя проверку canRunNow()
          runAgentTask(true); // true = это ручной запуск
        }, 2000);
      } else {
        console.log('⏭️ Планировщик: Только настройка интервала, без немедленного запуска (перезагрузка страницы)');
      }
    } else {
      console.log('❌ Не можем запустить планировщик: статус =', status, ', sessionId =', sessionId);
    }
  }, [status, sessionId, settings.intervalHours, runAgentTask, canRunNow]);

  // Очистка интервала
  const clearScheduler = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRunningRef.current = false;
    isInitializedRef.current = false; // Сбрасываем флаг инициализации
    hasManualStartRef.current = false; // Сбрасываем флаг ручного запуска
    // НЕ очищаем LAST_RUN_KEY - это позволит планировщику правильно работать
    // при следующем запуске (проверка времени будет работать)
    console.log('🛑 Планировщик остановлен и сброшен');
  }, []);

  // Управление планировщиком - автозапуск при status=running, очистка при остановке
  useEffect(() => {
    console.log('🔍 useEffect сработал, статус:', status, 'sessionId:', sessionId, 'intervalRef:', !!intervalRef.current, 'isInitialized:', isInitializedRef.current);
    
    // Проверяем, был ли ручной запуск в этой сессии и когда
    const manualStartStr = sessionStorage.getItem(MANUAL_START_KEY);
    const isJustStarted = manualStartStr && (Date.now() - parseInt(manualStartStr)) < 1000; // Менее 1 секунды назад = только что нажали кнопку
    
    // Настраиваем планировщик когда статус=running
    if (status === 'running' && sessionId && !isInitializedRef.current) {
      if (manualStartStr && !isJustStarted) {
        // Перезагрузка страницы (флаг есть и установлен давно) - только настраиваем интервал, БЕЗ запуска
        console.log('🔄 Перезагрузка страницы: планировщик работает, задача НЕ запускается');
        scheduleNextRun(false);
      } else {
        // Только что нажали кнопку (флаг свежий) ИЛИ первый запуск (флага нет) - запускаем задачу
        console.log('✨ Ручной запуск кнопкой: запускаем задачу и планировщик');
        scheduleNextRun(true);
      }
    }
    
    // Очищаем планировщик если статус изменился на не-running
    if (status !== 'running' && intervalRef.current) {
      console.log('⚠️ Статус изменился на не-running, очищаем планировщик');
      clearScheduler();
      // Очищаем флаг ручного запуска
      sessionStorage.removeItem(MANUAL_START_KEY);
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
