export type AIProvider = 'openai' | 'groq' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  apiKeys?: Partial<Record<AIProvider, string>>;
  model: string;
  maxTokens?: number;
  temperature?: number;
  enabledFeatures?: {
    jobAnalysis: boolean;
    coverLetterGeneration: boolean;
    cvOptimization: boolean;
    jobFiltering: boolean;
  };
  costLimits?: {
    dailyLimit: number;
    monthlyLimit: number;
    perRequestLimit: number;
  };
}

export interface AIJobAnalysis {
  relevance: number;
  matchScore: number;
  experienceLevel: 'junior' | 'middle' | 'senior' | 'lead';
  companyType: string;
  salaryRange?: string;
  keySkills: string[];
  requirements: string[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface AISettings {
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
