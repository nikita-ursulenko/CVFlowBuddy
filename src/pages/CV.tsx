import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Eye, Trash2, Download, Brain, Bot, Search, RefreshCw, Loader2 } from "lucide-react";
import { JobAnalysis } from "@/components/ai/JobAnalysis";
import { CoverLetterGenerator } from "@/components/ai/CoverLetterGenerator";
import { CVUpload } from "@/components/cv/CVUpload";
import { CVSync } from "@/components/cv/CVSync";
import { useCV } from "@/hooks/useCV";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CV() {
  const { cvFile, uploadCV, deleteCV, isLoggedIn, saveAIAnalysis, sessionId, cvExistsOnSite, saveCVExistsStatus } = useCV();
  const { analyzeCV, isLoading: isAILoading, isAvailable: isAIAvailable } = useAI();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Демонстрационные данные для AI функций
  const demoJob = {
    title: "Senior React Developer",
    company: "TechCorp",
    description: `
Требования:
- 5+ лет опыта разработки на React
- Знание TypeScript, Redux, Next.js
- Опыт работы с REST API и GraphQL
- Понимание принципов CI/CD
- Английский язык intermediate+

Обязанности:
- Разработка пользовательских интерфейсов
- Оптимизация производительности приложений
- Участие в code review
- Менторство junior разработчиков

Предлагаем:
- Конкурентная зарплата
- Гибкий график работы
- Современный стек технологий
- Возможность удаленной работы
    `.trim()
  };

  const demoCVData = {
    name: "Иван Петров",
    position: "Senior Frontend Developer",
    experience: [
      {
        company: "WebStudio",
        position: "Lead Frontend Developer",
        period: "2022-2024",
        description: "Руководство командой разработки, архитектура приложений на React"
      },
      {
        company: "TechStart",
        position: "Frontend Developer", 
        period: "2020-2022",
        description: "Разработка SPA приложений, интеграции с API"
      }
    ],
    skills: ["React", "TypeScript", "Redux", "Next.js", "Node.js", "Git"],
    education: "Магистр информатики, МГУ"
  };

  // Обработчик загрузки CV с автоматическим AI анализом
  const handleCVUpload = async (file: File) => {
    try {
      // Загружаем CV на сервер
      const cvFileData = await uploadCV(file, true);
      
      if (!cvFileData) {
        return;
      }

      // Автоматический AI анализ если доступен
      if (isAIAvailable && cvFileData.filePath) {
        setIsAnalyzing(true);
        toast.info('Запуск AI анализа CV...');
        
        try {
          // Получаем API ключ из настроек AI
          const aiSettings = localStorage.getItem('cvflow_ai_settings');
          let apiKey = '';
          if (aiSettings) {
            try {
              const settings = JSON.parse(aiSettings);
              apiKey = settings.config?.apiKey || '';
            } catch (e) {
              console.error('Ошибка чтения настроек AI:', e);
            }
          }
          
          if (!apiKey) {
            toast.error('❌ Groq API ключ не настроен. Перейдите в раздел AI → Настройки и укажите API ключ');
            setIsAnalyzing(false);
            return;
          }
          
          // Читаем контент CV через сервер
          const baseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5050`;
          const response = await fetch(`${baseUrl}/api/agent/analyze-cv`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: cvFileData.filePath,
              apiKey: apiKey
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Файлы
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Синхронизация
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Анализ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">

      {/* AI Status Alert */}
      {isAnalyzing && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-800">
            AI анализирует ваше CV... Это займет несколько секунд.
          </AlertDescription>
        </Alert>
      )}

      {!isAIAvailable && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Brain className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            AI функции недоступны. Настройте API ключ в разделе "Настройки" для автоматического анализа CV.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <CVUpload onFileUpload={handleCVUpload} />

      {/* Current CV File */}
      {cvFile ? (
        <div className="space-y-3 md:space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Текущее резюме</h2>
          <Card className="p-4 md:p-6 transition-all hover:shadow-md ring-2 ring-primary">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
              <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
                <div className="flex h-10 w-10 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="space-y-1.5 md:space-y-2 min-w-0 flex-1">
                  <div className="space-y-0.5 md:space-y-1">
                    <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{cvFile.name}</h3>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <span>{cvFile.date}</span>
                      <span>•</span>
                      <span>{cvFile.size}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="default" className="text-xs">
                      Активно
                    </Badge>
                    {cvFile.aiAnalysis && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        AI проанализировано
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 md:h-9 md:w-9 flex-1 sm:flex-none"
                  onClick={() => {
                    // TODO: Реализовать просмотр CV
                    console.log('View CV:', cvFile.name);
                  }}
                >
                  <Eye className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 md:h-9 md:w-9 flex-1 sm:flex-none"
                  onClick={() => {
                    // TODO: Реализовать скачивание CV
                    console.log('Download CV:', cvFile.name);
                  }}
                >
                  <Download className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 md:h-9 md:w-9 text-destructive flex-1 sm:flex-none"
                  onClick={deleteCV}
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Резюме не загружено</h2>
          <Card className="p-6 md:p-8 border-dashed border-2 border-muted-foreground/25">
            <div className="flex flex-col items-center justify-center space-y-3 text-center text-muted-foreground">
              <FileText className="h-12 w-12" />
              <p className="text-sm">Загрузите ваше резюме для использования в агентах</p>
            </div>
          </Card>
        </div>
      )}
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <CVSync 
            cvFile={cvFile}
            isLoggedIn={isLoggedIn}
            sessionId={sessionId}
            cvExistsOnSite={cvExistsOnSite}
            onSyncComplete={() => {
              console.log('CV синхронизирован');
              // Обновляем статус - CV теперь на сайте
              saveCVExistsStatus(true);
            }}
          />
        </TabsContent>


        <TabsContent value="analysis" className="space-y-4">
          <JobAnalysis 
            jobDescription="Общий анализ резюме для оценки сильных сторон и зон роста."
            cvData={demoCVData}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
