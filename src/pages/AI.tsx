import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, RefreshCw, Send, Mail, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";

export default function AI() {
  const { getEmails, sendEmail, isLoading: isAILoading } = useAI();
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");

  const fetchEmails = async () => {
    try {
      setIsLoadingEmails(true);
      const data = await getEmails();
      setEmails(data);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    // Интервал обновления очереди
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (emailId: string) => {
    try {
      const result = await sendEmail(emailId);
      if (result.success) {
        toast.success(result.message || "Письмо отправлено!");
        fetchEmails();
      } else {
        toast.error(result.message || "Ошибка при отправке");
      }
    } catch (error) {
      toast.error("Произошла ошибка");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Текст скопирован");
  };

  const newEmailsCount = emails.filter(e => e.status === 'new').length;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">AI Письма</h1>
          <p className="text-sm md:text-base text-muted-foreground">Управление сопроводительными письмами и очередью отправки</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchEmails} 
          disabled={isLoadingEmails}
          className="w-fit gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
          Обновить список
        </Button>
      </div>

      <Tabs defaultValue="generator" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="generator" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Генератор
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-2">
            <Mail className="h-4 w-4" />
            Очередь / История
            {newEmailsCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 h-5 min-w-[20px] flex items-center justify-center">
                {newEmailsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Settings */}
            <Card className="p-4 md:p-6">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 md:space-y-1">
                    <Label className="text-sm md:text-base font-semibold">Автоматическая генерация писем</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      AI будет создавать персонализированные письма для каждой вакансии
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style" className="text-sm md:text-base">Стиль письма</Label>
                  <Select defaultValue="formal">
                    <SelectTrigger id="style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Формальный</SelectItem>
                      <SelectItem value="friendly">Дружелюбный</SelectItem>
                      <SelectItem value="brief">Краткий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Generator Form */}
            <Card className="p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold">Ручной генератор</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vacancy" className="text-sm md:text-base">Описание вакансии</Label>
                  <Textarea
                    id="vacancy"
                    placeholder="Вставьте описание вакансии..."
                    className="min-h-[100px] text-sm"
                  />
                </div>

                <Button className="w-full gap-2" size="sm">
                  <Sparkles className="h-4 w-4" />
                  Сгенерировать письмо
                </Button>
              </div>
            </Card>
          </div>

          {/* Generator Result */}
          <Card className="p-4 md:p-6">
            <div className="space-y-2">
              <Label htmlFor="result" className="text-sm md:text-base">Последний результат</Label>
              <div className="relative">
                <Textarea
                  id="result"
                  readOnly
                  placeholder="Сгенерированное письмо появится здесь..."
                  className="min-h-[150px] md:min-h-[200px] pr-12 text-sm bg-muted/30"
                  value="Здравствуйте!&#10;&#10;С большим интересом рассмотрел вашу вакансию Senior React Developer. Имею 5+ лет опыта разработки современных веб-приложений с использованием React, TypeScript и Redux.&#10;&#10;Мои ключевые навыки:&#10;• Глубокое понимание React и его экосистемы&#10;• Опыт построения масштабируемых архитектур&#10;• Работа с современными инструментами разработки&#10;&#10;Буду рад обсудить возможность сотрудничества.&#10;&#10;С уважением."
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 md:h-8 md:w-8"
                  onClick={() => copyToClipboard("Здравствуйте!...")}
                >
                  <Copy className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <div className="grid gap-4">
            {emails.length === 0 ? (
              <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">Очередь пуста</h3>
                  <p className="text-sm text-muted-foreground">Запустите агента, чтобы найти вакансии и сгенерировать письма</p>
                </div>
              </Card>
            ) : (
              emails.map((email) => (
                <Card key={email.id} className={`p-4 md:p-6 transition-all border-l-4 ${email.status === 'sent' ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {email.status === 'sent' ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Отправлено
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                <Clock className="h-3 w-3 mr-1" /> Новое
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(email.timestamp).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg text-foreground leading-tight">
                            {email.company} — {email.jobTitle}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          <Mail className="h-3.5 w-3.5" />
                          {email.email}
                        </div>
                        {email.jobUrl && (
                          <a 
                            href={email.jobUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Вакансия
                          </a>
                        )}
                      </div>

                      <div className="relative">
                        <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/20 p-3 rounded-md border italic">
                          "{email.content}"
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="default"
                        className="gap-2"
                        disabled={email.status === 'sent'}
                        onClick={() => handleSend(email.id)}
                      >
                        <Send className="h-4 w-4" />
                        Отправить
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => copyToClipboard(email.content)}
                      >
                        <Copy className="h-4 w-4" />
                        Копировать
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
