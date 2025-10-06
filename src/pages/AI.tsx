import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Copy, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const recentLetters = [
  {
    id: 1,
    vacancy: "Senior React Developer",
    site: "hh.ru",
    date: "15.01.2025",
    preview: "Здравствуйте! Меня заинтересовала ваша вакансия Senior React Developer...",
  },
  {
    id: 2,
    vacancy: "Frontend Engineer",
    site: "habr.com",
    date: "14.01.2025",
    preview: "Добрый день! Хочу предложить свою кандидатуру на позицию Frontend Engineer...",
  },
  {
    id: 3,
    vacancy: "Full Stack Developer",
    site: "superjob.ru",
    date: "12.01.2025",
    preview: "Уважаемый работодатель! С большим интересом рассмотрел вашу вакансию...",
  },
];

export default function AI() {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">AI Письма</h1>
        <p className="text-sm md:text-base text-muted-foreground">Генерация сопроводительных писем с помощью AI</p>
      </div>

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

        {/* Generator */}
        <Card className="p-4 md:p-6">
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold">Генератор письма</h3>
              <Button variant="outline" size="sm" className="gap-2 text-xs md:text-sm h-8 md:h-9">
                <RefreshCw className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Новое письмо</span>
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vacancy" className="text-sm md:text-base">Описание вакансии</Label>
              <Textarea
                id="vacancy"
                placeholder="Вставьте описание вакансии..."
                className="min-h-[80px] md:min-h-[100px] text-sm"
              />
            </div>

            <Button className="w-full gap-2" size="sm">
              <Sparkles className="h-4 w-4" />
              Сгенерировать письмо
            </Button>
          </div>
        </Card>
      </div>

      {/* Result */}
      <Card className="p-4 md:p-6">
        <div className="space-y-2">
          <Label htmlFor="result" className="text-sm md:text-base">Результат</Label>
          <div className="relative">
            <Textarea
              id="result"
              placeholder="Сгенерированное письмо появится здесь..."
              className="min-h-[150px] md:min-h-[200px] pr-12 text-sm"
              value="Здравствуйте!&#10;&#10;С большим интересом рассмотрел вашу вакансию Senior React Developer. Имею 5+ лет опыта разработки современных веб-приложений с использованием React, TypeScript и Redux.&#10;&#10;Мои ключевые навыки:&#10;• Глубокое понимание React и его экосистемы&#10;• Опыт построения масштабируемых архитектур&#10;• Работа с современными инструментами разработки&#10;&#10;Буду рад обсудить возможность сотрудничества.&#10;&#10;С уважением."
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 md:h-8 md:w-8"
            >
              <Copy className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Letters */}
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-lg md:text-xl font-semibold">Последние письма</h2>
        <div className="grid gap-3 md:gap-4">
          {recentLetters.map((letter) => (
            <Card key={letter.id} className="p-4 md:p-6 transition-all hover:shadow-md">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{letter.vacancy}</h3>
                    <div className="mt-0.5 md:mt-1 flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <span>{letter.site}</span>
                      <span>•</span>
                      <span>{letter.date}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
                    <Copy className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{letter.preview}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
