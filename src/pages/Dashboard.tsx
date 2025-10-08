import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, FileText, AlertCircle, Briefcase, CheckCircle2, ChevronLeft, ChevronRight, TrendingUp, Activity, BarChart3, Users, ExternalLink } from "lucide-react";
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
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [siteStats, setSiteStats] = useState<SiteStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await StatsAPI.getStatsData();
      const dailyData = await StatsAPI.getDailyStats(7);
      
      setStats(statsData);
      setDailyStats(dailyData);
      setSiteStats(statsData.siteStats);
      setRecentActivity(statsData.recentActivity);
    } catch (error) {
      console.error('Failed to load stats:', error);
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
      bgGradient: "from-blue-50 to-blue-100/50",
      iconBg: "from-blue-500 to-blue-600",
    },
    {
      title: "Ошибок",
      value: stats?.totalErrors.toString() || "0",
      change: "+0%",
      trend: "down" as const,
      icon: AlertCircle,
      gradient: "from-red-500 to-red-600",
      bgGradient: "from-red-50 to-red-100/50",
      iconBg: "from-red-500 to-red-600",
    },
    {
      title: "Всего обработано",
      value: stats?.totalProcessed.toString() || "0",
      change: "+0%",
      trend: "up" as const,
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100/50",
      iconBg: "from-green-500 to-green-600",
    },
    {
      title: "Вакансий на сайте",
      value: siteStats.find(s => s.site === 'lucru.md')?.totalVacancies.toString() || "0",
      change: "+0%",
      trend: "up" as const,
      icon: Briefcase,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100/50",
      iconBg: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
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
                    <p className="text-sm font-semibold text-gray-700">{kpi.title}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {kpi.trend === "up" ? (
                        <ArrowUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={kpi.trend === "up" ? "text-green-600" : "text-red-600"}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-3xl md:text-4xl font-bold text-gray-900">
                {kpi.value}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2">
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30 hover:shadow-2xl transition-all duration-300">
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full -translate-y-12 translate-x-12"></div>
          
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">CV по дням</h3>
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
                      <span className="text-xs font-semibold text-gray-600">
                        {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-bold text-blue-600">{day.sent}</span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Нет данных</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-purple-50/30 hover:shadow-2xl transition-all duration-300">
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100/20 to-pink-100/20 rounded-full -translate-y-12 translate-x-12"></div>
          
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Вакансии по сайтам</h3>
            </div>
            
            <div className="space-y-4">
              {siteStats.length > 0 ? (
                siteStats.map((item) => (
                  <div key={item.site} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{item.site}</span>
                      <span className="text-sm font-bold text-purple-600">{item.totalVacancies}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 shadow-lg"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      Обработано: {item.percentage}%
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Нет данных</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-green-50/30 hover:shadow-2xl transition-all duration-300">
        {/* Декоративные элементы */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100/20 to-blue-100/20 rounded-full -translate-y-12 translate-x-12"></div>
        
        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Последние действия</h3>
            {recentActivity.length > 0 && (
              <div className="ml-auto">
                <span className="text-sm text-gray-600 font-semibold">
                  {startIndex + 1}-{Math.min(endIndex, recentActivity.length)} из {recentActivity.length}
                </span>
              </div>
            )}
          </div>
        
        {recentActivity.length > 0 ? (
          <>
            {/* Mobile: Cards */}
            <div className="space-y-4 md:hidden">
              {currentActivity.map((activity) => (
                <div key={activity.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-semibold text-gray-900 text-sm truncate">{activity.vacancy}</span>
                    {getStatusBadge(activity.status)}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {activity.site}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      {activity.date}
                    </div>
                  </div>
                  {activity.url && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
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
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
                    <th className="pb-4 font-semibold">Вакансия</th>
                    <th className="pb-4 font-semibold">Сайт</th>
                    <th className="pb-4 font-semibold">Статус</th>
                    <th className="pb-4 font-semibold">Дата</th>
                    <th className="pb-4 font-semibold text-center">Ссылка</th>
                  </tr>
                </thead>
                <tbody>
                  {currentActivity.map((activity) => {
                    const status = statusConfig[activity.status as keyof typeof statusConfig];
                    return (
                      <tr
                        key={activity.id}
                        className="border-b border-gray-100 last:border-0 transition-all duration-300 hover:bg-white/50 hover:shadow-sm"
                      >
                        <td className="py-4 font-semibold text-gray-900">{activity.vacancy}</td>
                        <td className="py-4 text-gray-600">{activity.site}</td>
                        <td className="py-4">
                          <Badge variant="outline" className={`${status.textColor} border-current shadow-sm`}>
                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.color}`} />
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-4 text-sm text-gray-600">{activity.date}</td>
                        <td className="py-4 text-center">
                          {activity.url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              onClick={() => window.open(activity.url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
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
                          className={`h-10 w-10 p-0 transition-all duration-200 ${
                            currentPage === pageNum 
                              ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg' 
                              : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
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
                    className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600 font-semibold">
                  Страница {currentPage} из {totalPages}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-semibold mb-2">Нет данных об активности</p>
            <p className="text-sm">Начните использовать агента для отслеживания действий</p>
          </div>
        )}
        </div>
      </Card>
    </div>
  );
}
