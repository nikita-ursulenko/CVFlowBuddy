// Компонент настроек AI

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bot, 
  Key, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Activity,
  Trash2,
  RefreshCw,
  Zap,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { AIConfig, AISettings as AISettingsType, AIProvider } from '../../types/ai';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';

interface AISettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    isLoading, 
    error, 
    isAvailable, 
    updateConfig, 
    testConnection
  } = useAI();

  const [config, setConfig] = useState<AIConfig>({
    provider: 'groq',
    apiKey: '',
    apiKeys: {},
    model: 'llama-3.3-70b-versatile',
    maxTokens: 2000,
    temperature: 0.7,
    enabledFeatures: {
      jobAnalysis: true,
      coverLetterGeneration: true,
      cvOptimization: true,
      jobFiltering: true
    },
    costLimits: {
      dailyLimit: 5.0,
      monthlyLimit: 50.0,
      perRequestLimit: 1.0
    }
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [groqStatus, setGroqStatus] = useState<any>(null);
  const [isRefreshingLimits, setIsRefreshingLimits] = useState(false);

  const fetchGroqStatus = async () => {
    try {
      const res = await fetch("http://localhost:5050/api/agent/groq-status");
      const data = await res.json();
      if (data.success) setGroqStatus(data);
    } catch (e) {
      console.error("Failed to fetch groq status:", e);
    }
  };

  const refreshAIStatus = async () => {
    try {
      if (!config.apiKey) {
        toast.error("Сначала введите API ключ");
        return;
      }
      setIsRefreshingLimits(true);
      
      const endpoint = config.provider === 'gemini' 
        ? "http://localhost:5050/api/agent/gemini/test"
        : "http://localhost:5050/api/agent/groq-status/refresh";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: config.apiKey, 
          model: config.model,
          provider: config.provider 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        if (config.provider === 'groq') {
          setGroqStatus(data);
          toast.success("Лимиты Groq обновлены");
        } else {
          toast.success("Соединение с Gemini проверено успешно!");
        }
      } else if (data.error && config.provider === 'groq') {
        // Обработка ошибки лимита из Groq
        setGroqStatus({
          error: data.error.message,
          type: data.error.type,
          code: data.error.code,
          updatedAt: new Date().toISOString()
        });
        toast.error("Лимит Groq превышен");
      } else {
        toast.error(data.message || "Ошибка обновления лимитов");
      }
    } catch (e) {
      console.error("Failed to refresh groq status:", e);
      toast.error("Не удалось подключиться к серверу");
    } finally {
      setIsRefreshingLimits(false);
    }
  };

  // Принудительная установка модели при смене провайдера или загрузке
  useEffect(() => {
    if (config.provider === 'groq' && config.model !== 'llama-3.3-70b-versatile') {
      setConfig(prev => ({ ...prev, model: 'llama-3.3-70b-versatile' }));
    }
  }, [config.provider, config.model]);

  useEffect(() => {
    fetchGroqStatus();
  }, []);

  // Загружаем настройки при инициализации
  useEffect(() => {
    if (settings) {
      const savedConfig = settings.config as AIConfig;
      // Миграция: если apiKeys нет, создаем его на основе текущего провайдера и ключа
      const apiKeys = savedConfig.apiKeys || (savedConfig.apiKey ? { [savedConfig.provider]: savedConfig.apiKey } : {});
      
      setConfig({
        ...savedConfig,
        apiKeys
      });
    }
  }, [settings]);

  const handleSave = () => {
    try {
      updateConfig(config);
      toast.success('Настройки AI сохранены');
      if (onClose) onClose();
    } catch (error) {
      toast.error('Ошибка сохранения настроек');
    }
  };

  const handleTest = async () => {
    try {
      // Сохраняем настройки
      updateConfig(config);
      
      const res = await testConnection();
      setTestResult(res);
      
      if (res) {
        toast.success('Подключение к AI успешно!');
      } else {
        toast.error('Не удалось подключиться к AI');
      }
    } catch (error) {
      setTestResult(false);
      toast.error('Ошибка тестирования подключения');
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setTestResult(null);
  };

  const usageStats = settings?.usage ? {
    totalCost: settings.usage.totalCost.toFixed(4),
    totalRequests: settings.usage.totalRequests,
    todayCost: "0.0000",
    todayRequests: 0
  } : null;

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Настройки AI</CardTitle>
              <CardDescription>
                Настройте интеграцию с ChatGPT API для автоматизации процессов
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isAvailable ? "default" : "secondary"}>
              {isAvailable ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Активно
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Неактивно
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ошибки */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Основные настройки */}
        {/* Основные настройки */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Settings className="h-6 w-6 text-primary" />
              Параметры провайдера
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 p-5 bg-muted/30 rounded-2xl border border-border/50">
              <Label htmlFor="provider" className="text-sm font-semibold">Провайдер AI</Label>
              <Select 
                value={config.provider} 
                onValueChange={(value: AIProvider) => {
                  const storedKey = config.apiKeys?.[value] || '';
                  setConfig(prev => ({
                    ...prev, 
                    provider: value,
                    apiKey: storedKey,
                    model: value === 'groq' ? 'llama-3.3-70b-versatile' : 
                           value === 'gemini' ? 'gemini-3-flash-preview' : 'gpt-4-turbo'
                  }));
                }}
              >
                <SelectTrigger className="h-12 bg-background border-border/60 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Выберите провайдера" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="groq">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      Groq (Быстрый и бесплатный)
                    </div>
                  </SelectItem>
                  <SelectItem value="openai">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-blue-500" />
                      OpenAI (Платный)
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-orange-500" />
                      Google Gemini (Бесплатно/Платный)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground italic px-1">
                {config.provider === 'groq' 
                  ? 'Groq Cloud - лучший выбор для скорости'
                  : 'OpenAI - эталон качества GPT-4'
                }
              </p>
            </div>

            <div className="space-y-3 p-5 bg-muted/30 rounded-2xl border border-border/50">
              <Label htmlFor="model" className="text-sm font-semibold">Модель</Label>
              <Select 
                value={config.model} 
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger className="h-12 bg-background border-border/60 hover:border-primary/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.provider === 'groq' ? (
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Актуальная)</SelectItem>
                  ) : config.provider === 'gemini' ? (
                    <>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash (Preview)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground italic px-1">
                {config.provider === 'groq' 
                  ? 'Llama 3.3 70B - одна из мощнейших открытых моделей'
                  : config.provider === 'gemini'
                  ? 'Gemini 3 Flash - флагманская скоростная модель 2026 года'
                  : 'GPT-4 Turbo - максимальная точность'
                }
              </p>
            </div>
          </div>

          <div className="space-y-3 p-5 bg-muted/30 rounded-2xl border border-border/50">
            <Label htmlFor="apiKey" className="flex items-center gap-2 text-sm font-semibold">
              <Key className="h-4 w-4 text-primary" />
              {config.provider === 'groq' ? 'Groq API Key' : 
               config.provider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}
            </Label>
            <div className="relative group">
              <Input
                id="apiKey"
                type="password"
                placeholder={config.provider === 'groq' ? 'gsk_...' : 
                             config.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                value={config.apiKey}
                onChange={(e) => {
                  const newKey = e.target.value;
                  setConfig(prev => ({ 
                    ...prev, 
                    apiKey: newKey,
                    apiKeys: {
                      ...(prev.apiKeys || {}),
                      [prev.provider]: newKey
                    }
                  }));
                }}
                className="font-mono text-sm h-12 bg-background border-border/60 group-hover:border-primary/50 transition-colors pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-hover:text-primary/40 transition-colors">
                <Key className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">Держите ключ в секрете</span>
              {config.provider === 'groq' ? (
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline flex items-center gap-1">
                   API Console <ExternalLink className="h-3 w-3" />
                </a>
              ) : config.provider === 'gemini' ? (
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline flex items-center gap-1">
                   AI Studio <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline flex items-center gap-1">
                   Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 p-5 bg-muted/30 rounded-2xl border border-border/50">
              <Label htmlFor="maxTokens" className="text-sm font-semibold">Максимум токенов</Label>
              <Input
                id="maxTokens"
                type="number"
                min="100"
                max="4000"
                value={config.maxTokens}
                onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                className="h-12 bg-background border-border/60"
              />
            </div>

            <div className="space-y-3 p-5 bg-muted/30 rounded-2xl border border-border/50">
              <Label htmlFor="temperature" className="text-sm font-semibold">Температура (Креативность)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="h-12 w-24 bg-background border-border/60"
                />
                <div className="flex-1 text-xs text-muted-foreground italic">
                  {config.temperature >= 0.7 ? "Высокая: подходит для писем и креатива" : "Низкая: для точного анализа и кода"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика использования */}
        {usageStats && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Статистика использования
              </h3>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative group overflow-hidden bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-2xl border border-blue-200/50 dark:border-blue-500/20 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="relative">
                    <div className="text-2xl font-bold text-blue-600">
                      ${usageStats.totalCost}
                    </div>
                    <div className="text-[11px] font-semibold text-blue-500/80 uppercase tracking-wider">Общая стоимость</div>
                  </div>
                </div>

                <div className="relative group overflow-hidden bg-green-50/50 dark:bg-green-500/5 p-5 rounded-2xl border border-green-200/50 dark:border-green-500/20 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                    <Bot className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="relative">
                    <div className="text-2xl font-bold text-green-600">
                      {usageStats.totalRequests}
                    </div>
                    <div className="text-[11px] font-semibold text-green-500/80 uppercase tracking-wider">Всего запросов</div>
                  </div>
                </div>

                <div className="relative group overflow-hidden bg-orange-50/50 dark:bg-orange-500/5 p-5 rounded-2xl border border-orange-200/50 dark:border-orange-500/20 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                    <Activity className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="relative">
                    <div className="text-2xl font-bold text-orange-600">
                      ${usageStats.todayCost}
                    </div>
                    <div className="text-[11px] font-semibold text-orange-500/80 uppercase tracking-wider">Затраты сегодня</div>
                  </div>
                </div>

                <div className="relative group overflow-hidden bg-purple-50/50 dark:bg-purple-500/5 p-5 rounded-2xl border border-purple-200/50 dark:border-purple-500/20 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                    <RefreshCw className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="relative">
                    <div className="text-2xl font-bold text-purple-600">
                      {usageStats.todayRequests}
                    </div>
                    <div className="text-[11px] font-semibold text-purple-500/80 uppercase tracking-wider">Запросов сегодня</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Groq Limits */}
        {config.provider === 'groq' && (
          <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {(config.provider as string) === 'gemini' ? 'Статус Google Gemini' : 
                 (config.provider as string) === 'groq' ? 'Лимиты Groq API' : 'Лимиты AI API'}
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-2" 
                onClick={refreshAIStatus}
                disabled={isRefreshingLimits || !config.apiKey}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshingLimits ? 'animate-spin' : ''}`} />
                {(config.provider as string) === 'gemini' ? 'Проверить соединение' : 'Проверить лимиты'}
              </Button>
            </div>
            
            {groqStatus ? (
              <div className="space-y-4">
                {groqStatus.error ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive space-y-1">
                    <p className="font-bold">Ошибка: {groqStatus.code}</p>
                    <p className="opacity-90">{groqStatus.error}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase">Токены</div>
                      <div className="text-sm font-bold">{groqStatus.remainingTokens || '???'} / {groqStatus.limitTokens || '???'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase">Запросы</div>
                      <div className="text-sm font-bold">{groqStatus.remainingRequests || '???'} / {groqStatus.limitRequests || '???'}</div>
                    </div>
                  </div>
                )}
                
                {groqStatus.pausedUntil && Date.now() < groqStatus.pausedUntil && (
                  <div className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">
                    ⚠️ API на паузе до {new Date(groqStatus.pausedUntil).toLocaleTimeString()}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground text-right border-t border-primary/10 pt-2">
                  Обновлено: {groqStatus.updatedAt ? new Date(groqStatus.updatedAt).toLocaleTimeString() : 'Никогда'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic text-center py-2">
                Лимиты пока не проверены. Нажмите кнопку выше для запроса данных.
              </div>
            )}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleTest}
            disabled={!config.apiKey || isTesting || isLoading}
            variant="outline"
            className="flex-1"
          >
            {isTesting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Тестирование...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Тест подключения
              </>
            )}
          </Button>

          <Button 
            onClick={handleSave}
            disabled={isLoading || isTesting}
            className="flex-1"
          >
            Сохранить настройки
          </Button>

          <Button 
            onClick={handleReset}
            disabled={isLoading || isTesting}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
        </div>

        {/* Результат тестирования */}
        {testResult !== null && (
          <Alert variant={testResult ? "default" : "destructive"}>
            {testResult ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Подключение к AI успешно! Все функции доступны.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Не удалось подключиться к AI. Проверьте API ключ и интернет соединение.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
