import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Send, Smartphone, Sparkles, Link as LinkIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAgentState } from '@/hooks/useAgentState';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const EmailSettings: React.FC = () => {
  const { settings, updateSettings, fetchSettingsFromServer } = useAgentState();
  const [localSettings, setLocalSettings] = React.useState({
    emailPrompt: settings.emailPrompt || "",
    portfolioLink: settings.portfolioLink || ""
  });

  // Загружаем настройки с сервера при монтировании
  React.useEffect(() => {
    fetchSettingsFromServer();
  }, [fetchSettingsFromServer]);

  // Обновляем локальное состояние при изменении глобальных настроек
  React.useEffect(() => {
    setLocalSettings({
      emailPrompt: settings.emailPrompt || "",
      portfolioLink: settings.portfolioLink || ""
    });
  }, [settings.emailPrompt, settings.portfolioLink]);

  const handleSaveAIContent = async () => {
    try {
      await updateSettings(localSettings);
      toast.success("Настройки генерации обновлены");
    } catch (error) {
      toast.error("Ошибка при сохранении");
    }
  };

  const handleTestEmail = async () => {
    const testData = {
      to: 'test@example.com',
      subject: '🚀 Тестовое письмо от CV Flow Buddy',
      body: 'Привет!\n\nЭто тестовое сообщение от вашего помощника CV Flow Buddy.\n\nРежим: Ручной (Mail.app)\nСтатус: Проверка связи прошла успешно!',
    };

    const promise = async () => {
      const baseUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
      const response = await fetch(`${baseUrl}/api/agent/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (!response.ok) {
        throw new Error('Ошибка сервера');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Ошибка при тесте');
      }
      return data;
    };

    toast.promise(promise(), {
      loading: 'Открываем Mail.app...',
      success: 'Mail.app открыт!',
      error: (err) => `Ошибка: ${err.message}`,
    });
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl">Email Автоматизация</CardTitle>
            <CardDescription>
              Способ отправки писем компаниям
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 space-y-6">
        {/* Информация о режиме */}
        <div className="p-8 rounded-2xl bg-blue-50/50 border border-blue-200/50 text-center space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Smartphone className="h-8 w-8" />
          </div>
          <div className="max-w-xs mx-auto">
            <h4 className="font-bold text-lg">Ручной режим (MacOS)</h4>
            <p className="text-sm text-muted-foreground">
              Агент будет генерировать текст письма и автоматически открывать стандартное почтовое приложение Mac (Mail.app) для отправки.
            </p>
          </div>
          <div className="inline-block px-4 py-2 bg-blue-100/50 rounded-full text-xs font-semibold text-blue-700 font-mono">
            АКТИВНЫЙ РЕЖИМ: MANUAL (MAIL.APP)
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            className="w-full h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 border-0 transition-all duration-300"
            onClick={handleTestEmail}
          >
            <Send className="h-4 w-4 mr-2" />
            Проверить соединение с Mail.app
          </Button>
        </div>

        <div className="pt-6 border-t border-border/50 space-y-6">
          <div className="space-y-1">
            <h4 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Настройки генерации писем
            </h4>
            <p className="text-sm text-muted-foreground">
              Укажите инструкцию (промпт) для ИИ и ссылку на ваше портфолио
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                AI Промпт (Инструкция)
              </Label>
              <Textarea 
                value={localSettings.emailPrompt}
                onChange={(e) => setLocalSettings({...localSettings, emailPrompt: e.target.value})}
                placeholder="Инструкция для нейросети..."
                className="min-h-[300px] font-mono text-xs leading-relaxed bg-muted/20"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['companyName', 'titles', 'name', 'position', 'skills', 'experience', 'shortJobDesc'].map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] py-0 h-5 px-1.5 cursor-help" title={`Будет заменено на ${tag}`}>
                    {'{'}{tag}{'}'}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-4 w-4" />
                Ссылка на портфолио
              </Label>
              <Input 
                value={localSettings.portfolioLink}
                onChange={(e) => setLocalSettings({...localSettings, portfolioLink: e.target.value})}
                placeholder="https://nikita-ursulenko.github.io/"
                className="bg-muted/20"
              />
            </div>

            <Button onClick={handleSaveAIContent} className="w-full sm:w-auto gap-2">
              <Save className="h-4 w-4" />
              Сохранить настройки контента
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
