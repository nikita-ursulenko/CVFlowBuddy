import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Eye, Trash2, Download } from "lucide-react";

const cvData = [
  { id: 1, name: "CV_Senior_Developer.pdf", date: "15.01.2025", sites: ["hh.ru", "habr.com"], status: "active", size: "245 KB" },
  { id: 2, name: "CV_Frontend_Engineer.pdf", date: "12.01.2025", sites: ["superjob.ru"], status: "active", size: "198 KB" },
  { id: 3, name: "CV_Full_Stack.pdf", date: "08.01.2025", sites: ["hh.ru", "zarplata.ru"], status: "inactive", size: "312 KB" },
];

export default function CV() {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">CV и Документы</h1>
          <p className="text-sm md:text-base text-muted-foreground">Управление резюме и файлами</p>
        </div>
        <Button className="gap-2 w-full md:w-auto" size="sm">
          <Upload className="h-4 w-4" />
          Загрузить CV
        </Button>
      </div>

      {/* Upload Area */}
      <Card className="p-6 md:p-8">
        <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4 text-center">
          <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          </div>
          <div className="space-y-1 md:space-y-2">
            <h3 className="text-base md:text-lg font-semibold">Загрузите ваше резюме</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Поддерживаются форматы: PDF, DOCX (до 10MB)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 text-sm" size="sm">
              <Upload className="h-4 w-4" />
              Выбрать файл
            </Button>
            <Button variant="outline" className="gap-2 text-sm hidden sm:flex" size="sm">
              <FileText className="h-4 w-4" />
              Перетащите файл сюда
            </Button>
          </div>
        </div>
      </Card>

      {/* CV List */}
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-lg md:text-xl font-semibold">Загруженные резюме</h2>
        <div className="grid gap-3 md:gap-4">
          {cvData.map((cv) => (
            <Card key={cv.id} className="p-4 md:p-6 transition-all hover:shadow-md">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
                <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2 min-w-0 flex-1">
                    <div className="space-y-0.5 md:space-y-1">
                      <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{cv.name}</h3>
                      <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                        <span>{cv.date}</span>
                        <span>•</span>
                        <span>{cv.size}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-2">
                      {cv.sites.map((site) => (
                        <Badge key={site} variant="secondary" className="text-xs">
                          {site}
                        </Badge>
                      ))}
                      <Badge
                        variant={cv.status === "active" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {cv.status === "active" ? "Активно" : "Неактивно"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9 flex-1 sm:flex-none">
                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9 flex-1 sm:flex-none">
                    <Download className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9 text-destructive flex-1 sm:flex-none">
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
