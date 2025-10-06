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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Письма</h1>
        <p className="text-muted-foreground">Генерация сопроводительных писем с помощью AI</p>
      </div>

      {/* Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Автоматическая генерация писем</Label>
              <p className="text-sm text-muted-foreground">
                AI будет создавать персонализированные письма для каждой вакансии
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Стиль письма</Label>
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
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Генератор письма</h3>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Новое письмо
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vacancy">Описание вакансии</Label>
            <Textarea
              id="vacancy"
              placeholder="Вставьте описание вакансии..."
              className="min-h-[100px]"
            />
          </div>

          <Button className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Сгенерировать письмо
          </Button>

          <div className="space-y-2">
            <Label htmlFor="result">Результат</Label>
            <div className="relative">
              <Textarea
                id="result"
                placeholder="Сгенерированное письмо появится здесь..."
                className="min-h-[200px]"
                value="Здравствуйте!\n\nС большим интересом рассмотрел вашу вакансию Senior React Developer. Имею 5+ лет опыта разработки современных веб-приложений с использованием React, TypeScript и Redux.\n\nМои ключевые навыки:\n• Глубокое понимание React и его экосистемы\n• Опыт построения масштабируемых архитектур\n• Работа с современными инструментами разработки\n\nБуду рад обсудить возможность сотрудничества.\n\nС уважением."
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Letters */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Последние письма</h2>
        <div className="grid gap-4">
          {recentLetters.map((letter) => (
            <Card key={letter.id} className="p-6 transition-all hover:shadow-md">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{letter.vacancy}</h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{letter.site}</span>
                      <span>•</span>
                      <span>{letter.date}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{letter.preview}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
