import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, Loader2, Brain, CheckCircle2, ChevronRight, Download, Eye, FileUp, Trash2, Zap } from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CVUpload } from '@/components/cv/CVUpload';
import { useCV } from '@/hooks/useCV';

export default function CV() {
  const { cvFile, uploadCV, deleteCV, isLoggedIn, saveAIAnalysis, sessionId, cvExistsOnSite, saveCVExistsStatus } = useCV();
  const { analyzeCV, isLoading: isAILoading, isAvailable: isAIAvailable } = useAI();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Демонстрационные данные для AI функций
  const demoJob = {
    title: "Senior React Developer",
    company: "Tech Solutions Inc.",
    description: "Looking for an expert in React, TypeScript and Node.js..."
  };

  const handleCVUpload = async (file: File) => {
    try {
      await uploadCV(file);
      
      // Автоматический AI анализ после загрузки
      if (isAIAvailable) {
        try {
          setIsAnalyzing(true);
          const aiSettings = JSON.parse(localStorage.getItem('cvflow_ai_settings') || '{}');
          const response = await fetch('http://localhost:5050/api/agent/analyze-cv-general', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filePath: file.name,
              apiKey: aiSettings.config?.apiKey,
              model: aiSettings.config?.model,
              provider: aiSettings.config?.provider
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Сохраняем результаты AI анализа
            saveAIAnalysis(data.analysis);
            
            toast.success('✅ AI анализ завершен! Данные сохранены.');
          } else {
            toast.warning('CV загружен, но AI анализ не удался');
          }
        } catch (error) {
          console.error('AI analysis error:', error);
          toast.warning('CV загружен, но AI анализ не удался');
        } finally {
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">CV и AI Анализ</h1>
        <p className="text-sm md:text-base text-muted-foreground">Управление резюме и AI-помощник</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="files" className="flex items-center gap-2 flex-1">
            <FileText className="h-4 w-4" />
            Файлы (CV)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">

      {/* AI Status Alert */}
      {isAnalyzing && (
        <Alert className="bg-primary/10 border-primary/20">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <AlertDescription className="text-primary font-medium">
            AI анализирует ваше CV... Это займет несколько секунд.
          </AlertDescription>
        </Alert>
      )}

      {!isAIAvailable && (
        <Alert className="bg-destructive/10 border-destructive/20">
          <Brain className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            AI функции недоступны. Настройте API ключ в полях "Настройки" для автоматического анализа CV.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <CVUpload onFileUpload={handleCVUpload} />

      {/* Current CV File */}
      {cvFile && (
        <Card className="p-4 md:p-6 border-l-4 border-l-primary">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base md:text-lg truncate max-w-[200px] md:max-w-md">
                  {cvFile.name}
                </h3>
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <span>{(Number(cvFile.size) / 1024 / 1024).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>Загружено: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Просмотр</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Скачать</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => deleteCV()}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Удалить</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* AI Analysis View - if available */}
      {isAIAvailable && !isAnalyzing && (
        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          <Card className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Анализ резюме
              </h3>
              <Badge variant="outline" className="bg-primary/10">85/100</Badge>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Сильные стороны</p>
                <ul className="space-y-1">
                  <li className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Богатый опыт в React и TypeScript</span>
                  </li>
                  <li className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Хорошая структура и читаемость проекта</span>
                  </li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium mb-2">Рекомендации</p>
                <p className="text-sm text-muted-foreground italic">
                  Добавьте больше количественных метрик в описание достижений (например, "увеличил скорость загрузки на 40%").
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Подготовка к вакансии
            </h3>
            
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Целевая вакансия</p>
              <p className="text-sm font-medium">{demoJob.title} @ {demoJob.company}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Соответствие стеку</span>
                <span className="font-bold">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            
            <Button className="w-full gap-2">
              Оптимизировать CV под вакансию
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
