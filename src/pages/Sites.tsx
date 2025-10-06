import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Search, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const sitesData = [
  { id: 1, name: "HeadHunter", url: "hh.ru", login: "user@email.com", frequency: "Ежедневно", status: "active" },
  { id: 2, name: "Habr Career", url: "habr.com", login: "user@email.com", frequency: "Ежедневно", status: "active" },
  { id: 3, name: "SuperJob", url: "superjob.ru", login: "user@email.com", frequency: "Раз в 2 дня", status: "paused" },
  { id: 4, name: "Зарплата.ру", url: "zarplata.ru", login: "user@email.com", frequency: "Ежедневно", status: "error" },
];

const statusConfig = {
  active: { label: "Активен", color: "bg-success", variant: "default" as const },
  paused: { label: "Пауза", color: "bg-warning", variant: "secondary" as const },
  error: { label: "Ошибка", color: "bg-destructive", variant: "destructive" as const },
};

export default function Sites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Сайты</h1>
          <p className="text-muted-foreground">Управление источниками вакансий</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить сайт
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Добавить новый сайт</DialogTitle>
              <DialogDescription>
                Настройте параметры для нового источника вакансий
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Название сайта</Label>
                <Input id="name" placeholder="HeadHunter" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" placeholder="hh.ru" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login">Логин</Label>
                <Input id="login" type="email" placeholder="user@email.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="frequency">Частота проверки</Label>
                <Input id="frequency" placeholder="Ежедневно" />
              </div>
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Label className="text-base">Настройки действий</Label>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-apply" className="text-sm font-normal">
                    Автоматическая отправка CV
                  </Label>
                  <Switch id="auto-apply" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-hide" className="text-sm font-normal">
                    Скрывать после отправки
                  </Label>
                  <Switch id="auto-hide" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-ai" className="text-sm font-normal">
                    Использовать AI для письма
                  </Label>
                  <Switch id="use-ai" defaultChecked />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Отмена
              </Button>
              <Button onClick={() => setOpen(false)} className="flex-1">
                Сохранить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск сайтов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Sites Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-left text-sm">
                <th className="p-4 font-medium">Название</th>
                <th className="p-4 font-medium">URL</th>
                <th className="p-4 font-medium">Логин</th>
                <th className="p-4 font-medium">Частота</th>
                <th className="p-4 font-medium">Статус</th>
                <th className="p-4 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sitesData.map((site) => {
                const status = statusConfig[site.status as keyof typeof statusConfig];
                return (
                  <tr
                    key={site.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{site.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{site.url}</td>
                    <td className="p-4 text-muted-foreground">{site.login}</td>
                    <td className="p-4 text-muted-foreground">{site.frequency}</td>
                    <td className="p-4">
                      <Badge variant={status.variant}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.color}`} />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
