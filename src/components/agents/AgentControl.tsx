import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LucruMdConfig } from '@/lib/config/lucru-config';
import { agentServerAPI } from '@/lib/api/agent-server';
import { useCV } from '@/hooks/useCV';
import { useAgentState } from '@/hooks/useAgentState';
import { useAgentScheduler } from '@/hooks/useAgentScheduler';
import { Play, AlertCircle, CheckCircle, Layers, Zap, FileText, ChevronDown, ChevronUp, Pause, Square, PlayCircle, Settings, Bot, Activity, Server } from 'lucide-react';
import { toast } from 'sonner';
import { LoginDialog } from './LoginDialog';
import { AgentSettingsDialog } from './AgentSettings';

interface AgentStatus {
  isRunning: boolean;
  lastRun?: string;
  totalSessions: number;
  successRate: number;
}

interface AgentControlProps {
  config: LucruMdConfig;
  onConfigChange: (config: LucruMdConfig) => void;
  onSessionUpdate: () => void;
}

export const AgentControl: React.FC<AgentControlProps> = ({
  config,
  onConfigChange,
  onSessionUpdate
}) => {
  const { cvFile, isLoggedIn, setLoggedIn, sessionId, cvExistsOnSite, saveSessionId, saveCVExistsStatus, saveAIAnalysis } = useCV();
  const { 
    status: agentStatus, 
    settings, 
    logs, 
    stats,
    startAgent, 
    pauseAgent, 
    stopAgent, 
    resumeAgent,
    recordMultipleSuccesses,
    recordError,
    addLog,
    updateSettings,
    updateStats,
    resetStats
  } = useAgentState();

  const [status, setStatus] = useState<AgentStatus>({
    isRunning: false,
    totalSessions: 0,
    successRate: 0
  });
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [isCVSynced, setIsCVSynced] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [localCvExistsOnSite, setLocalCvExistsOnSite] = useState<boolean | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  const [autoApplyProgress, setAutoApplyProgress] = useState('');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Планировщик задач - теперь работает автоматически через useEffect
  useAgentScheduler({
    status: agentStatus.state,
    settings,
    sessionId: sessionId, // Используем sessionId из useCV
    onTaskComplete: (success, count, errors) => {
      if (success && count > 0) {
        // Используем recordMultipleSuccesses для корректного подсчета
        recordMultipleSuccesses(count);
      }
      
      // Ошибки записываем только если они реально есть
      if (errors > 0) {
        recordError(`Ошибок при отправке: ${errors}`);
      }
      
      // Если операция не успешна - записываем ошибку
      if (!success) {
        recordError('Ошибка выполнения задачи');
      }
    },
    onLog: (message, type) => {
      addLog(type, message);
    }
  });

  // Загрузка статистики с сервера (вызывается при монтировании)
  const loadStatsFromServer = async () => {
    try {
      const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
      const response = await fetch(`${baseUrl}/api/stats`);
      if (response.ok) {
        const serverStats = await response.json();
        
        const totalSent = serverStats.totalSent || 0;
        const totalErrors = serverStats.totalErrors || 0;
        
        updateStats({
          totalSent: totalSent,
          totalErrors: totalErrors,
          todaySent: 0, // Сбрасываем прогресс текущего запуска
          successRate: totalErrors > 0 ? (totalSent / (totalSent + totalErrors)) * 100 : 100,
          lastActivity: new Date()
        });
        
        console.log(`📊 Статистика загружена: всего ${totalSent} CV`);
      }
    } catch (error) {
      // Убираем спам
    }
  };

  useEffect(() => {
    checkServerStatus();
    setLocalSessionId(sessionId);
    setLocalCvExistsOnSite(cvExistsOnSite);
    
    // Загружаем статистику с сервера при монтировании/обновлении
    loadStatsFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, cvExistsOnSite]);

  useEffect(() => {
    checkCVSync();
  }, [cvFile, isLoggedIn, cvExistsOnSite]);

  // Автообновление статистики каждые 10 секунд когда агент работает
  useEffect(() => {
    if (agentStatus.state !== 'running') {
      return;
    }

    let lastLoggedProgress = -1; // Последнее залогированное значение

    const updateStatsFromServer = async () => {
      try {
        const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
        const response = await fetch(`${baseUrl}/api/stats`);
        if (response.ok) {
          const serverStats = await response.json();
          
          // Обновляем локальное состояние статистики с данными сервера
          const totalSent = serverStats.totalSent || 0;
          const totalErrors = serverStats.totalErrors || 0;
          
          // Получаем начальное значение при запуске агента
          const startCount = parseInt(localStorage.getItem('agent_run_start_count') || '0', 10);
          
          // Вычисляем прогресс ТЕКУЩЕГО запуска
          const currentRunProgress = totalSent - startCount;
          
          // Обновляем stats напрямую (БЕЗ лога в консоль)
          updateStats({
            totalSent: totalSent,
            totalErrors: totalErrors,
            todaySent: currentRunProgress, // Показываем прогресс ТЕКУЩЕГО запуска
            successRate: totalErrors > 0 ? (totalSent / (totalSent + totalErrors)) * 100 : 100,
            lastActivity: new Date()
          });
          
          // Логируем ТОЛЬКО при изменении прогресса (не каждые 10 секунд!)
          if (currentRunProgress !== lastLoggedProgress && currentRunProgress > 0) {
            lastLoggedProgress = currentRunProgress;
            // Логируем только каждые 5 CV
            if (currentRunProgress % 5 === 0) {
              console.log(`📊 Прогресс: ${currentRunProgress}/${settings.maxCVDaily} CV`);
            }
          }
        }
      } catch (error) {
        // Убираем спам ошибок в консоли
      }
    };

    // Первое обновление сразу
    updateStatsFromServer();

    // Затем каждые 10 секунд
    const intervalId = setInterval(updateStatsFromServer, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [agentStatus.state, updateStats, settings.maxCVDaily]);

  const checkServerStatus = async () => {
    setServerStatus('checking');
    const isOnline = await agentServerAPI.checkServerHealth();
    setServerStatus(isOnline ? 'online' : 'offline');
  };

  const checkCVSync = () => {
    const isSynced = cvFile && isLoggedIn && cvExistsOnSite === true;
    setIsCVSynced(isSynced);
  };

  const handleLoginClick = () => {
    if (!cvFile) {
      toast.error('Пожалуйста, загрузите CV файл');
      return;
    }

    if (serverStatus !== 'online') {
      toast.error('Сервер агента недоступен');
      return;
    }

    setIsLoginDialogOpen(true);
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoginDialogOpen(false);
    setStatus(prev => ({ ...prev, isRunning: true }));
    setProgress(0);
    setCurrentTask('Инициализация...');

    try {
      setProgress(20);
      setCurrentTask('Запуск Playwright агента...');

      const result = await agentServerAPI.login({ email, password });

      setProgress(60);
      setCurrentTask('Агент выполняет вход...');

      if (result.success && result.cookies) {
        setProgress(80);
        setCurrentTask('Сохранение сессии...');
        
        const newSessionId = result.sessionId || null;
        
        // ВАЖНО: Сначала сохраняем sessionId, потом устанавливаем isLoggedIn
        // Это предотвращает рассинхронизацию состояния
        if (newSessionId) {
          saveSessionId(newSessionId);
          setLocalSessionId(newSessionId);
        }
        
        // Устанавливаем isLoggedIn только после сохранения sessionId
        setLoggedIn(true);
        
        // Проверяем CV на сайте
        if (newSessionId) {
          setProgress(90);
          setCurrentTask('Проверка наличия CV...');
          
          try {
            const cvStatus = await agentServerAPI.checkCVStatus(newSessionId);
            
            if (cvStatus.success) {
              setLocalCvExistsOnSite(cvStatus.cvExists);
              saveCVExistsStatus(cvStatus.cvExists);
              
              if (cvStatus.cvExists) {
                toast.success('✅ CV уже загружено на Lucru.md!');
              } else {
                toast.info('ℹ️ CV не найдено, требуется синхронизация');
              }
            }
          } catch (error) {
            console.error('Ошибка проверки CV:', error);
          }
        }
        
        setProgress(100);
        setCurrentTask('Вход выполнен!');
        toast.success('✅ Успешный вход в Lucru.md!');
      } else {
        throw new Error(result.message || 'Ошибка входа');
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(`❌ Ошибка входа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setStatus(prev => ({ ...prev, isRunning: false }));
      setProgress(0);
      setCurrentTask('');
    }
  };

  // Запуск автоматической отправки на вакансии с мониторингом прогресса
  const handleAutoApply = async () => {
    console.log('🔍 Отладка автоотправки:');
    console.log('   isLoggedIn:', isLoggedIn);
    console.log('   localSessionId:', localSessionId);
    console.log('   cvFile:', cvFile);
    console.log('   cvFile.aiAnalysis:', cvFile?.aiAnalysis);
    
    if (!isLoggedIn || !localSessionId) {
      toast.error('Сначала войдите в аккаунт');
      return;
    }

    if (!cvFile) {
      toast.error('Сначала загрузите CV файл в разделе CV');
      return;
    }

    // Если CV загружен, но нет AI анализа - запускаем анализ автоматически
    if (!cvFile.aiAnalysis) {
      if (!cvFile.filePath) {
        toast.error('CV файл загружен, но путь к файлу не найден. Перезагрузите CV файл.');
        return;
      }

      toast.info('🤖 CV загружен, но нет AI анализа. Запускаем анализ автоматически...');
      
      // Получаем API ключ из настроек AI
      const aiSettings = localStorage.getItem('cvflow_ai_settings');
      let apiKey = '';
      if (aiSettings) {
        try {
          const settings = JSON.parse(aiSettings);
          apiKey = settings.config?.apiKey || '';
        } catch (e) {
          console.error('Ошибка чтения настроек AI:', e);
        }
      }
      
      if (!apiKey) {
        toast.error('❌ Groq API ключ не настроен. Перейдите в раздел AI → Настройки и укажите API ключ');
        return;
      }
      
      try {
        const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
        const response = await fetch(`${baseUrl}/api/agent/analyze-cv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: cvFile.filePath,
            apiKey: apiKey
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Сохраняем результаты AI анализа через хук
          saveAIAnalysis(data.analysis);
          
          toast.success('✅ AI анализ завершен! Продолжаем отправку...');
          
          // Используем анализ напрямую для отправки (не дожидаясь обновления состояния)
          // Продолжаем выполнение функции ниже, используя data.analysis
          const aiAnalysis = data.analysis;
          
          // Переходим к отправке, используя полученный анализ
          setIsAutoApplying(true);
          setAutoApplyProgress('Запуск автоотправки CV на IT вакансии...');

          const maxJobs = settings.maxCVDaily || config?.settings?.maxCVDaily || 20;
          console.log('📊 Разовая отправка: maxJobs =', maxJobs);
          
          // Запоминаем начальное количество для отслеживания прогресса
          const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
          let sessionStartCount = 0;
          try {
            const statsResponse = await fetch(`${baseUrl}/api/stats`);
            if (statsResponse.ok) {
              const serverStats = await statsResponse.json();
              sessionStartCount = serverStats.totalSent || 0;
            }
          } catch (e) {
            console.log('⚠️ Не удалось получить начальную статистику');
          }
          
          // Запускаем отправку с полученным анализом
          const result = await agentServerAPI.autoApplyToJobs(
            localSessionId,
            aiAnalysis, // Используем только что полученный анализ
            { 
              maxJobs: maxJobs,
              minMatchScore: 70,
              headless: settings.headless ?? config?.settings?.headless ?? true
            }
          );

          if (result.success) {
            setAutoApplyProgress(`Завершено! Отправлено: ${result.appliedCount}/${result.total}`);
            toast.success(`✅ ${result.message}`);
            await loadStatsFromServer();
          } else {
            if (result.message && result.message.includes('Выполните вход')) {
              toast.error('❌ Сессия истекла. Войдите заново.');
              setLoggedIn(false);
              saveSessionId(null);
              setLocalSessionId(null);
            } else {
              toast.error(`❌ Ошибка: ${result.message}`);
            }
          }
          
          setIsAutoApplying(false);
          setAutoApplyProgress('');
          return; // Завершаем выполнение
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Неизвестная ошибка' }));
          toast.error(`❌ Ошибка AI анализа: ${errorData.message || 'Не удалось проанализировать CV'}`);
          return;
        }
      } catch (error) {
        console.error('AI analysis error:', error);
        toast.error(`❌ Ошибка AI анализа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        return;
      }
    }

    setIsAutoApplying(true);
    setAutoApplyProgress('Запуск автоотправки CV на IT вакансии...');

    // Приоритет: 1) settings из AgentState, 2) config, 3) 20 по умолчанию
    const maxJobs = settings.maxCVDaily || config?.settings?.maxCVDaily || 20;
    console.log('📊 Разовая отправка: maxJobs =', maxJobs, '(из settings.maxCVDaily =', settings.maxCVDaily, ')');
    
    // Запоминаем начальное количество для отслеживания прогресса ЭТОЙ сессии
    const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
    let sessionStartCount = 0;
    try {
      const statsResponse = await fetch(`${baseUrl}/api/stats`);
      if (statsResponse.ok) {
        const serverStats = await statsResponse.json();
        sessionStartCount = serverStats.totalSent || 0;
        console.log(`📊 Начальное количество отправленных CV: ${sessionStartCount}`);
      }
    } catch (e) {
      console.log('⚠️ Не удалось получить начальную статистику');
    }
    
    let lastProgress = 0;
    let noProgressCount = 0;
    let isCompleted = false;
    
    // Интервал мониторинга прогресса (каждые 5 секунд для реального времени)
    const progressMonitor = setInterval(async () => {
      if (isCompleted) {
        clearInterval(progressMonitor);
        return;
      }

      try {
        // Получаем статистику с сервера
        const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
        const response = await fetch(`${baseUrl}/api/stats`);
        
        if (response.ok) {
          const serverStats = await response.json();
          const totalSent = serverStats.totalSent || 0;
          const recentActivity = serverStats.recentActivity || [];
          
          // Вычисляем прогресс ТЕКУЩЕЙ сессии (а не общий)
          const currentSessionProgress = totalSent - sessionStartCount;
          
          // Обновляем UI с прогрессом текущей сессии
          const displayProgress = Math.min(currentSessionProgress, maxJobs);
          setAutoApplyProgress(`Отправка CV: ${displayProgress} / ${maxJobs}`);
          console.log(`📊 Мониторинг: ${displayProgress} / ${maxJobs} (total: ${totalSent}, start: ${sessionStartCount})`);
          
          // Проверяем есть ли свежая активность (за последние 30 секунд)
          const hasRecentActivity = recentActivity.some((activity: any) => {
            if (!activity.timestamp) return false;
            const activityTime = new Date(activity.timestamp).getTime();
            const now = Date.now();
            return (now - activityTime) < 30000; // 30 секунд
          });
          
          if (currentSessionProgress === lastProgress && !hasRecentActivity) {
            noProgressCount++;
            console.log(`⚠️ Нет прогресса отправки: ${noProgressCount} раз подряд (${noProgressCount * 5} сек)`);
            
            // Если 24 раза подряд нет прогресса (2 минуты = 24 × 5 сек) - перезапускаем агента
            if (noProgressCount >= 24) {
              console.log('🔄 Обнаружено зависание (2 минуты без прогресса). Перезапуск агента...');
              setAutoApplyProgress('Агент завис. Перезапуск...');
              toast.warning('⚠️ Агент завис (2 мин без прогресса). Выполняется перезапуск...');
              
              // Закрываем старую сессию агента
              try {
                await agentServerAPI.closeAgent(localSessionId);
              } catch (e) {
                console.log('Ошибка закрытия агента:', e);
              }
              
              // Небольшая пауза
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Сбрасываем счетчик
              noProgressCount = 0;
              lastProgress = currentSessionProgress;
              
              toast.info('🔄 Агент перезапущен. Продолжаем отправку...');
            }
          } else {
            // Есть прогресс - сбрасываем счетчик
            if (currentSessionProgress > lastProgress) {
              lastProgress = currentSessionProgress;
              noProgressCount = 0;
            }
          }
        }
      } catch (error) {
        console.error('Ошибка мониторинга прогресса:', error);
      }
    }, 5000); // Каждые 5 секунд для плавного обновления UI

    try {
      toast.info(`🤖 Запуск автоотправки на ${maxJobs} вакансий...`);
      setAutoApplyProgress(`Отправка CV: 0 / ${maxJobs}`);
      
      const result = await agentServerAPI.autoApplyToJobs(
        localSessionId,
        cvFile.aiAnalysis,
        { 
          maxJobs: maxJobs,
          minMatchScore: 70,
          headless: settings.headless ?? config?.settings?.headless ?? true
        }
      );

      isCompleted = true;
      clearInterval(progressMonitor);

      if (result.success) {
        setAutoApplyProgress(`Завершено! Отправлено: ${result.appliedCount}/${result.total}`);
        toast.success(`✅ ${result.message}`);
        
        // Обновляем статистику
        await loadStatsFromServer();
        
        // Показываем детали
        if (result.results && result.results.length > 0) {
          const applied = result.results.filter((r: any) => r.status === 'applied');
          console.log('📊 Результаты автоотправки:', applied);
        }
      } else {
        // Проверяем нужна ли авторизация
        if (result.message && result.message.includes('Выполните вход')) {
          toast.error('❌ Сессия истекла. Войдите заново.');
          setLoggedIn(false);
          saveSessionId(null);
          setLocalSessionId(null);
        } else {
          throw new Error(result.message);
        }
      }

    } catch (error) {
      isCompleted = true;
      clearInterval(progressMonitor);
      console.error('Auto-apply error:', error);
      toast.error(`❌ Ошибка автоотправки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setAutoApplyProgress('');
    } finally {
      setTimeout(() => {
        setIsAutoApplying(false);
        setAutoApplyProgress('');
      }, 5000);
    }
  };

  return (
        <Card className="w-full border shadow-lg hover:shadow-xl transition-all duration-300">
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Lucru.md Agent
              </CardTitle>
              <CardDescription className="text-gray-600">
                Автоматическая отправка CV на lucru.md
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={serverStatus === 'online' ? 'default' : 'destructive'}
            className="px-3 py-1"
          >
            {serverStatus === 'online' ? 'Онлайн' : serverStatus === 'offline' ? 'Офлайн' : 'Проверка...'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Прогресс */}
        {status.isRunning && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">Прогресс выполнения</span>
              <span className="text-sm font-bold text-blue-600">{progress.toFixed(0)}%</span>
            </div>
            <Progress 
              value={progress} 
              className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
            />
            {currentTask && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-700 font-medium">{currentTask}</p>
              </div>
            )}
          </div>
        )}

            {/* Конфигурация */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    console.log('Config button clicked, current state:', isConfigExpanded);
                    setIsConfigExpanded(!isConfigExpanded);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
                >
                  <span>Конфигурация</span>
                  {isConfigExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                <Button
                  onClick={() => setIsSettingsDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Настройки агента"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
          
              {isConfigExpanded && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Сервер:</span>
                      <span className={serverStatus === 'online' ? 'text-green-600' : 'text-red-600'}>
                        {serverStatus === 'online' ? 'Онлайн' : 'Офлайн'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CV файл:</span>
                      <span className="text-gray-800 truncate max-w-24">
                        {cvFile?.name || 'Не загружен'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lucru.md:</span>
                      <span className={isLoggedIn ? 'text-green-600' : 'text-gray-600'}>
                        {isLoggedIn ? 'Авторизован' : 'Не авторизован'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CV синхронизация:</span>
                      <span className={
                        !isLoggedIn ? 'text-gray-600' :
                        localCvExistsOnSite === null ? 'text-yellow-600' :
                        localCvExistsOnSite ? 'text-green-600' : 'text-red-600'
                      }>
                        {!isLoggedIn ? 'Требует авторизации' :
                         localCvExistsOnSite === null ? 'Проверка...' :
                         localCvExistsOnSite ? 'Синхронизировано' : 'Требует синхронизации'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
        </div>

        {/* Предупреждения */}
        {serverStatus === 'offline' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertDescription className="text-red-700 font-medium">
              <strong>Сервер агента недоступен.</strong> Запустите: <code className="bg-red-100 px-2 py-1 rounded text-sm">node agent-server-simple.js</code>
            </AlertDescription>
          </Alert>
        )}

        {!cvFile && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <AlertDescription className="text-orange-700 font-medium">
              <strong>CV файл не загружен.</strong> Для входа необходимо загрузить CV файл.
            </AlertDescription>
          </Alert>
        )}
        
        {isLoggedIn && cvFile && localCvExistsOnSite === false && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <AlertDescription className="text-yellow-700 font-medium">
              <strong>CV не найдено на Lucru.md!</strong> Перейдите в CV → Синхронизация.
            </AlertDescription>
          </Alert>
        )}


            {/* Статус агента */}
            {agentStatus.isActive && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-blue-800">
                      {agentStatus.state === 'running' ? 'Агент работает' :
                       agentStatus.state === 'paused' ? 'Агент приостановлен' : 'Агент остановлен'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stats.totalSent} отправлено | {stats.totalErrors} ошибок
                  </Badge>
                </div>
                <div className="text-xs text-blue-600">
                  {agentStatus.state === 'running' ? (
                    <>
                      <div>Следующий запуск: через {settings.intervalHours} час(ов)</div>
                      <div className="text-green-600 font-medium mt-1">
                        ✅ Агент работает в фоновом режиме (headless)
                      </div>
                      <div className="text-gray-600 mt-1">
                        🔄 Автоматически отправляет CV по расписанию
                      </div>
                      {!sessionId && (
                        <div className="text-red-600 font-medium mt-2 p-2 bg-red-50 rounded border border-red-200">
                          ⚠️ Нет авторизации! Сначала войдите в аккаунт, чтобы агент мог отправлять CV.
                        </div>
                      )}
                    </>
                  ) : agentStatus.state === 'paused' ? (
                    'Приостановлен - нажмите "Возобновить"'
                  ) : (
                    'Остановлен - нажмите "Запустить агента"'
                  )}
                </div>
              </div>
            )}

        {/* Кнопки управления */}
        <div className="space-y-4">
          {!isLoggedIn || !sessionId ? (
            <Button 
              onClick={handleLoginClick}
              disabled={!cvFile || status.isRunning}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="h-5 w-5 mr-3" />
              Войти в аккаунт
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Основные кнопки */}
              <div className="flex gap-3">
                {agentStatus.state === 'idle' || agentStatus.state === 'stopped' ? (
                  <Button 
                    onClick={async () => {
                      // Загружаем текущую статистику с сервера
                      const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
                      const response = await fetch(`${baseUrl}/api/stats`);
                      if (response.ok) {
                        const serverStats = await response.json();
                        const currentTotal = serverStats.totalSent || 0;
                        
                        // Сохраняем начальное значение для подсчёта прогресса
                        localStorage.setItem('agent_run_start_count', currentTotal.toString());
                        console.log(`🚀 Запуск агента. Начальное значение: ${currentTotal} CV`);
                      }
                      
                      // Обнуляем прогресс текущего запуска
                      updateStats({ todaySent: 0 });
                      startAgent(sessionId);
                      toast.success('Автоматический агент запущен');
                    }}
                    disabled={!cvFile}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <PlayCircle className="h-5 w-5 mr-2" />
                    Запустить агента
                  </Button>
                ) : agentStatus.state === 'running' ? (
                  <>
                    <Button
                      onClick={() => {
                        pauseAgent();
                        toast.info('Агент приостановлен');
                      }}
                      variant="outline"
                      className="flex-1 h-12 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Pause className="h-5 w-5 mr-2" />
                      Пауза
                    </Button>
                    <Button
                      onClick={() => {
                        stopAgent();
                        localStorage.removeItem('agent_run_start_count'); // Очищаем начальное значение
                        updateStats({ todaySent: 0 }); // Сбрасываем прогресс
                        toast.info('Агент остановлен');
                      }}
                      variant="outline"
                      className="flex-1 h-12 border-red-400 text-red-600 hover:bg-red-50"
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Стоп
                    </Button>
                  </>
                ) : agentStatus.state === 'paused' ? (
                  <>
                    <Button
                      onClick={() => {
                        resumeAgent();
                        toast.success('Агент возобновлен');
                      }}
                      className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Возобновить
                    </Button>
                    <Button
                      onClick={() => {
                        stopAgent();
                        localStorage.removeItem('agent_run_start_count'); // Очищаем начальное значение
                        updateStats({ todaySent: 0 }); // Сбрасываем прогресс
                        toast.info('Агент остановлен');
                      }}
                      variant="outline"
                      className="flex-1 h-12 border-red-400 text-red-600 hover:bg-red-50"
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Стоп
                    </Button>
                  </>
                ) : null}

                {/* Кнопка разовой отправки */}
                <Button
                  onClick={handleAutoApply}
                  disabled={!cvFile || isAutoApplying}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  {isAutoApplying ? 'Отправка...' : 'Разовая отправка'}
                </Button>
              </div>

              {/* Кнопка выхода */}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setLoggedIn(false);
                    saveSessionId(null);
                    saveCVExistsStatus(null);
                    setLocalSessionId(null);
                    setLocalCvExistsOnSite(null);
                    stopAgent();
                    toast.info('Выход выполнен');
                  }}
                  variant="outline"
                  size="sm"
                  className="h-10 px-6 border-gray-300 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
                >
                  Выйти
                </Button>
              </div>
            </div>
          )}
          
          {isAutoApplying && autoApplyProgress && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
                    <div className="absolute inset-0 h-5 w-5 bg-blue-400 rounded-full animate-ping opacity-25"></div>
                  </div>
                  <span className="text-sm font-semibold text-blue-900">Разовая отправка</span>
                </div>
                <Badge variant="outline" className="bg-white border-blue-400 text-blue-700">
                  В процессе
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-blue-700 font-medium">
                  {autoApplyProgress}
                </div>
                
                {/* Анимированный прогресс-бар */}
                <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Activity className="h-3 w-3" />
                  <span>Мониторинг прогресса активен</span>
                </div>
              </div>
            </div>
          )}

          {/* Статус-бар прогресса автоотправки */}
          {agentStatus.state === 'running' && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600 animate-pulse" />
                  <span className="text-sm font-semibold text-gray-700">Прогресс за текущую сессию</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-400">
                  {stats.todaySent} / {settings.maxCVDaily} CV
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Progress 
                  value={(stats.todaySent / settings.maxCVDaily) * 100} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Отправлено: {stats.todaySent} CV</span>
                  <span>Цель: {settings.maxCVDaily} CV</span>
                </div>
              </div>

              {stats.todaySent >= settings.maxCVDaily && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Цель достигнута! Ожидание следующего запуска через {settings.intervalHours}ч
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        onLogin={handleLogin}
      />

      <AgentSettingsDialog
        settings={settings}
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
        onSave={(newSettings) => {
          updateSettings(newSettings);
          toast.success('Настройки сохранены');
        }}
      />
    </Card>
  );
};

