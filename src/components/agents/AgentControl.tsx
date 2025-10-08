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
  const { cvFile, isLoggedIn, setLoggedIn, sessionId, cvExistsOnSite, saveSessionId, saveCVExistsStatus } = useCV();
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

  useEffect(() => {
    checkServerStatus();
    setLocalSessionId(sessionId);
    setLocalCvExistsOnSite(cvExistsOnSite);
  }, [sessionId, cvExistsOnSite]);

  useEffect(() => {
    checkCVSync();
  }, [cvFile, isLoggedIn, cvExistsOnSite]);

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

  // Запуск автоматической отправки на вакансии
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

    if (!cvFile || !cvFile.aiAnalysis) {
      toast.error('Сначала загрузите и проанализируйте CV');
      return;
    }

    setIsAutoApplying(true);
    setAutoApplyProgress('Запуск автоотправки CV на IT вакансии...');

    try {
      toast.info('🤖 Запуск автоотправки CV на подходящие IT вакансии...');
      
      const result = await agentServerAPI.autoApplyToJobs(
        localSessionId,
        cvFile.aiAnalysis,
        { maxJobs: 10, minMatchScore: 70 }
      );

      if (result.success) {
        setAutoApplyProgress(`Завершено! Отправлено: ${result.appliedCount}/${result.total}`);
        toast.success(`✅ ${result.message}`);
        
        // Показываем детали
        if (result.results && result.results.length > 0) {
          const applied = result.results.filter((r: any) => r.status === 'applied');
          console.log('📊 Результаты автоотправки:', applied);
        }
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Auto-apply error:', error);
      toast.error(`❌ Ошибка автоотправки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setAutoApplyProgress('');
    } finally {
      setTimeout(() => {
        setIsAutoApplying(false);
        setAutoApplyProgress('');
      }, 3000);
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
                    onClick={() => {
                      resetStats(); // Сбрасываем старую статистику
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
                        resetStats(); // Сбрасываем статистику при остановке
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
                        resetStats(); // Сбрасываем статистику при остановке
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-700 flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4 animate-pulse text-blue-500" />
                {autoApplyProgress}
              </div>
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

