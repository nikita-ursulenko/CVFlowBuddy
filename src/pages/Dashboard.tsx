import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, FileText, AlertCircle, Briefcase, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const kpiData = [
  {
    title: "Отправлено CV",
    value: "47",
    change: "+12%",
    trend: "up",
    icon: FileText,
    gradient: "from-primary to-accent",
  },
  {
    title: "Ошибок",
    value: "3",
    change: "-25%",
    trend: "down",
    icon: AlertCircle,
    gradient: "from-destructive to-orange-500",
  },
  {
    title: "Новых вакансий",
    value: "128",
    change: "+8%",
    trend: "up",
    icon: Briefcase,
    gradient: "from-warning to-yellow-500",
  },
  {
    title: "Всего обработано",
    value: "1,243",
    change: "+156",
    trend: "up",
    icon: CheckCircle2,
    gradient: "from-success to-green-500",
  },
];

const recentActivity = [
  { vacancy: "Senior React Developer", site: "hh.ru", status: "success", date: "2 мин назад" },
  { vacancy: "Frontend Engineer", site: "habr.com", status: "success", date: "5 мин назад" },
  { vacancy: "Full Stack Developer", site: "superjob.ru", status: "error", date: "12 мин назад" },
  { vacancy: "TypeScript Developer", site: "hh.ru", status: "success", date: "15 мин назад" },
  { vacancy: "React Native Developer", site: "zarplata.ru", status: "pending", date: "18 мин назад" },
];

const statusConfig = {
  success: { label: "Успешно", color: "bg-success", textColor: "text-success" },
  error: { label: "Ошибка", color: "bg-destructive", textColor: "text-destructive" },
  pending: { label: "В процессе", color: "bg-warning", textColor: "text-warning" },
};

const getStatusBadge = (status: string) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  return (
    <Badge variant="outline" className={`${config.textColor} border-current text-xs`}>
      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${config.color}`} />
      {config.label}
    </Badge>
  );
};

export default function Dashboard() {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card
            key={kpi.title}
            className="relative overflow-hidden p-3 md:p-6 transition-all hover:shadow-lg hover:scale-[1.02]"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-5`} />
            <div className="relative space-y-1 md:space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <kpi.icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-xl md:text-3xl font-bold text-foreground">{kpi.value}</h3>
                <div className="flex items-center gap-1 text-xs md:text-sm">
                  {kpi.trend === "up" ? (
                    <ArrowUp className="h-3 w-3 md:h-4 md:w-4 text-success" />
                  ) : (
                    <ArrowDown className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
                  )}
                  <span
                    className={kpi.trend === "up" ? "text-success" : "text-destructive"}
                  >
                    {kpi.change}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="p-4 md:p-6">
          <h3 className="mb-3 md:mb-4 text-base md:text-lg font-semibold">CV по дням</h3>
          <div className="h-48 md:h-64 flex items-end justify-between gap-1 md:gap-2">
            {[45, 52, 48, 61, 55, 58, 47].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 md:gap-2">
                <div
                  className="w-full bg-gradient-to-t from-primary to-accent rounded-t-md transition-all hover:opacity-80"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="mb-3 md:mb-4 text-base md:text-lg font-semibold">Вакансии по сайтам</h3>
          <div className="space-y-3">
            {[
              { site: "hh.ru", count: 542, percentage: 75 },
              { site: "habr.com", count: 128, percentage: 45 },
              { site: "superjob.ru", count: 312, percentage: 60 },
              { site: "zarplata.ru", count: 261, percentage: 50 },
            ].map((item) => (
              <div key={item.site} className="space-y-2">
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="font-medium">{item.site}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-4 md:p-6">
        <h3 className="mb-3 md:mb-4 text-base md:text-lg font-semibold">Последние действия</h3>
        
        {/* Mobile: Cards */}
        <div className="space-y-3 md:hidden">
          {recentActivity.map((activity, index) => (
            <div key={index} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{activity.vacancy}</span>
                {getStatusBadge(activity.status)}
              </div>
              <div className="text-xs text-muted-foreground">
                <div>{activity.site}</div>
                <div className="mt-1">{activity.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Вакансия</th>
                <th className="pb-3 font-medium">Сайт</th>
                <th className="pb-3 font-medium">Статус</th>
                <th className="pb-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, i) => {
                const status = statusConfig[activity.status as keyof typeof statusConfig];
                return (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 font-medium">{activity.vacancy}</td>
                    <td className="py-3 text-muted-foreground">{activity.site}</td>
                    <td className="py-3">
                      <Badge variant="outline" className={`${status.textColor} border-current`}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.color}`} />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">{activity.date}</td>
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
