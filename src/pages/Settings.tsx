import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Настройки</h1>
        <p className="text-sm md:text-base text-muted-foreground">Конфигурация агента и системы</p>
      </div>

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
              <Label htmlFor="openai-key" className="text-sm md:text-base">OpenAI API Key</Label>
              <Input id="openai-key" type="password" placeholder="sk-..." className="text-sm" />
            </div>

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
    </div>
  );
}
