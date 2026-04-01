import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Send, Mail, ExternalLink, CheckCircle2, Clock, Copy, Inbox } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";

export default function AI() {
  const { getEmails, sendEmail } = useAI();
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  const fetchEmails = async () => {
    try {
      setIsLoadingEmails(true);
      const data = await getEmails();
      setEmails(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    // Автообновление каждые 10 сек — чтобы письма появлялись сразу после работы агента
    const interval = setInterval(fetchEmails, 10000);
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
    } catch {
      toast.error("Произошла ошибка");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Текст скопирован");
  };

  const pending = emails.filter(e => e.status !== 'sent');
  const sent = emails.filter(e => e.status === 'sent');

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Письма</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Очередь сопроводительных писем, сгенерированных агентом
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              {pending.length} новых
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEmails}
            disabled={isLoadingEmails}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Email list */}
      {emails.length === 0 ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Очередь пуста</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Запустите агента — он найдёт HR-почту по каждой компании и сгенерирует уникальное письмо
            </p>
          </div>
          <p className="text-xs text-muted-foreground opacity-60">
            Автообновление каждые 10 сек
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card
              key={email.id}
              className={`p-4 md:p-5 transition-all border-l-4 ${
                email.status === 'sent'
                  ? 'border-l-green-500 opacity-70'
                  : 'border-l-blue-500'
              }`}
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Status + timestamp */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {email.status === 'sent' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Отправлено
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 shrink-0">
                        <Clock className="h-3 w-3 mr-1" /> Ожидает
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(email.timestamp).toLocaleString('ru-RU')}
                    </span>
                  </div>

                  {/* Company + title */}
                  <h3 className="font-bold text-base md:text-lg leading-tight truncate">
                    {email.company} — {email.jobTitle}
                  </h3>

                  {/* Email address */}
                  <div className="flex flex-wrap gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate max-w-[200px]">{email.email}</span>
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

                  {/* Subject */}
                  {email.subject && (
                    <p className="text-xs text-muted-foreground font-medium">
                      Тема: {email.subject}
                    </p>
                  )}

                  {/* Letter preview */}
                  <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/20 p-3 rounded-md border italic">
                    "{email.content}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 justify-end shrink-0">
                  <Button
                    size="sm"
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
          ))}

          {/* Sent count footer */}
          {sent.length > 0 && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              ✅ Уже отправлено: {sent.length} писем
            </p>
          )}
        </div>
      )}
    </div>
  );
}
