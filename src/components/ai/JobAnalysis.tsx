// Компонент анализа вакансий с помощью AI

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  Lightbulb
} from 'lucide-react';
import { useAI, AIJobAnalysis } from '@/hooks/useAI';
import { toast } from 'sonner';

interface JobAnalysisProps {
  jobDescription: string;
  jobTitle?: string;
  company?: string;
  cvData?: any;
  onAnalysisComplete?: (analysis: AIJobAnalysis) => void;
}

export const JobAnalysis: React.FC<JobAnalysisProps> = ({
  jobDescription,
  jobTitle,
  company,
  cvData,
  onAnalysisComplete
}) => {
  const { analyzeJob, isLoading, error, isAvailable } = useAI();
  const [analysis, setAnalysis] = useState<AIJobAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!isAvailable) {
      toast.error('AI функции недоступны. Настройте API ключ в настройках.');
      return;
    }

    try {
      setIsAnalyzing(true);
      const result = await analyzeJob(jobDescription, cvData);
      setAnalysis(result);
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
      toast.success('Анализ вакансии завершен');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка анализа';
      toast.error(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level) {
      case 'junior': return 'bg-blue-100 text-blue-800';
      case 'middle': return 'bg-green-100 text-green-800';
      case 'senior': return 'bg-purple-100 text-purple-800';
      case 'lead': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExperienceLevelText = (level: string) => {
    switch (level) {
      case 'junior': return 'Junior';
      case 'middle': return 'Middle';
      case 'senior': return 'Senior';
      case 'lead': return 'Lead';
      default: return level;
    }
  };

  if (!isAvailable) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Анализ Резюме
          </CardTitle>
          <CardDescription>
            Общий анализ вашего CV с помощью AI Groq
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI функции недоступны. Настройте OpenAI API ключ в настройках для использования анализа вакансий.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Анализ Резюме
            </CardTitle>
            <CardDescription>
              {jobTitle && company ? `${jobTitle} в ${company}` : 'Общий анализ и рекомендации по резюме'}
            </CardDescription>
          </div>
          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || isLoading}
            variant="outline"
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Анализ...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Анализировать
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ошибки */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Результат анализа */}
        {analysis ? (
          <div className="space-y-6">
            {/* Общая информация */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Общий рейтинг</span>
                  <span className={`text-lg font-bold ${getRelevanceColor(analysis.relevance)}`}>
                    {analysis.relevance}%
                  </span>
                </div>
                <Progress value={analysis.relevance} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Качество контента</span>
                  <span className={`text-lg font-bold ${getRelevanceColor(analysis.matchScore)}`}>
                    {analysis.matchScore}%
                  </span>
                </div>
                <Progress 
                  value={analysis.matchScore} 
                  className="h-2"
                />
              </div>
            </div>

            {/* Детальная информация */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Основная информация
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Уровень:</span>
                    <Badge className={getExperienceLevelColor(analysis.experienceLevel)}>
                      {getExperienceLevelText(analysis.experienceLevel)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Тип компании:</span>
                    <span className="font-medium">{analysis.companyType}</span>
                  </div>
                  {analysis.salaryRange && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Зарплата:</span>
                      <span className="font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {analysis.salaryRange}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ключевые навыки
                </h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.keySkills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Сильные и слабые стороны */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Сильные стороны
                </h4>
                <div className="space-y-2">
                  {analysis.strengths?.map((strength, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Зоны роста
                </h4>
                <div className="space-y-2">
                  {analysis.weaknesses?.map((weakness, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{weakness}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Рекомендации */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Рекомендации
              </h4>
              <div className="space-y-2">
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm p-3 bg-muted/50 rounded-lg">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Кнопка повторного анализа */}
            <div className="pt-4 border-t">
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || isLoading}
                variant="outline"
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Повторный анализ...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Обновить анализ
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Анализ Резюме</h3>
            <p className="text-muted-foreground mb-4">
              Нажмите "Анализировать" для получения детального разбора вашего резюме: 
              сильные стороны, ошибки и персональные рекомендации
            </p>
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || isLoading}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Анализируем...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Начать анализ
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
