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
  DollarSign,
  Activity,
  Trash2,
  RefreshCw,
  Zap
} from 'lucide-react';
import { AIConfig, AISettings, AIProvider } from '@/types/ai';
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
    testConnection,
    agent 
  } = useAI();

  const [config, setConfig] = useState<AIConfig>({
    provider: 'groq',
    apiKey: '',
    model: 'llama-3.1-8b-instant',
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

  // Загружаем настройки при инициализации
  useEffect(() => {
    if (settings) {
      setConfig(settings.config);
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
    if (!config.apiKey) {
      toast.error('Введите API ключ для тестирования');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Создаем временный агент для тестирования
      const tempConfig = { ...config };
      updateConfig(tempConfig);
      
      // Ждем немного для инициализации
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await testConnection();
      setTestResult(result);
      
      if (result) {
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
    setConfig({
      apiKey: '',
      model: 'gpt-3.5-turbo',
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
    setTestResult(null);
  };

  const getUsageStats = () => {
    if (!agent) return null;
    const usage = agent.getUsageStats();
    const totalCost = usage.reduce((sum, req) => sum + req.cost, 0);
    const totalRequests = usage.length;
    const todayUsage = usage.filter(req => 
      new Date(req.timestamp).toDateString() === new Date().toDateString()
    );
    const todayCost = todayUsage.reduce((sum, req) => sum + req.cost, 0);

    return {
      totalCost: totalCost.toFixed(4),
      totalRequests,
      todayCost: todayCost.toFixed(4),
      todayRequests: todayUsage.length
    };
  };

  const usageStats = getUsageStats();

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
                    model: value === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-3.5-turbo'
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
                      <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B Instant</SelectItem>
                      <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</SelectItem>
                      <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                      <SelectItem value="gemma2-9b-it">Gemma2 9B IT</SelectItem>
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
                  ? 'Llama 3.1 8B Instant - быстрая и эффективная модель'
                  : 'GPT-4 дороже, но качественнее'
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

        <Separator />

        {/* Включенные функции */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Включенные функции</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Анализ вакансий</Label>
                <p className="text-sm text-muted-foreground">
                  Автоматический анализ требований и соответствия
                </p>
              </div>
              <Switch
                checked={config.enabledFeatures.jobAnalysis}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    enabledFeatures: { ...prev.enabledFeatures, jobAnalysis: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Генерация писем</Label>
                <p className="text-sm text-muted-foreground">
                  Создание сопроводительных писем
                </p>
              </div>
              <Switch
                checked={config.enabledFeatures.coverLetterGeneration}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    enabledFeatures: { ...prev.enabledFeatures, coverLetterGeneration: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Оптимизация CV</Label>
                <p className="text-sm text-muted-foreground">
                  Анализ и улучшение резюме
                </p>
              </div>
              <Switch
                checked={config.enabledFeatures.cvOptimization}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    enabledFeatures: { ...prev.enabledFeatures, cvOptimization: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Фильтрация вакансий</Label>
                <p className="text-sm text-muted-foreground">
                  Отбор релевантных вакансий
                </p>
              </div>
              <Switch
                checked={config.enabledFeatures.jobFiltering}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({
                    ...prev,
                    enabledFeatures: { ...prev.enabledFeatures, jobFiltering: checked }
                  }))
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Лимиты стоимости */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Лимиты стоимости
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Дневной лимит ($)</Label>
              <Input
                id="dailyLimit"
                type="number"
                min="0"
                step="0.1"
                value={config.costLimits.dailyLimit}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  costLimits: { ...prev.costLimits, dailyLimit: parseFloat(e.target.value) }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Месячный лимит ($)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                min="0"
                step="1"
                value={config.costLimits.monthlyLimit}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  costLimits: { ...prev.costLimits, monthlyLimit: parseFloat(e.target.value) }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perRequestLimit">Лимит за запрос ($)</Label>
              <Input
                id="perRequestLimit"
                type="number"
                min="0"
                step="0.1"
                value={config.costLimits.perRequestLimit}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  costLimits: { ...prev.costLimits, perRequestLimit: parseFloat(e.target.value) }
                }))}
              />
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
