import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const logsData = [
  { id: 1, vacancy: "Senior React Developer", site: "hh.ru", status: "success", date: "15.01.2025 14:32", message: "CV успешно отправлено с AI письмом" },
  { id: 2, vacancy: "Frontend Engineer", site: "habr.com", status: "success", date: "15.01.2025 14:28", message: "Вакансия обработана, CV отправлено" },
  { id: 3, vacancy: "Full Stack Developer", site: "superjob.ru", status: "error", date: "15.01.2025 14:15", message: "Ошибка авторизации на сайте" },
  { id: 4, vacancy: "TypeScript Developer", site: "hh.ru", status: "success", date: "15.01.2025 14:12", message: "CV успешно отправлено" },
  { id: 5, vacancy: "React Native Developer", site: "zarplata.ru", status: "pending", date: "15.01.2025 14:05", message: "Обработка вакансии..." },
  { id: 6, vacancy: "Backend Developer", site: "hh.ru", status: "skipped", date: "15.01.2025 13:58", message: "Вакансия не соответствует критериям" },
  { id: 7, vacancy: "DevOps Engineer", site: "habr.com", status: "success", date: "15.01.2025 13:45", message: "CV отправлено с персонализированным письмом" },
  { id: 8, vacancy: "Data Engineer", site: "superjob.ru", status: "error", date: "15.01.2025 13:30", message: "Таймаут при загрузке страницы" },
];

const statusConfig = {
  success: { label: "Успешно", variant: "default" as const, color: "bg-success" },
  error: { label: "Ошибка", variant: "destructive" as const, color: "bg-destructive" },
  pending: { label: "В процессе", variant: "secondary" as const, color: "bg-warning" },
  skipped: { label: "Пропущено", variant: "outline" as const, color: "bg-muted-foreground" },
};

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Логи и История</h1>
          <p className="text-muted-foreground">Журнал всех действий агента</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Экспорт CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по вакансии или сайту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="success">Успешно</SelectItem>
              <SelectItem value="error">Ошибка</SelectItem>
              <SelectItem value="pending">В процессе</SelectItem>
              <SelectItem value="skipped">Пропущено</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-left text-sm">
                <th className="p-4 font-medium">Вакансия</th>
                <th className="p-4 font-medium">Сайт</th>
                <th className="p-4 font-medium">Статус</th>
                <th className="p-4 font-medium">Дата/Время</th>
                <th className="p-4 font-medium">Сообщение</th>
              </tr>
            </thead>
            <tbody>
              {logsData.map((log) => {
                const status = statusConfig[log.status as keyof typeof statusConfig];
                return (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="p-4 font-medium">{log.vacancy}</td>
                    <td className="p-4 text-muted-foreground">{log.site}</td>
                    <td className="p-4">
                      <Badge variant={status.variant}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.color}`} />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{log.date}</td>
                    <td className="p-4 text-sm text-muted-foreground">{log.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Показано 8 из 243 записей</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Назад
          </Button>
          <Button variant="outline" size="sm">
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}
