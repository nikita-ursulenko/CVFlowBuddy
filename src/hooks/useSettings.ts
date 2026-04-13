import { useState, useEffect, useCallback } from 'react';

interface GeneralSettings {
  emailMode: 'manual';
  headless: boolean;
  autoHide: boolean;
  maxJobs: number;
  minMatchScore: number;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  emailMode: 'manual',
  headless: true,
  autoHide: true,
  maxJobs: 10,
  minMatchScore: 70,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cvflow_general_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Очищаем старые поля если они были
        const clean = {
          emailMode: 'manual' as const,
          headless: parsed.headless ?? DEFAULT_SETTINGS.headless,
          autoHide: parsed.autoHide ?? DEFAULT_SETTINGS.autoHide,
          maxJobs: parsed.maxJobs ?? DEFAULT_SETTINGS.maxJobs,
          minMatchScore: parsed.minMatchScore ?? DEFAULT_SETTINGS.minMatchScore
        };
        setSettings(clean);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    setIsLoading(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<GeneralSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('cvflow_general_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
  };
};
