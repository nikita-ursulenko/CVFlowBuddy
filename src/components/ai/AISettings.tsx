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
  Zap
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

  const refreshGroqStatus = async () => {
    try {
      if (!config.apiKey) {
        toast.error("Сначала введите API ключ");
        return;
      }
      setIsRefreshingLimits(true);
      const res = await fetch("http://localhost:5050/api/agent/groq-status/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, model: config.model })
      });
      const data = await res.json();
      if (data.success) {
        setGroqStatus(data);
        toast.success("Лимиты Groq обновлены");
      } else if (data.error) {
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
      setConfig(settings.config as AIConfig);
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
    <Card className="w-full max-w-4xl mx-auto">
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Основные настройки
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                {config.provider === 'groq' ? 'Groq API Key' : 'OpenAI API Key'}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={config.provider === 'groq' ? 'gsk_...' : 'sk-...'}
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Получите API ключ на{' '}
                <a 
                  href={config.provider === 'groq' 
                    ? 'https://console.groq.com/keys' 
                    : 'https://platform.openai.com/api-keys'
                  } 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {config.provider === 'groq' ? 'console.groq.com' : 'platform.openai.com'}
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Провайдер AI</Label>
              <Select 
                value={config.provider} 
                onValueChange={(value: AIProvider) => {
                  setConfig(prev => ({
                    ...prev, 
                    provider: value,
                    model: value === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4-turbo'
                  }));
                }}
              >
                <SelectTrigger>
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
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {config.provider === 'groq' 
                  ? 'Groq - быстрый и бесплатный AI с лимитами'
                  : 'OpenAI - качественный, но платный сервис'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Модель</Label>
              <Select 
                value={config.model} 
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.provider === 'groq' ? (
                    <>
                      <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Актуальная)</SelectItem>
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
              <p className="text-xs text-muted-foreground">
                {config.provider === 'groq' 
                  ? 'Llama 3.3 70B Versatile - единственная актуальная модель'
                  : 'GPT-4 Turbo дороже, но качественнее'
                }
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Максимум токенов</Label>
              <Input
                id="maxTokens"
                type="number"
                min="100"
                max="4000"
                value={config.maxTokens}
                onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Температура (0-1)</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                Выше = более креативно, ниже = более точно
              </p>
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
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    ${usageStats.totalCost}
                  </div>
                  <div className="text-sm text-muted-foreground">Общая стоимость</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {usageStats.totalRequests}
                  </div>
                  <div className="text-sm text-muted-foreground">Всего запросов</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    ${usageStats.todayCost}
                  </div>
                  <div className="text-sm text-muted-foreground">Сегодня</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {usageStats.todayRequests}
                  </div>
                  <div className="text-sm text-muted-foreground">Запросов сегодня</div>
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
                Лимиты Groq API
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-2" 
                onClick={refreshGroqStatus}
                disabled={isRefreshingLimits || !config.apiKey}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshingLimits ? 'animate-spin' : ''}`} />
                Проверить лимиты
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
