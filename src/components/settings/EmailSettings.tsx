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
        {/* Выбор режима */}
        <div className="p-1 bg-muted/50 rounded-xl border border-border/50">
          <RadioGroup 
            value={settings.emailMode} 
            onValueChange={(val) => updateSettings({ emailMode: val as 'auto' | 'manual' })}
            className="grid grid-cols-2 gap-1"
          >
            <div>
              <RadioGroupItem value="auto" id="mode-auto" className="peer sr-only" />
              <Label
                htmlFor="mode-auto"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-transparent bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
              >
                <Zap className="mb-2 h-6 w-6 text-yellow-500" />
                <span className="text-sm font-bold">Автоматически</span>
                <span className="text-[10px] text-muted-foreground mt-1">Через SMTP (в фоне)</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="manual" id="mode-manual" className="peer sr-only" />
              <Label
                htmlFor="mode-manual"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-transparent bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
              >
                <MousePointerClick className="mb-2 h-6 w-6 text-blue-500" />
                <span className="text-sm font-bold">Ручной режим</span>
                <span className="text-[10px] text-muted-foreground mt-1">Через Mail.app на Mac</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {settings.emailMode === 'auto' ? (
          <div className="grid gap-6 md:grid-cols-2 p-6 rounded-2xl bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Server className="h-4 w-4" />
                Параметры Сервера
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Хост</Label>
                <Input 
                  id="smtp-host" 
                  placeholder="smtp.gmail.com" 
                  className="bg-background"
                  value={settings.smtp.host}
                  onChange={(e) => updateSmtp({ host: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port">Порт</Label>
                <Input 
                  id="smtp-port" 
                  type="number" 
                  placeholder="465" 
                  className="bg-background"
                  value={settings.smtp.port}
                  onChange={(e) => updateSmtp({ port: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <User className="h-4 w-4" />
                Авторизация
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-user">Ваш Email</Label>
                <Input 
                  id="smtp-user" 
                  type="email" 
                  placeholder="your-email@gmail.com" 
                  className="bg-background"
                  value={settings.smtp.auth.user}
                  onChange={(e) => updateSmtp({ auth: { ...settings.smtp.auth, user: e.target.value } })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-pass" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Пароль Приложения
                </Label>
                <Input 
                  id="smtp-pass" 
                  type="password" 
                  placeholder="••••••••••••••••" 
                  className="bg-background"
                  value={settings.smtp.auth.pass}
                  onChange={(e) => updateSmtp({ auth: { ...settings.smtp.auth, pass: e.target.value } })}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="sender-name">Имя в письме (От кого)</Label>
              <Input 
                id="sender-name" 
                placeholder="Иван Иванов" 
                className="bg-background"
                value={settings.smtp.name}
                onChange={(e) => updateSmtp({ name: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground italic bg-primary/5 p-2 rounded-lg border border-primary/10">
                💡 <strong>Совет для Gmail:</strong> Обычный пароль от почты не подойдет. Вам нужно включить 2FA и создать 
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">
                  "Пароль приложения"
                </a> в настройках Google.
              </p>
            </div>
          </div>
        ) : (
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
            <div className="inline-block px-4 py-2 bg-blue-100/50 rounded-full text-xs font-semibold text-blue-700">
              SMTP настройки не требуются
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-11 border-dashed hover:bg-primary/5 transition-colors"
            onClick={handleTestEmail}
          >
            <Send className="h-4 w-4 mr-2" />
            {settings.emailMode === 'manual' ? 'Проверить Mail.app' : 'Проверить SMTP'}
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
