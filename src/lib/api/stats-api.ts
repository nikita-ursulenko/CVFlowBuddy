// API для работы со статистикой
export interface StatsData {
  totalSent: number;
  totalErrors: number;
  totalProcessed: number;
  emailsFound?: number;
  emailsSent?: number;
  dailyStats: DailyStat[];
  siteStats: SiteStat[];
  recentActivity: ActivityItem[];
  errorVacancies: ErrorVacancy[];
}

export interface DailyStat {
  date: string;
  sent: number;
  errors: number;
}

export interface SiteStat {
  site: string;
  totalVacancies: number;
  processed: number;
  percentage: number;
}

export interface ActivityItem {
  id: string;
  vacancy: string;
  site: string;
  url?: string; // URL вакансии для ссылки
  status: 'success' | 'error' | 'pending';
  date: string;
  timestamp: number;
}

export interface ErrorVacancy {
  id: string;
  url: string;
  title: string;
  reason: string;
  date: string;
}

// Локальное хранилище статистики
const STORAGE_KEY = 'cvflow_stats';

export class StatsAPI {
  private static async fetchFromAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5050`;
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      // Fallback to localStorage
      return this.getStatsFromLocalStorage();
    }
  }

  private static getStatsFromLocalStorage(): StatsData {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse stats:', error);
      }
    }
    
    return {
      totalSent: 0,
      totalErrors: 0,
      totalProcessed: 0,
      emailsFound: 0,
      emailsSent: 0,
      dailyStats: [],
      siteStats: [],
      recentActivity: [],
      errorVacancies: []
    };
  }

  private static saveStatsToLocalStorage(stats: StatsData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }

  // Получить расширенный список откликов
  static async getAppliedVacancies(): Promise<any[]> {
    try {
      const data = await this.fetchFromAPI('/api/agent/applied-vacancies');
      return data.vacancies || [];
    } catch (error) {
      console.error('Failed to fetch applied vacancies:', error);
      return [];
    }
  }

  // Получить всю статистику
  static async getStatsData(): Promise<StatsData> {
    try {
      const stats = await this.fetchFromAPI('/api/stats');
      // Сохраняем в localStorage как backup
      this.saveStatsToLocalStorage(stats);
      return stats;
    } catch (error) {
      console.error('Failed to fetch stats from API:', error);
      return this.getStatsFromLocalStorage();
    }
  }

  // Добавить успешную отправку CV
  static async addSuccessfulSubmission(vacancy: string, site: string = 'lucru.md'): Promise<void> {
    try {
      await this.fetchFromAPI('/api/stats/success', {
        method: 'POST',
        body: JSON.stringify({ vacancy, site })
      });
    } catch (error) {
      console.error('Failed to record successful submission:', error);
      // Fallback to localStorage
      const stats = this.getStatsFromLocalStorage();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      stats.totalSent++;
      stats.totalProcessed++;
      
      const dailyIndex = stats.dailyStats.findIndex(d => d.date === today);
      if (dailyIndex >= 0) {
        stats.dailyStats[dailyIndex].sent++;
      } else {
        stats.dailyStats.push({
          date: today,
          sent: 1,
          errors: 0
        });
      }
      
      stats.recentActivity.unshift({
        id: `success_${Date.now()}`,
        vacancy,
        site,
        status: 'success',
        date: now.toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        timestamp: now.getTime()
      });
      
      stats.recentActivity = stats.recentActivity.slice(0, 50);
      this.saveStatsToLocalStorage(stats);
    }
  }

  // Добавить ошибку
  static async addError(vacancy: string, url: string, reason: string, site: string = 'lucru.md'): Promise<void> {
    try {
      await this.fetchFromAPI('/api/stats/error', {
        method: 'POST',
        body: JSON.stringify({ vacancy, url, reason, site })
      });
    } catch (error) {
      console.error('Failed to record error:', error);
      // Fallback to localStorage
      const stats = this.getStatsFromLocalStorage();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      stats.totalErrors++;
      stats.totalProcessed++;
      
      const dailyIndex = stats.dailyStats.findIndex(d => d.date === today);
      if (dailyIndex >= 0) {
        stats.dailyStats[dailyIndex].errors++;
      } else {
        stats.dailyStats.push({
          date: today,
          sent: 0,
          errors: 1
        });
      }
      
      stats.errorVacancies.push({
        id: `error_${Date.now()}`,
        url,
        title: vacancy,
        reason,
        date: now.toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      });
      
      stats.recentActivity.unshift({
        id: `error_${Date.now()}`,
        vacancy,
        site,
        status: 'error',
        date: now.toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        timestamp: now.getTime()
      });
      
      stats.recentActivity = stats.recentActivity.slice(0, 50);
      this.saveStatsToLocalStorage(stats);
    }
  }

  // Обновить статистику сайта
  static async updateSiteStats(site: string, totalVacancies: number): Promise<void> {
    try {
      await this.fetchFromAPI('/api/stats/site', {
        method: 'POST',
        body: JSON.stringify({ site, totalVacancies })
      });
    } catch (error) {
      console.error('Failed to update site stats:', error);
      // Fallback to localStorage
      const stats = this.getStatsFromLocalStorage();
      
      const siteIndex = stats.siteStats.findIndex(s => s.site === site);
      if (siteIndex >= 0) {
        stats.siteStats[siteIndex].totalVacancies = totalVacancies;
        stats.siteStats[siteIndex].percentage = Math.round((stats.siteStats[siteIndex].processed / totalVacancies) * 100);
      } else {
        stats.siteStats.push({
          site,
          totalVacancies,
          processed: 0,
          percentage: 0
        });
      }
      
      this.saveStatsToLocalStorage(stats);
    }
  }

  // Очистить статистику
  static async clearStats(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    // TODO: Add API call to clear server stats
  }

  // Получить статистику за последние N дней
  static async getDailyStats(days: number = 7): Promise<DailyStat[]> {
    const stats = await this.getStatsData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return stats.dailyStats
      .filter(d => new Date(d.date) >= cutoffDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
