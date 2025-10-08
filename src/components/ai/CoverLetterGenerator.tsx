// Компонент генерации сопроводительных писем с помощью AI

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Edit, 
  Save, 
  Copy, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Download,
  Settings,
  Sparkles
} from 'lucide-react';
import { AICoverLetter } from '@/types/ai';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';

interface CoverLetterGeneratorProps {
  job: {
    title: string;
    company: string;
    description: string;
    id?: string;
  };
  cvData: any;
  onLetterGenerated?: (letter: AICoverLetter) => void;
  onLetterSaved?: (letter: AICoverLetter) => void;
}

interface LetterPreferences {
  tone: 'professional' | 'friendly' | 'formal';
  length: 'short' | 'medium' | 'long';
  includeSalary?: boolean;
  includeAvailability?: boolean;
  customInstructions?: string;
}

export const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({
  job,
  cvData,
  onLetterGenerated,
  onLetterSaved
}) => {
  const { generateCoverLetter, isLoading, error, isAvailable } = useAI();
  const [letter, setLetter] = useState<AICoverLetter | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [preferences, setPreferences] = useState<LetterPreferences>({
    tone: 'professional',
    length: 'medium',
    includeSalary: false,
    includeAvailability: true,
    customInstructions: ''
  });

  const handleGenerate = async () => {
    if (!isAvailable) {
      toast.error('AI функции недоступны. Настройте API ключ в настройках.');
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generateCoverLetter(job, cvData, preferences);
      setLetter(result);
      setEditedContent(result.content);
      setIsEditing(false);
      if (onLetterGenerated) {
        onLetterGenerated(result);
      }
      toast.success('Сопроводительное письмо сгенерировано');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка генерации';
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    if (letter) {
      setEditedContent(letter.content);
    }
  };

  const handleSave = () => {
    if (letter) {
      const updatedLetter = {
        ...letter,
        content: editedContent
      };
      setLetter(updatedLetter);
      setIsEditing(false);
      if (onLetterSaved) {
        onLetterSaved(updatedLetter);
      }
      toast.success('Изменения сохранены');
    }
  };

  const handleCancel = () => {
    if (letter) {
      setEditedContent(letter.content);
    }
    setIsEditing(false);
  };

  const handleCopy = async () => {
    const textToCopy = isEditing ? editedContent : letter?.content || '';
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Письмо скопировано в буфер обмена');
    } catch (err) {
      toast.error('Не удалось скопировать письмо');
    }
  };

  const handleDownload = () => {
    if (!letter) return;

    const content = isEditing ? editedContent : letter.content;
    const filename = `cover_letter_${job.company}_${job.title.replace(/\s+/g, '_')}.txt`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Письмо сохранено в файл');
  };

  const getToneText = (tone: string) => {
    switch (tone) {
      case 'professional': return 'Профессиональный';
      case 'friendly': return 'Дружелюбный';
      case 'formal': return 'Формальный';
      default: return tone;
    }
  };

  const getLengthText = (length: string) => {
    switch (length) {
      case 'short': return 'Краткое';
      case 'medium': return 'Среднее';
      case 'long': return 'Подробное';
      default: return length;
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'friendly': return 'bg-green-100 text-green-800';
      case 'formal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLengthColor = (length: string) => {
    switch (length) {
      case 'short': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'long': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAvailable) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Генератор сопроводительных писем
          </CardTitle>
          <CardDescription>
            Создание персонализированных писем с помощью AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI функции недоступны. Настройте OpenAI API ключ в настройках для использования генератора писем.
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
              <FileText className="h-5 w-5" />
              Сопроводительное письмо
            </CardTitle>
            <CardDescription>
              {job.title} в {job.company}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {letter && (
              <>
                <Badge className={getToneColor(letter.tone)}>
                  {getToneText(letter.tone)}
                </Badge>
                <Badge className={getLengthColor(letter.length)}>
                  {getLengthText(letter.length)}
                </Badge>
              </>
            )}
          </div>
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

        {/* Настройки генерации */}
        {!letter && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Настройки письма
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Тон письма</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={preferences.tone}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    tone: e.target.value as any 
                  }))}
                >
                  <option value="professional">Профессиональный</option>
                  <option value="friendly">Дружелюбный</option>
                  <option value="formal">Формальный</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Длина письма</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={preferences.length}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    length: e.target.value as any 
                  }))}
                >
                  <option value="short">Краткое (1-2 абзаца)</option>
                  <option value="medium">Среднее (3-4 абзаца)</option>
                  <option value="long">Подробное (5+ абзацев)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Дополнительные инструкции</label>
              <Textarea
                placeholder="Например: подчеркнуть опыт работы с React, упомянуть готовность к переезду..."
                value={preferences.customInstructions}
                onChange={(e) => setPreferences(prev => ({ 
                  ...prev, 
                  customInstructions: e.target.value 
                }))}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}

        {/* Кнопка генерации */}
        {!letter && (
          <div className="text-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Создать сопроводительное письмо</h3>
            <p className="text-muted-foreground mb-4">
              AI создаст персонализированное письмо на основе вакансии и вашего резюме
            </p>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || isLoading}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Генерируем письмо...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Создать письмо
                </>
              )}
            </Button>
          </div>
        )}

        {/* Редактор письма */}
        {letter && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Edit className="h-4 w-4" />
                {isEditing ? 'Редактирование' : 'Содержание письма'}
              </h4>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      onClick={handleSave}
                      variant="outline"
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                    >
                      Отмена
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              disabled={!isEditing}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Содержание сопроводительного письма..."
            />

            {/* Действия с письмом */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Копировать
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Пересоздать
              </Button>
            </div>
          </div>
        )}

        {/* Информация о письме */}
        {letter && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold">Информация о письме</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Тон:</span>
                <Badge className={getToneColor(letter.tone)}>
                  {getToneText(letter.tone)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Длина:</span>
                <Badge className={getLengthColor(letter.length)}>
                  {getLengthText(letter.length)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Персонализировано:</span>
                <Badge variant={letter.personalized ? "default" : "secondary"}>
                  {letter.personalized ? "Да" : "Нет"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Символов:</span>
                <span className="font-medium">
                  {(isEditing ? editedContent : letter.content).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
