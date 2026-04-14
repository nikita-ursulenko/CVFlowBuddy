import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ExternalLink, 
  Mail, 
  Briefcase, 
  Calendar, 
  Globe, 
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Banknote
} from "lucide-react";
import { StatsAPI } from "@/lib/api/stats-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Vacancy {
  id: string;
  vacancy: string;
  site: string;
  status: string;
  date: string;
  timestamp: number;
  url?: string;
  jobTitle?: string;
  company?: string;
  salary?: string;
  emailContent?: {
    subject: string;
    body: string;
    to: string;
  };
}

export default function VacancyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadVacancy();
  }, [id]);

  const loadVacancy = async () => {
    setLoading(true);
    try {
      const data = await StatsAPI.getAppliedVacancies();
      const found = data.find((v: any) => v.id === id);
      setVacancy(found || null);
    } catch (error) {
      console.error("Failed to load vacancy details:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Скопировано в буфер обмена");
    setTimeout(() => setCopied(false), 2000);
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case 'sent':
      case 'email_sent':
      case 'success':
        return { label: "Отправлено", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 };
      case 'email_generated':
        return { label: "Черновик", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Clock };
      case 'error':
        return { label: "Ошибка", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle };
      default:
        return { label: status, color: "bg-muted text-muted-foreground border-border", icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold mb-2">Вакансия не найдена</h2>
        <Button onClick={() => navigate('/vacancies')} variant="outline">Вернуться к списку</Button>
      </div>
    );
  }

  const status = statusConfig(vacancy.status);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Navigation */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/vacancies')} 
        className="group hover:bg-transparent -ml-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Назад к списку
      </Button>

      {/* Hero Section */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <Card className="relative p-8 md:p-12 border-border/50 bg-card/80 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl border">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className={cn("px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest border", status.color)}>
                  <status.icon className="mr-2 h-3.5 w-3.5" />
                  {status.label}
                </Badge>
                <Badge variant="outline" className="px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest border-border bg-background/50">
                  <Globe className="mr-2 h-3.5 w-3.5" />
                  {vacancy.site}
                </Badge>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                  {vacancy.jobTitle || vacancy.vacancy}
                </h1>
                <p className="text-xl md:text-2xl font-bold text-primary flex items-center gap-2">
                  <Briefcase className="h-6 w-6 opacity-70" />
                  {vacancy.company || "Компания не указана"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-semibold">
                <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-2xl">
                  <Calendar className="h-4 w-4" />
                  <span>Применено: {vacancy.date}</span>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-2xl border border-primary/10">
                  <Banknote className="h-4 w-4" />
                  <span className="font-bold">{vacancy.salary || "Зарплата не указана"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {vacancy.url && (
                <Button 
                  size="lg"
                  className="rounded-2xl font-bold h-14 px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-all w-full md:w-auto"
                  onClick={() => window.open(vacancy.url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Открыть вакансию
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-md rounded-3xl shadow-xl border">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Контакты
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-1">Email работодателя</label>
                <div className="flex items-center gap-2 group/input">
                  <div className="flex-1 bg-background/50 border border-border/50 rounded-2xl p-4 flex items-center justify-between group-hover/input:border-primary/30 transition-colors shadow-sm">
                    <span className="font-bold text-sm truncate pr-2">
                      {vacancy.emailContent?.to || "Не указан"}
                    </span>
                    {vacancy.emailContent?.to && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary rounded-xl"
                        onClick={() => copyToClipboard(vacancy.emailContent!.to)}
                      >
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Режим отправки</span>
                  <span className="font-bold bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
                    {vacancy.site === 'Email' ? 'Direct Email' : 'Platform Apply'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {vacancy.emailContent ? (
            <div className="space-y-6">
              <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-md rounded-[2.5rem] shadow-2xl border">
                <div className="p-8 md:p-10 border-b border-border/20 bg-muted/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">Сопроводительное письмо</h3>
                      <p className="text-muted-foreground font-medium">Текст, отправленный работодателю</p>
                    </div>
                  </div>
                  
                  <div className="bg-background/80 rounded-2xl p-6 border border-border/50 shadow-inner">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Тема письма</span>
                      <span className="text-lg font-bold text-foreground">{vacancy.emailContent.subject}</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10">
                  <div className="relative group">
                     {/* Decorative quote marks */}
                     <div className="absolute -top-4 -left-2 text-8xl text-primary/5 font-serif pointer-events-none">“</div>
                     
                     <div className="relative prose prose-lg dark:prose-invert max-w-none">
                        <div className="text-foreground leading-[1.8] whitespace-pre-wrap font-medium text-lg">
                          {vacancy.emailContent.body}
                        </div>
                     </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-12 flex flex-col items-center justify-center text-center border-border/30 bg-card/30 rounded-[2.5rem] border-2 border-dashed">
                <Mail className="h-16 w-16 text-muted-foreground/20 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Текст письма отсутствует</h3>
                <p className="text-muted-foreground font-medium max-w-xs">
                  Для этой вакансии не было сгенерировано отдельное письмо (отклик выполнен напрямую на сайте).
                </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
