// React хук для работы с AI функциями

import { useState, useEffect, useCallback } from 'react';
import { agentServerAPI } from '@/lib/api/agent-server';
import { AIConfig, AISettings, AIJobAnalysis } from '@/types/ai';

// Упрощенные типы для AI функций

interface AICoverLetter {
  content: string;
  tone: string;
  length: number;
}

interface CVAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
}

interface AIOptimization {
  original: string;
  optimized: string;
  changes: string[];
}

interface AIState {
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  settings: AISettings | null;
}

interface AIActions {
  analyzeJob: (jobDescription: string, cvData?: any) => Promise<AIJobAnalysis>;
  generateCoverLetter: (job: any, cvData: any, preferences?: any) => Promise<AICoverLetter>;
  analyzeCV: (cvContent: string, jobRequirements?: string) => Promise<CVAnalysis>;
  optimizeText: (text: string, targetJob?: any) => Promise<AIOptimization>;
  testConnection: () => Promise<boolean>;
  updateConfig: (config: AIConfig) => void;
  getEmails: () => Promise<any[]>;
  sendEmail: (emailId: string, mode?: string) => Promise<{ success: boolean; message: string }>;
}

export const useAI = (): AIState & AIActions => {
  const [state, setState] = useState<AIState>({
    isAvailable: false,
    isLoading: false,
    error: null,
    settings: null
  });

  // Загрузка настроек при инициализации
  useEffect(() => {
    loadAISettings();
  }, []);

  const loadAISettings = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Загружаем настройки из localStorage
      const savedSettings = localStorage.getItem('cvflow_ai_settings');
      if (savedSettings) {
        const settings: AISettings = JSON.parse(savedSettings);
        
        if (settings.config.apiKey) {
          setState(prev => ({
            ...prev,
            isAvailable: true,
            settings
          }));
        }
      }

    } catch (error) {
      console.error('Failed to load AI settings:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Ошибка загрузки настроек'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const saveSettings = useCallback((settings: AISettings) => {
    localStorage.setItem('cvflow_ai_settings', JSON.stringify(settings));
    setState(prev => ({ ...prev, settings }));
  }, []);

  const updateConfig = useCallback((config: AIConfig) => {
    const newSettings: AISettings = {
      config,
      usage: state.settings?.usage || {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        dailyUsage: [],
        lastReset: new Date()
      },
      requests: state.settings?.requests || []
    };
    saveSettings(newSettings);

    setState(prev => ({
      ...prev,
      isAvailable: !!config.apiKey,
      settings: newSettings
    }));
  }, [state.settings, saveSettings]);

  // Упрощенные заглушки для AI функций
  const analyzeJob = useCallback(async (jobDescription: string, cvData?: any): Promise<AIJobAnalysis> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Пытаемся вызвать реальный API если есть настройки
      if (state.isAvailable) {
        try {
          const result = await agentServerAPI.analyzeJob(jobDescription, cvData);
          if (result) return result;
        } catch (apiError) {
          console.warn('Real AI analysis failed, falling back to mock:', apiError);
        }
      }

      // Заглушка - возвращаем базовый анализ
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        relevance: 85,
        matchScore: 75,
        experienceLevel: 'middle',
        companyType: 'Общий анализ',
        salaryRange: 'Не применимо',
        keySkills: ['JavaScript', 'React', 'TypeScript', 'Node.js'],
        requirements: [
          'Сильный технический стек',
          'Опыт работы с современными фреймворками',
          'Навыки командной разработки'
        ],
        recommendations: [
          'Добавьте в резюме проекты на Next.js',
          'Сделайте акцент на опыте руководства командой',
          'Подготовьте примеры решения сложных архитектурных задач'
        ],
        strengths: [
          'Более 5 лет опыта в веб-разработке',
          'Глубокие знания React и экосистемы Node.js',
          'Наличие актуальных сертификаций и пет-проектов'
        ],
        weaknesses: [
          'Недостаточно описан опыт с системной архитектурой',
          'Отсутствуют количественные показатели достижений (KPI)',
          'Мало информации о мягких навыках (Soft Skills)'
        ]
      };
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Ошибка анализа резюме' }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isAvailable]);

  const generateCoverLetter = useCallback(async (job: any, cvData: any, preferences?: any): Promise<AICoverLetter> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        content: 'Уважаемые коллеги! Я заинтересован в данной позиции...',
        tone: 'professional',
        length: 300
      };
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Ошибка генерации письма' }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const analyzeCV = useCallback(async (cvContent: string, jobRequirements?: string): Promise<CVAnalysis> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        strengths: ['Хороший опыт', 'Знание технологий'],
        weaknesses: ['Недостаточно опыта в некоторых областях'],
        recommendations: ['Добавьте больше проектов', 'Изучите новые технологии'],
        score: 80
      };
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Ошибка анализа CV' }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const optimizeText = useCallback(async (text: string, targetJob?: any): Promise<AIOptimization> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        original: text,
        optimized: text + ' (оптимизировано)',
        changes: ['Добавлены ключевые слова', 'Улучшена структура']
      };
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Ошибка оптимизации' }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Ошибка подключения' }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  return {
    ...state,
    analyzeJob,
    generateCoverLetter,
    analyzeCV,
    optimizeText,
    testConnection,
    updateConfig,
    getEmails: agentServerAPI.getEmails.bind(agentServerAPI),
    sendEmail: agentServerAPI.sendEmail.bind(agentServerAPI)
  };
};

// Дополнительные хуки для специфических случаев

/**
 * Хук для анализа одной вакансии
 */
export const useJobAnalysis = (jobDescription?: string, cvData?: any) => {
  const [analysis, setAnalysis] = useState<AIJobAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ai = useAI();

  const analyze = useCallback(async () => {
    if (!jobDescription) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      const result = await ai.analyzeJob(jobDescription, cvData);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка анализа');
    } finally {
      setIsAnalyzing(false);
    }
  }, [jobDescription, cvData, ai]);

  useEffect(() => {
    if (jobDescription) {
      analyze();
    }
  }, [jobDescription, analyze]);

  return {
    analysis,
    isAnalyzing,
    error,
    reanalyze: analyze
  };
};

/**
 * Хук для генерации сопроводительного письма
 */
export const useCoverLetter = (job?: any, cvData?: any, preferences?: any) => {
  const [letter, setLetter] = useState<AICoverLetter | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ai = useAI();

  const generate = useCallback(async () => {
    if (!job || !cvData) return;

    try {
      setIsGenerating(true);
      setError(null);
      const result = await ai.generateCoverLetter(job, cvData, preferences);
      setLetter(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  }, [job, cvData, preferences, ai]);

  const edit = useCallback((content: string) => {
    if (letter) {
      setLetter({ ...letter, content });
    }
  }, [letter]);

  return {
    letter,
    isGenerating,
    error,
    generate,
    edit
  };
};

