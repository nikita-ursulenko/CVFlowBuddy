// React хук для работы с AI функциями

import { useState, useEffect, useCallback } from 'react';

// Упрощенные типы для AI функций
interface AIJobAnalysis {
  skills: string[];
  requirements: string[];
  matchScore: number;
  recommendations: string[];
}

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

interface AIConfig {
  provider: 'openai' | 'groq';
  apiKey: string;
  model: string;
}

interface AISettings {
  config: AIConfig;
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    dailyUsage: any[];
    lastReset: Date;
  };
  requests: any[];
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
      // Заглушка - возвращаем базовый анализ
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        skills: ['JavaScript', 'React', 'TypeScript'],
        requirements: ['Опыт работы', 'Знание фреймворков'],
        matchScore: 75,
        recommendations: ['Изучите новые технологии', 'Практикуйтесь в проектах']
      };
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Ошибка анализа вакансии' }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

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
    updateConfig
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

