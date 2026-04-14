import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  RefreshCw, 
  Loader2, 
  Brain, 
  CheckCircle2, 
  ChevronRight, 
  Download, 
  Eye, 
  FileUp, 
  Trash2, 
  Zap,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CVUpload } from '@/components/cv/CVUpload';
import { useCV } from '@/hooks/useCV';
import { cn } from "@/lib/utils";

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

      {/* AI Analysis View - Dynamic */}
      {isAIAvailable && !isAnalyzing && cvFile?.aiAnalysis && (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Main Score & Categories */}
          <Card className="p-4 md:p-6 lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Анализ резюме
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Общий балл</span>
                <Badge variant={cvFile.aiAnalysis.overallScore > 70 ? "default" : "outline"} className={cn(
                  "text-lg font-bold px-3 py-0.5",
                  cvFile.aiAnalysis.overallScore > 70 ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                )}>
                  {cvFile.aiAnalysis.overallScore}/100
                </Badge>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Метрики качества</p>
                <div className="space-y-3">
                  {[
                    { label: 'Контент', val: cvFile.aiAnalysis.categories?.content, color: 'bg-blue-500' },
                    { label: 'Структура', val: cvFile.aiAnalysis.categories?.structure, color: 'bg-purple-500' },
                    { label: 'Навыки', val: cvFile.aiAnalysis.categories?.skills, color: 'bg-indigo-500' },
                    { label: 'Impact / Результаты', val: cvFile.aiAnalysis.categories?.impact, color: 'bg-pink-500' }
                  ].map((cat) => (
                    <div key={cat.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{cat.label}</span>
                        <span>{cat.val}%</span>
                      </div>
                      <Progress value={cat.val} className="h-1.5" indicatorClassName={cat.color} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Сильные стороны</p>
                <ul className="space-y-2">
                  {cvFile.aiAnalysis.feedback?.strengths?.map((str: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2 bg-green-500/5 p-2 rounded-lg border border-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Рекомендации по улучшению</p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-destructive uppercase">Критические исправления</p>
                  {cvFile.aiAnalysis.feedback?.improvements?.critical?.map((item: string, i: number) => (
                    <div key={i} className="text-sm p-3 bg-destructive/5 border border-destructive/10 rounded-xl flex gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-blue-500 uppercase">Советы эксперта</p>
                  {cvFile.aiAnalysis.feedback?.improvements?.suggested?.map((item: string, i: number) => (
                    <div key={i} className="text-sm p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-2 text-muted-foreground">
                      <ChevronRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span className="italic">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Sidebar Analytics */}
          <div className="space-y-4 md:space-y-6">
            {/* Market Analysis */}
            <Card className="p-4 md:p-6 bg-primary/5 border-primary/10 space-y-4">
              <h4 className="font-bold flex items-center gap-2 text-primary">
                <Download className="h-4 w-4 rotate-180" />
                Рыночные инсайты
              </h4>
              <div className="space-y-3">
                <div className="p-3 bg-background rounded-xl border border-primary/10">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Уровень опыта</p>
                  <p className="font-bold capitalize">{cvFile.aiAnalysis.marketAnalysis?.experienceLevel || 'Не определен'}</p>
                </div>
                <div className="p-3 bg-background rounded-xl border border-primary/10">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Оценка зарплаты</p>
                  <p className="font-bold text-green-600">
                    {cvFile.aiAnalysis.marketAnalysis?.salaryEstimate} {cvFile.aiAnalysis.marketAnalysis?.salaryEstimate && '€'}
                    {!cvFile.aiAnalysis.marketAnalysis?.salaryEstimate && 'Нужен анализ рынка'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Подходящие роли</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cvFile.aiAnalysis.marketAnalysis?.suggestedRoles?.map((role: string) => (
                      <Badge key={role} variant="secondary" className="text-[10px]">{role}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Keyword Tracking */}
            <Card className="p-4 md:p-6 space-y-4">
              <h4 className="font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Ключевые слова (ATS)
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Найдено в резюме</p>
                  <div className="flex flex-wrap gap-1">
                    {cvFile.aiAnalysis.keywords?.found?.map((kw: string) => (
                      <Badge key={kw} variant="outline" className="text-[10px] bg-green-500/5 text-green-600 border-green-200">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 text-destructive">Рекомендуется добавить</p>
                  <div className="flex flex-wrap gap-1">
                    {cvFile.aiAnalysis.keywords?.missing?.map((kw: string) => (
                      <Badge key={kw} variant="outline" className="text-[10px] bg-destructive/5 text-destructive border-destructive/20">
                        + {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
