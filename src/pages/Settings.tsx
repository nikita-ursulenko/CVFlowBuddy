import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AISettings } from "@/components/ai/AISettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { Bot, Mail, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Настройки</h1>
        <p className="text-sm md:text-base text-muted-foreground">Конфигурация AI, Email и системы</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Система
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4 pt-4">
          <AISettings />
        </TabsContent>

        <TabsContent value="email" className="space-y-4 pt-4">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="system" className="space-y-4 pt-4">
          {/* System Settings */}
          <Card className="p-4 md:p-6">
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Системные настройки</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Общие настройки панели управления и тема интерфейса
                </p>
              </div>

              <Separator />

              <div className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-sm md:text-base">Тема интерфейса</Label>
                  <Select 
                    value={theme} 
                    onValueChange={(v) => setTheme(v as any)}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Светлая</SelectItem>
                      <SelectItem value="dark">Тёмная</SelectItem>
                      <SelectItem value="system">Системная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
