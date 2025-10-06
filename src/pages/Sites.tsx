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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const getStatusBadge = (status: string) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  return (
    <Badge variant={config.variant} className="text-xs">
      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${config.color}`} />
      {config.label}
    </Badge>
  );
};

export default function Sites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);

  const filteredSites = sitesData.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         site.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Сайты</h1>
          <p className="text-sm md:text-base text-muted-foreground">Управление источниками вакансий</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full md:w-auto" size="sm">
              <Plus className="h-4 w-4" />
              Добавить сайт
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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

      {/* Filters */}
      <div className="flex flex-col gap-2 md:flex-row md:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="paused">На паузе</SelectItem>
            <SelectItem value="error">Ошибка</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sites - Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {filteredSites.map((site) => (
          <Card key={site.id}>
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-3 w-3 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm truncate">{site.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground break-all">{site.url}</p>
                </div>
                {getStatusBadge(site.status)}
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Логин:</span>
                  <span className="text-foreground truncate ml-2">{site.login}</span>
                </div>
                <div className="flex justify-between">
                  <span>Частота:</span>
                  <span className="text-foreground">{site.frequency}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                  <Edit className="h-3 w-3 mr-1" />
                  Редакт.
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8 text-destructive">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Удалить
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Sites Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
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
              {filteredSites.map((site) => {
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
