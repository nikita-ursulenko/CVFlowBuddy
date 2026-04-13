import { useState, useEffect, useCallback } from 'react';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  name: string;
  targetEmail?: string;
}

interface GeneralSettings {
  smtp: SmtpConfig;
  emailMode: 'auto' | 'manual';
  headless: boolean;
  autoHide: boolean;
  maxJobs: number;
  minMatchScore: number;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  smtp: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: '',
      pass: '',
    },
    name: 'CV Flow Buddy',
  },
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
        setSettings(JSON.parse(saved));
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

  const updateSmtp = useCallback((smtp: Partial<SmtpConfig>) => {
    setSettings(prev => {
      const updated = { ...prev, smtp: { ...prev.smtp, ...smtp } };
      localStorage.setItem('cvflow_general_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    updateSmtp,
  };
};
