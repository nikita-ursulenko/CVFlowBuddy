/**
 * useAgentAutoApply.ts
 * Hook: логика запуска автоотправки CV на вакансии с мониторингом прогресса.
 * Извлечено из AgentControl.tsx для уменьшения его размера.
 */

import { useState } from 'react';
import { agentServerAPI } from '@/lib/api/agent-server';
import { toast } from 'sonner';

interface AutoApplyOptions {
  sessionId: string | null;
  cvFile: any;
  settings: {
    maxCVDaily: number;
    headless?: boolean;
  };
  config: any;
  generalSettings: any;
  aiSystemSettings: any;
  setLoggedIn: (v: boolean) => void;
  saveSessionId: (id: string | null) => void;
  saveAIAnalysis: (analysis: any) => void;
  loadStatsFromServer: () => Promise<void>;
}

export function useAgentAutoApply({
  sessionId,
  cvFile,
  settings,
  config,
  generalSettings,
  aiSystemSettings,
  setLoggedIn,
  saveSessionId,
  saveAIAnalysis,
  loadStatsFromServer
}: AutoApplyOptions) {
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  const [autoApplyProgress, setAutoApplyProgress] = useState('');

  /** Получить настройки AI из localStorage */
  const getAISettings = () => {
    try {
      const stored = localStorage.getItem('cvflow_ai_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        return {
          apiKey: settings?.config?.apiKey || '',
          provider: settings?.config?.provider || 'groq',
          model: settings?.config?.model || ''
        };
      }
    } catch {}
    return { apiKey: '', provider: 'groq', model: '' };
  };

  /** Снять начальный счётчик отправок (для подсчёта прогресса сессии) */
  const fetchStartCount = async (): Promise<number> => {
    try {
      const url = `${window.location.protocol}//${window.location.hostname}:5050`;
      const r = await fetch(`${url}/api/stats`);
      if (r.ok) return (await r.json()).totalSent || 0;
    } catch {}
    return 0;
  };

  /** Запустить мониторинг прогресса пока идёт отправка */
  const startProgressMonitor = (
    sessionStartCount: number,
    maxJobs: number,
    localSessionId: string
  ) => {
    let lastProgress = 0;
    let noProgressCount = 0;
    let completed = false;

    const id = setInterval(async () => {
      if (completed) { clearInterval(id); return; }
      try {
        const url = `${window.location.protocol}//${window.location.hostname}:5050`;
        const r = await fetch(`${url}/api/stats`);
        if (!r.ok) return;
        const serverStats = await r.json();
        const totalSent: number = serverStats.totalSent || 0;
        const sessionProgress = Math.min(totalSent - sessionStartCount, maxJobs);
        setAutoApplyProgress(`Отправка CV: ${sessionProgress} / ${maxJobs}`);

        const hasRecent = (serverStats.recentActivity || []).some((a: any) =>
          a.timestamp && Date.now() - new Date(a.timestamp).getTime() < 30000
        );

        if (sessionProgress === lastProgress && !hasRecent) {
          noProgressCount++;
          if (noProgressCount >= 24) { // 2 минуты
            console.log('🔄 Агент завис. Перезапуск...');
            setAutoApplyProgress('Агент завис. Перезапуск...');
            toast.warning('⚠️ Агент завис (2 мин). Выполняется перезапуск...');
            await agentServerAPI.closeAgent(localSessionId).catch(() => {});
            noProgressCount = 0;
          }
        } else if (sessionProgress > lastProgress) {
          lastProgress = sessionProgress;
          noProgressCount = 0;
        }
      } catch {}
    }, 5000);

    return {
      stop: () => { completed = true; clearInterval(id); }
    };
  };

  /** Основная функция запуска автоотправки */
  const handleAutoApply = async (manualMaxJobs?: number) => {
    if (!sessionId) { toast.error('Сначала войдите в аккаунт'); return; }
    if (!cvFile) { toast.error('Сначала загрузите CV файл'); return; }

    const maxJobs = manualMaxJobs || settings.maxCVDaily || config?.settings?.maxCVDaily || 20;
    const callOptions = {
      maxJobs,
      minMatchScore: 70,
      headless: settings.headless ?? config?.settings?.headless ?? true,
      apiKey: aiSystemSettings?.config?.apiKey || getAISettings().apiKey,
      smtpConfig: generalSettings?.smtp,
      emailMode: generalSettings?.emailMode || 'auto'
    };

    // Авто-анализ CV если ещё не сделан
    if (!cvFile.aiAnalysis) {
      const { apiKey, provider, model } = getAISettings();
      if (!apiKey) {
        toast.error('❌ API ключ не настроен. Укажите его в разделе AI → Настройки');
        return;
      }
      toast.info(`🤖 Запускаем AI анализ CV [${provider.toUpperCase()}]...`);
      try {
        const base = `${window.location.protocol}//${window.location.hostname}:5050`;
        const r = await fetch(`${base}/api/agent/analyze-cv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filePath: cvFile.filePath, 
            apiKey,
            provider,
            model
          })
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ message: 'Ошибка' }));
          toast.error(`❌ Ошибка AI анализа: ${err.message}`);
          return;
        }
        const { analysis } = await r.json();
        saveAIAnalysis(analysis);
        toast.success('✅ AI анализ завершен!');
        cvFile = { ...cvFile, aiAnalysis: analysis };
      } catch (e: any) {
        toast.error(`❌ AI анализ: ${e.message}`);
        return;
      }
    }

    setIsAutoApplying(true);
    setAutoApplyProgress(`Отправка CV: 0 / ${maxJobs}`);
    const sessionStartCount = await fetchStartCount();
    localStorage.setItem('agent_run_start_count', String(sessionStartCount));

    const monitor = startProgressMonitor(sessionStartCount, maxJobs, sessionId);

    try {
      toast.info(`🤖 Автоотправка на ${maxJobs} вакансий...`);
      const result = await agentServerAPI.autoApplyToJobs(sessionId, cvFile.aiAnalysis, callOptions);

      if (result.success) {
        monitor.stop();
        if (result.appliedCount !== undefined) {
          setAutoApplyProgress(`Завершено! Отправлено: ${result.appliedCount}/${result.total}`);
        } else {
          setAutoApplyProgress('Задача выполняется в фоне...');
          return; // мониторинг продолжает работать
        }
        toast.success(`✅ ${result.message}`);
        await loadStatsFromServer();
      } else {
        monitor.stop();
        if (result.message?.includes('Выполните вход')) {
          toast.error('❌ Сессия истекла. Войдите заново.');
          setLoggedIn(false);
          saveSessionId(null);
        } else {
          throw new Error(result.message);
        }
      }
    } catch (e: any) {
      monitor.stop();
      toast.error(`❌ Ошибка автоотправки: ${e.message}`);
    } finally {
      setTimeout(() => {
        setIsAutoApplying(false);
        setAutoApplyProgress('');
      }, 5000);
    }
  };

  return { isAutoApplying, autoApplyProgress, handleAutoApply };
}
