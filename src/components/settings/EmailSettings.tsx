import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export const EmailSettings: React.FC = () => {
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
            variant="outline" 
            className="w-full h-11 border-dashed hover:bg-primary/5 transition-colors"
            onClick={handleTestEmail}
          >
            <Send className="h-4 w-4 mr-2" />
            Проверить соединение с Mail.app
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
