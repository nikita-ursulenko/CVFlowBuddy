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
import { useSettings } from '@/hooks/useSettings';
import { useAI } from '@/hooks/useAI';
import { useAgentAutoApply } from '@/hooks/useAgentAutoApply';

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

  const { settings: generalSettings } = useSettings();
  const { settings: aiSystemSettings } = useAI();

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
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [totalCategoryJobs, setTotalCategoryJobs] = useState<number>(0);

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
        if (serverStats.totalCategoryJobs) setTotalCategoryJobs(serverStats.totalCategoryJobs);
        
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

      if (result.success) {
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

  const { isAutoApplying, autoApplyProgress, handleAutoApply } = useAgentAutoApply({
    sessionId: localSessionId,
    cvFile,
    settings,
    config,
    generalSettings,
    aiSystemSettings,
    setLoggedIn,
    saveSessionId,
    saveAIAnalysis,
    loadStatsFromServer
  });

  const handleCloseBrowser = async () => {
    if (!localSessionId) return;
    try {
      const response = await agentServerAPI.closeAgent(localSessionId);
      if (response.success) {
        toast.success(response.message || 'Браузер агента закрыт');
      } else {
        toast.error(response.message || 'Ошибка: браузер не закрыт');
      }
    } catch (error) {
      toast.error('Произошла ошибка при закрытии браузера');
    }
  };

  return (
    <Card className="w-full border border-border shadow-lg hover:shadow-xl transition-all duration-300 bg-card overflow-hidden">
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">
                Lucru.md Agent
              </CardTitle>
              <CardDescription className="text-muted-foreground">
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
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Прогресс выполнения</span>
              <span className="text-sm font-bold text-primary">{progress.toFixed(0)}%</span>
            </div>
            <Progress 
              value={progress} 
              className="w-full h-2 bg-muted rounded-full overflow-hidden"
            />
            {currentTask && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <p className="text-sm text-foreground font-medium">{currentTask}</p>
              </div>
            )}
          </div>
        )}

            {/* Конфигурация */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-4 border border-border">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    console.log('Config button clicked, current state:', isConfigExpanded);
                    setIsConfigExpanded(!isConfigExpanded);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Сервер:</span>
                      <span className={serverStatus === 'online' ? 'text-success font-medium' : 'text-destructive font-medium'}>
                        {serverStatus === 'online' ? 'Онлайн' : 'Офлайн'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">CV файл:</span>
                      <span className="text-foreground font-medium truncate max-w-24">
                        {cvFile?.name || 'Не загружен'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Lucru.md:</span>
                      <span className={isLoggedIn ? 'text-success font-medium' : 'text-muted-foreground'}>
                        {isLoggedIn ? 'Авторизован' : 'Не авторизован'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Синхронизация:</span>
                      <span className={
                        !isLoggedIn ? 'text-muted-foreground' :
                        localCvExistsOnSite === null ? 'text-warning font-medium' :
                        localCvExistsOnSite ? 'text-success font-medium' : 'text-destructive font-medium'
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
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              <strong>Сервер агента недоступен.</strong> Запустите: <code className="bg-destructive/10 px-2 py-1 rounded text-sm">npm run agent:server</code>
            </AlertDescription>
          </Alert>
        )}

        {!cvFile && (
          <Alert className="border-warning/20 bg-warning/5">
            <AlertCircle className="h-5 w-5 text-warning" />
            <AlertDescription className="text-warning font-medium">
              <strong>CV файл не загружен.</strong> Для входа необходимо загрузить CV файл.
            </AlertDescription>
          </Alert>
        )}
        
        {isLoggedIn && cvFile && localCvExistsOnSite === false && (
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              <strong>CV не найдено на Lucru.md!</strong> Перейдите в CV → Синхронизация.
            </AlertDescription>
          </Alert>
        )}

        {isLoggedIn && cvFile && !cvFile.aiAnalysis && (
          <Alert className="border-warning/30 bg-warning/5">
            <AlertCircle className="h-5 w-5 text-warning" />
            <AlertDescription className="text-warning font-medium">
              <strong>⚠️ Нет AI-анализа CV!</strong> Агент не может запуститься. Перейдите в раздел <strong>"CV"</strong> и нажмите <strong>"Анализировать CV"</strong>.
            </AlertDescription>
          </Alert>
        )}


            {/* Статус агента */}
            {agentStatus.isActive && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-primary">
                      {agentStatus.state === 'running' ? 'Агент работает' :
                       agentStatus.state === 'paused' ? 'Агент приостановлен' : 'Агент остановлен'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-background/50">
                    {stats.totalSent} отправлено | {stats.totalErrors} ошибок
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {agentStatus.state === 'running' ? (
                    <>
                      <div>Следующий запуск: через {settings.intervalHours < 1 ? `${settings.intervalHours * 60} минут` : `${settings.intervalHours} час(ов)`}</div>
                      <div className="text-success font-medium mt-1">
                        ✅ Агент работает в фоновом режиме (headless)
                      </div>
                      <div className="mt-1">
                        🔄 Автоматически отправляет CV по расписанию
                      </div>
                      {!sessionId && (
                        <div className="text-destructive font-medium mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
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
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
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
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
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
                      className="flex-1 h-12 border-warning/50 text-warning hover:bg-warning/10"
                    >
                      <Pause className="h-5 w-5 mr-2" />
                      Пауза
                    </Button>
                    <Button
                      onClick={() => {
                        stopAgent();
                        localStorage.removeItem('agent_run_start_count'); // Очищаем начальное значение
                        updateStats({ todaySent: 0 }); // Сбрасываем прогресс
                        toast.info('Агент остановлен, закрываем браузер...');
                        handleCloseBrowser();
                      }}
                      variant="outline"
                      className="flex-1 h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
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
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    >
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Возобновить
                    </Button>
                    <Button
                      onClick={() => {
                        stopAgent();
                        localStorage.removeItem('agent_run_start_count'); // Очищаем начальное значение
                        updateStats({ todaySent: 0 }); // Сбрасываем прогресс
                        toast.info('Агент остановлен, закрываем браузер...');
                        handleCloseBrowser();
                      }}
                      variant="outline"
                      className="flex-1 h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Стоп
                    </Button>
                  </>
                ) : null}

                {/* Кнопка разовой отправки */}
                <Button
                  onClick={() => {
                    if (!cvFile?.aiAnalysis) {
                      toast.error('❌ Нет AI-анализа CV! Перейдите в раздел "CV" → нажмите "Анализировать CV"');
                      return;
                    }
                    handleAutoApply(1);
                  }}
                  disabled={!cvFile || isAutoApplying}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  {isAutoApplying ? 'Отправка...' : 'Разовая отправка (1)'}
                </Button>
              </div>

              {/* Кнопки выхода и закрытия браузера */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <Button
                  onClick={handleCloseBrowser}
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 border-border hover:bg-warning/10 hover:text-warning transition-all"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Закрыть браузер
                </Button>
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
                  className="h-10 px-6 border-border hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  Выйти
                </Button>
              </div>
            </div>
          )}
          
          {isAutoApplying && autoApplyProgress && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Zap className="h-5 w-5 text-primary animate-pulse" />
                    <div className="absolute inset-0 h-5 w-5 bg-primary rounded-full animate-ping opacity-25"></div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">Разовая отправка</span>
                </div>
                <Badge variant="outline" className="bg-background/50 border-primary/30 text-primary">
                  В процессе
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-foreground/80 font-medium">
                  {autoApplyProgress}
                </div>
                
                {/* Анимированный прогресс-бар */}
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
                  <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse transition-all duration-1000"></div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  <span>Мониторинг прогресса активен</span>
                </div>
              </div>
            </div>
          )}

          {/* Статус-бар прогресса автоотправки */}
          {agentStatus.state === 'running' && (
            <div className="bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-success animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">Прогресс за текущую сессию</span>
                </div>
                <div className="flex items-center gap-2">
                  {totalCategoryJobs > 0 && (
                    <Badge variant="secondary" className="text-primary bg-primary/10 border-primary/20 text-xs">
                      📊 {totalCategoryJobs} вакансий
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-success border-success/30 bg-background/50">
                    {stats.todaySent} / {settings.maxCVDaily} CV
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Progress 
                  value={(stats.todaySent / settings.maxCVDaily) * 100} 
                  className="h-2 bg-muted border border-border/50"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Отправлено: {stats.todaySent} CV</span>
                  <span>Цель: {settings.maxCVDaily} CV</span>
                </div>
              </div>

              {stats.todaySent >= settings.maxCVDaily && (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Цель достигнута! Ожидание следующего запуска через {settings.intervalHours < 1 ? `${settings.intervalHours * 60}мин` : `${settings.intervalHours}ч`}
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

