import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, FileText, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, TrendingUp, Activity, BarChart3, ExternalLink, Search, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { StatsAPI, StatsData, DailyStat, SiteStat, ActivityItem } from "@/lib/api/stats-api";

// Удаляем статические данные - будем использовать реальные

// Удаляем статические данные - будем использовать реальные

const statusConfig = {
  success: { label: "Успешно", color: "bg-success", textColor: "text-success" },
  error: { label: "Ошибка", color: "bg-destructive", textColor: "text-destructive" },
  pending: { label: "В процессе", color: "bg-warning", textColor: "text-warning" },
  email_found: { label: "Почта найдена", color: "bg-blue-500", textColor: "text-blue-500" },
  email_generated: { label: "Письмо готово", color: "bg-purple-500", textColor: "text-purple-500" },
  email_sent: { label: "Отправлено", color: "bg-indigo-500", textColor: "text-indigo-500" },
};

const getStatusBadge = (status: string) => {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  return (
    <Badge variant="outline" className={`${config.textColor} border-current text-xs shadow-sm bg-white/50 backdrop-blur-[2px]`}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.color} animate-pulse`} />
      {config.label}
    </Badge>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [siteStats, setSiteStats] = useState<SiteStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadStats();
    // Автообновление каждые 5 секунд для синхронизации с действиями на других вкладках
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const [statsData, dailyData] = await Promise.all([
        StatsAPI.getStatsData(),
        StatsAPI.getDailyStats(7)
      ]);

      setStats(statsData);
      setDailyStats(dailyData);
      setSiteStats(statsData.siteStats);
      // Сортируем активность по дате, чтобы новые действия всегда были сверху
      setRecentActivity(statsData.recentActivity);
      setLastSync(new Date());
      setIsLive(true);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  // Пагинация для активности
  const totalPages = Math.ceil(recentActivity.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivity = recentActivity.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-3 md:p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpiData = [
    {
      title: "Отправлено CV",
      value: stats?.totalSent.toString() || "0",
      change: "+0%",
      trend: "up" as const,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
      iconBg: "from-blue-500 to-blue-600",
    },
    {
      title: "Найдено Email",
      value: stats?.emailsFound?.toString() || "0",
      change: "+0%",
      trend: "up" as const,
      icon: Search,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
      iconBg: "from-purple-500 to-purple-600",
    },
    {
      title: "Отправлено Email",
      value: stats?.emailsSent?.toString() || "0",
      change: "+0%",
      trend: "up" as const,
      icon: Mail,
      gradient: "from-indigo-500 to-indigo-600",
      bgGradient: "from-indigo-500/10 to-indigo-600/5 dark:from-indigo-500/20 dark:to-indigo-600/10",
      iconBg: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Ошибки",
      value: stats?.totalErrors.toString() || "0",
      change: "+0%",
      trend: "down" as const,
      icon: AlertCircle,
      gradient: "from-red-500 to-red-600",
      bgGradient: "from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10",
      iconBg: "from-red-500 to-red-600",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Дашборд
            </h1>
            {lastSync && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50 border border-border/50 text-[10px] font-medium text-muted-foreground animate-in fade-in duration-500">
                <div className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                {isLive ? 'Live' : 'Offline'} • {lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>
          <p className="text-muted-foreground font-medium">
            Обзор вашей активности и эффективности поиска работы
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setLoading(true);
              loadStats();
            }}
            className="bg-card hover:bg-muted border-border font-semibold transition-all duration-300"
          >
            <Activity className={`mr-2 h-4 w-4 text-primary ${loading ? 'animate-spin' : ''}`} />
            Обновить данные
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card
            key={kpi.title}
            className={`relative overflow-hidden p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br ${kpi.bgGradient} border-0 shadow-lg`}
          >
            {/* Декоративные элементы */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/10 to-transparent rounded-full translate-y-8 -translate-x-8"></div>

            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.iconBg} shadow-lg`}>
                    <kpi.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">{kpi.title}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {kpi.trend === "up" ? (
                        <ArrowUp className="h-3 w-3 text-success" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={kpi.trend === "up" ? "text-success" : "text-destructive"}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-3xl md:text-4xl font-bold text-foreground">
                {kpi.value}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:gap-8 grid-cols-1">
        <Card className="relative overflow-hidden border border-border shadow-xl bg-card hover:shadow-2xl transition-all duration-300">
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full -translate-y-12 translate-x-12"></div>

          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary shadow-lg">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">CV по дням</h3>
            </div>

            <div className="h-64 flex items-end justify-between gap-2">
              {dailyStats.length > 0 ? (
                dailyStats.map((day, i) => {
                  const maxSent = Math.max(...dailyStats.map(d => d.sent), 1);
                  const height = (day.sent / maxSent) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-bold text-primary">{day.sent}</span>
                    </div>
                  )
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Нет данных</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

      </div>

      {/* Recent Activity */}
      <Card className="relative overflow-hidden border border-border shadow-xl bg-card hover:shadow-2xl transition-all duration-300">
        {/* Декоративные элементы */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-success/10 to-primary/10 rounded-full -translate-y-12 translate-x-12"></div>

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-success shadow-lg">
              <Activity className="h-5 w-5 text-success-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Последние действия</h3>
            {recentActivity.length > 0 && (
              <div className="ml-auto">
                <span className="text-sm text-muted-foreground font-semibold">
                  {startIndex + 1}-{Math.min(endIndex, recentActivity.length)} из {recentActivity.length}
                </span>
              </div>
            )}
          </div>

          {recentActivity.length > 0 ? (
            <>
              {/* Mobile: Cards */}
              <div className="space-y-4 md:hidden">
                {currentActivity.map((activity) => {
                  const isEmail = activity.site === 'Email' || activity.site === 'Email Search';
                  return (
                    <div key={activity.id} className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isEmail ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'}`}>
                            {isEmail ? <Mail className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          </div>
                          <span className="font-semibold text-foreground text-sm truncate">{activity.vacancy}</span>
                        </div>
                        {getStatusBadge(activity.status)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1.5 ml-8">
                        <div className="flex items-center gap-2">
                          <span className="opacity-60">{activity.site}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-60">{activity.date}</span>
                        </div>
                      </div>
                      {activity.url && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => window.open(activity.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Открыть вакансию
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted-foreground">
                      <th className="pb-4 font-semibold">Вакансия</th>
                      <th className="pb-4 font-semibold">Сайт</th>
                      <th className="pb-4 font-semibold">Статус</th>
                      <th className="pb-4 font-semibold">Дата</th>
                      <th className="pb-4 font-semibold text-center">Ссылка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentActivity.map((activity) => {
                      const status = statusConfig[activity.status as keyof typeof statusConfig] || statusConfig.pending;
                      const isEmail = activity.site === 'Email' || activity.site === 'Email Search';
                      return (
                        <tr
                          key={activity.id}
                          className="border-b border-border/50 last:border-0 transition-all duration-300 hover:bg-muted/30 hover:shadow-sm"
                        >
                          <td className="py-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${isEmail ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'}`}>
                                {isEmail ? <Mail className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                              </div>
                              <span className="truncate max-w-[200px] lg:max-w-[300px]" title={activity.vacancy}>
                                {activity.vacancy?.startsWith('cid_') ? 'Спецификация вакансии' : activity.vacancy}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              {activity.site}
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge variant="outline" className={`${status.textColor} border-current shadow-sm`}>
                              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.color}`} />
                              {status.label}
                            </Badge>
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">{activity.date}</td>
                          <td className="py-4 text-center">
                            {activity.url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => window.open(activity.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-10 w-10 p-0 border-border hover:bg-muted transition-all duration-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={`h-10 w-10 p-0 transition-all duration-200 ${currentPage === pageNum
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'border-border hover:bg-muted'
                              }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-10 w-10 p-0 border-border hover:bg-muted transition-all duration-200"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground font-semibold">
                    Страница {currentPage} из {totalPages}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold mb-2">Нет данных об активности</p>
              <p className="text-sm">Начните использовать агента для отслеживания действий</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
