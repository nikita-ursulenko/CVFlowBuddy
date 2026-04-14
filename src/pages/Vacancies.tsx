import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Briefcase, 
  Calendar, 
  Mail, 
  ExternalLink, 
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Banknote
} from "lucide-react";
import { StatsAPI } from "@/lib/api/stats-api";
import { cn } from "@/lib/utils";

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
}

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadVacancies();
  }, []);

  const loadVacancies = async () => {
    setLoading(true);
    try {
      const data = await StatsAPI.getAppliedVacancies();
      setVacancies(data);
    } catch (error) {
      console.error("Failed to load vacancies:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVacancies = vacancies.filter(v => 
    v.vacancy.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'sent':
      case 'email_sent':
      case 'success':
        return { label: "Отправлено", color: "bg-success text-success", icon: CheckCircle2 };
      case 'email_generated':
        return { label: "Черновик", color: "bg-purple-500 text-purple-500", icon: Clock };
      case 'error':
        return { label: "Ошибка", color: "bg-destructive text-destructive", icon: AlertCircle };
      default:
        return { label: status, color: "bg-muted text-muted-foreground", icon: Clock };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-6 w-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Мои отклики
            </h1>
          </div>
          <p className="text-muted-foreground font-medium text-lg">
            История всех вакансий, на которые было отправлено резюме
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadVacancies}
            disabled={loading}
            className="rounded-xl border-border hover:bg-muted font-bold h-11 px-4 shadow-sm"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4 text-primary", loading && "animate-spin")} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
          <Input 
            placeholder="Поиск по вакансии или компании..." 
            className="pl-11 h-12 bg-background/50 border-none rounded-2xl text-lg font-medium focus-visible:ring-2 focus-visible:ring-primary/20 shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Grid of vacancies */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 w-full animate-pulse bg-muted/50 rounded-3xl" />
          ))
        ) : filteredVacancies.length > 0 ? (
          filteredVacancies.map((vacancy) => {
            const status = getStatusConfig(vacancy.status);
            
            return (
              <Card 
                key={vacancy.id}
                className="group relative overflow-hidden transition-all duration-500 border-border/50 hover:shadow-2xl rounded-3xl border bg-card/60 backdrop-blur-md hover:border-primary/30"
                onClick={() => navigate(`/vacancies/${vacancy.id}`)}
              >
                {/* Visual accent */}
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full transition-all duration-500",
                  status.label === "Отправлено" ? "bg-success" : "bg-primary"
                )} />

                <div className="p-6 md:p-8 cursor-pointer">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground group-hover:scale-110 transition-transform duration-500 shadow-sm border border-border/10">
                        <Briefcase className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {vacancy.jobTitle || vacancy.vacancy}
                        </h3>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="text-foreground/80">{vacancy.company || vacancy.site}</span>
                          </span>
                          <span className="h-1 w-1 bg-muted-foreground/30 rounded-full hidden sm:block" />
                          <span className="flex items-center gap-1.5 text-primary/80">
                            <Banknote className="h-3.5 w-3.5" />
                            {vacancy.salary || "Не указана"}
                          </span>
                          <span className="h-1 w-1 bg-muted-foreground/30 rounded-full hidden sm:block" />
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {vacancy.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto md:ml-0">
                      <Badge variant="outline" className={cn("px-4 py-1.5 rounded-full border-current shadow-sm h-9 font-bold text-xs uppercase tracking-wider backdrop-blur-sm", status.color)}>
                        <status.icon className="mr-2 h-4 w-4 animate-pulse" />
                        {status.label}
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        {vacancy.url && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors shadow-sm bg-background/50 border border-border/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(vacancy.url, '_blank');
                            }}
                          >
                            <ExternalLink className="h-5 w-5" />
                          </Button>
                        )}
                        <Button 
                          variant="secondary"
                          size="icon" 
                          className="h-10 w-10 rounded-xl transition-all shadow-sm border border-border/10 hover:scale-110"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-24 bg-card/30 rounded-[3rem] border-2 border-dashed border-border/50">
            <Briefcase className="h-20 w-20 mx-auto mb-6 text-muted-foreground/20" />
            <h3 className="text-2xl font-bold text-foreground mb-3">Совсем пусто</h3>
            <p className="text-muted-foreground max-w-md mx-auto font-medium">
              Похоже, вы еще не отправляли резюме. Начните работу в разделе «Сайты» или «Письма», и ваши отклики появятся здесь.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
