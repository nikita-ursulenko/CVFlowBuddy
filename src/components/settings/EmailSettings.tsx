import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/hooks/useSettings';
import { Mail, Server, Lock, User, Send } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Smartphone, Zap, MousePointerClick } from 'lucide-react';

export const EmailSettings: React.FC = () => {
  const { settings, updateSmtp, updateSettings } = useSettings();

  const handleSave = () => {
    toast.success('Настройки Email сохранены');
  };

  const handleTestEmail = async () => {
    const isManual = settings.emailMode === 'manual';
    
    // Подготовка тестовых данных
    const testData = {
      to: isManual ? 'test@example.com' : settings.smtp.auth.user,
      subject: '🚀 Тестовое письмо от CV Flow Buddy',
      body: `Привет!\n\nЭто тестовое сообщение от вашего помощника CV Flow Buddy.\n\nРежим: ${isManual ? 'Ручной (Mail.app)' : 'Автоматический (SMTP)'}\nСтатус: Проверка связи прошла успешно!`,
      mode: settings.emailMode,
      smtpConfig: settings.smtp
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
      loading: isManual ? 'Открываем Mail.app...' : 'Проверяем SMTP...',
      success: (data) => data.message || (isManual ? 'Mail.app открыт!' : 'SMTP работает!'),
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
              Выберите способ отправки писем компаниям
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
              Агент будет генерировать текст письма и открывать стандартное почтовое приложение Mac.
            </p>
          </div>
          <div className="inline-block px-4 py-2 bg-blue-100/50 rounded-full text-xs font-semibold text-blue-700 font-mono">
            РЕЖИМ ПО УМОЛЧАНИЮ: MANUAL
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-11 border-dashed hover:bg-primary/5 transition-colors"
            onClick={handleTestEmail}
          >
            <Send className="h-4 w-4 mr-2" />
            Проверить Mail.app
          </Button>
          <Button 
            className="flex-1 h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
            onClick={handleSave}
          >
            Сохранить изменения
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
