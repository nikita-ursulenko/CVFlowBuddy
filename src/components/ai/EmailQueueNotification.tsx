import { useEmails } from "@/hooks/useEmails";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, ExternalLink, Inbox, Clock, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function EmailQueueNotification() {
  const { pendingEmails, sendEmail, isSending } = useEmails();
  const count = pendingEmails.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10 rounded-xl">
          <Mail className="h-4 w-4 md:h-5 md:w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in duration-300">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] md:w-[380px] p-0 shadow-2xl border-border/50 backdrop-blur-xl bg-card/95">
        <DropdownMenuLabel className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <span className="font-bold text-base">Очередь писем</span>
          </div>
          {count > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
              {count} в очереди
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[350px]">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">Очередь пуста</p>
              <p className="text-xs text-muted-foreground mt-1 px-4">
                Запустите агента, чтобы подготовить письма для отправки
              </p>
            </div>
          ) : (
            <div className="py-2">
              {pendingEmails.slice(0, 10).map((email, index) => (
                <div 
                  key={email.id} 
                  className={cn(
                    "px-4 py-3 hover:bg-muted/50 transition-colors group relative",
                    index !== pendingEmails.length - 1 && "border-b border-border/40"
                  )}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold truncate leading-none mb-1">
                          {email.company}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {email.jobTitle}
                        </p>
                      </div>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-muted/30 border-none shrink-0">
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        Готово
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1">
                      <Button
                        size="sm"
                        className="h-8 flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-[11px] font-bold shadow-md shadow-blue-500/20 py-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          sendEmail(email.id);
                        }}
                        disabled={isSending}
                      >
                        <Send className="h-3 w-3 mr-1.5" />
                        Отправить
                      </Button>
                      {email.jobUrl && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 hover:bg-primary/5 hover:text-primary transition-colors"
                          onClick={() => window.open(email.jobUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button 
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold text-xs transition-all duration-300" 
            asChild
          >
            <Link to="/ai">
              <Zap className="h-4 w-4 mr-2" />
              Открыть все письма в разделе AI
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
