import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AISettings } from "@/components/ai/AISettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { Bot, Settings as SettingsIcon, User, Monitor, Mail } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Настройки</h1>
        <p className="text-sm md:text-base text-muted-foreground">Конфигурация агента, AI и системы</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="agent" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="agent" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Агент
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Система
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Пользователи
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="space-y-4">
          {/* Agent Settings */}
          <Card className="p-4 md:p-6">
        <div className="space-y-4 md:space-y-6">
          <div>
            <h3 className="text-base md:text-lg font-semibold">Настройки агента</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Управление поведением автоматического агента
            </p>
          </div>

          <Separator />

          <div className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule" className="text-sm md:text-base">Расписание запуска</Label>
              <Select defaultValue="daily">
                <SelectTrigger id="schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Каждый час</SelectItem>
                  <SelectItem value="daily">Ежедневно</SelectItem>
                  <SelectItem value="twice-daily">Два раза в день</SelectItem>
                  <SelectItem value="weekly">Еженедельно</SelectItem>
                  <SelectItem value="custom">Пользовательское (cron)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cron" className="text-sm md:text-base">Cron выражение</Label>
              <Input id="cron" placeholder="0 9 * * *" className="text-sm" />
              <p className="text-xs text-muted-foreground">
                Например: 0 9 * * * (каждый день в 9:00)
              </p>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 md:space-y-1">
                <Label className="text-sm md:text-base">Headless режим</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Запускать браузер в фоновом режиме без интерфейса
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 md:space-y-1">
                <Label className="text-sm md:text-base">Авто-скрытие вакансий</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Скрывать вакансии после успешной отправки CV
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </Card>

          {/* API Settings */}
          <Card className="p-4 md:p-6">
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="text-base md:text-lg font-semibold">API и Интеграции</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Управление ключами доступа и внешними сервисами
                </p>
              </div>

              <Separator />

              <div className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-token" className="text-sm md:text-base">Telegram Bot Token</Label>
                  <Input id="telegram-token" type="password" placeholder="1234567890:ABC..." className="text-sm" />
                  <p className="text-xs text-muted-foreground">
                    Для получения уведомлений о работе агента
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AISettings />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {/* System Settings */}
          <Card className="p-4 md:p-6">
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Системные настройки</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Общие настройки панели управления
                </p>
              </div>

              <Separator />

              <div className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-sm md:text-base">Тема интерфейса</Label>
                  <Select defaultValue="light">
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Светлая</SelectItem>
                      <SelectItem value="dark">Тёмная</SelectItem>
                      <SelectItem value="system">Системная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 md:space-y-1">
                    <Label className="text-sm md:text-base">Звуковые уведомления</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Воспроизводить звук при важных событиях
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 md:space-y-1">
                    <Label className="text-sm md:text-base">Email уведомления</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Отправлять отчёты о работе агента на почту
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3">
            <Button variant="outline" className="w-full sm:w-auto" size="sm">Отмена</Button>
            <Button className="w-full sm:w-auto" size="sm">Сохранить изменения</Button>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {/* User Management */}
          <Card className="p-4 md:p-6">
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Пользователи и доступ</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Управление пользователями и правами доступа
                </p>
              </div>

              <Separator />

              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border p-3 md:p-4">
                  <div className="space-y-0.5 md:space-y-1">
                    <p className="font-medium text-sm md:text-base">Администратор</p>
                    <p className="text-xs md:text-sm text-muted-foreground">admin@example.com</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Изменить
                  </Button>
                </div>

                <Button variant="outline" className="w-full" size="sm">
                  Добавить пользователя
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <EmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
