import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentSettings } from '@/types/agent-states';
import { Clock, Settings, Zap, Search, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { agentServerAPI } from '@/lib/api/agent-server';

interface AgentSettingsProps {
  settings: AgentSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AgentSettings) => void;
}

export const AgentSettingsDialog: React.FC<AgentSettingsProps> = ({
  settings,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<AgentSettings>({
    ...settings,
    headless: settings.headless ?? true,
    selectedCategories: settings.selectedCategories || [],
    availableCategories: settings.availableCategories || []
  });
  const [isFetching, setIsFetching] = useState(false);

  // Обновляем formData ТОЛЬКО при открытии диалога
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Загружаем настройки в форму:', settings);
      setFormData({
        ...settings,
        headless: settings.headless ?? true,
        selectedCategories: settings.selectedCategories || [],
        availableCategories: settings.availableCategories || []
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Только isOpen, чтобы не сбрасывать formData при внешних обновлениях settings

  const handleSave = () => {
    if (!formData.selectedCategories || formData.selectedCategories.length === 0) {
      toast.error('❌ Выберите хотя бы одну категорию для работы агента');
      return;
    }
    console.log('💾 Сохраняем настройки агента:', formData);
    onSave(formData);
    toast.success(`✅ Настройки сохранены: ${formData.maxCVDaily} CV, ${formData.selectedCategories.length} катег.`);
    onClose();
  };

  const handleFetchCategories = async () => {
    setIsFetching(true);
    try {
      const result = await agentServerAPI.getLucruCategories();
      if (result.success && result.categories) {
        setFormData(prev => ({
          ...prev,
          availableCategories: result.categories
        }));
        toast.success(`✅ Найдено ${result.categories.length} категорий`);
      } else {
        toast.error(result.message || 'Не удалось загрузить категории');
      }
    } catch (error) {
      toast.error('Ошибка при обращении к серверу');
    } finally {
      setIsFetching(false);
    }
  };

  const toggleCategory = (href: string) => {
    const current = formData.selectedCategories || [];
    if (current.includes(href)) {
      setFormData(prev => ({
        ...prev,
        selectedCategories: current.filter(h => h !== href)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedCategories: [...current, href]
      }));
    }
  };

  const handleInputChange = (field: keyof AgentSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки агента
          </DialogTitle>
          <DialogDescription>
            Настройте параметры автоматической работы агента
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Интервал проверки */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Интервал проверки
            </Label>
            <Select 
              value={formData.intervalHours.toString()} 
              onValueChange={(value) => handleInputChange('intervalHours', parseFloat(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">Раз в 30 минут</SelectItem>
                <SelectItem value="1">Каждый час</SelectItem>
                <SelectItem value="2">Каждые 2 часа</SelectItem>
                <SelectItem value="3">Каждые 3 часа</SelectItem>
                <SelectItem value="6">Каждые 6 часов</SelectItem>
                <SelectItem value="12">Каждые 12 часов</SelectItem>
                <SelectItem value="24">Раз в день</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Максимум CV за запуск */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Максимум CV за один запуск
            </Label>
            <p className="text-xs text-muted-foreground">
              Сколько вакансий обрабатывать за один запуск агента
            </p>
            <Select 
              value={formData.maxCVDaily.toString()} 
              onValueChange={(value) => handleInputChange('maxCVDaily', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 CV</SelectItem>
                <SelectItem value="10">10 CV</SelectItem>
                <SelectItem value="20">20 CV</SelectItem>
                <SelectItem value="50">50 CV</SelectItem>
                <SelectItem value="100">100 CV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Дополнительные настройки */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Фоновый режим</Label>
                <p className="text-xs text-muted-foreground">
                  Работать без открытия браузера (рекомендуется)
                </p>
              </div>
              <Switch
                checked={formData.headless}
                onCheckedChange={(checked) => handleInputChange('headless', checked)}
              />
            </div>
          </div>

          {/* Категории вакансий */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Категории вакансий
              </Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFetchCategories}
                disabled={isFetching}
                className="h-8 text-xs font-semibold bg-accent/30 hover:bg-accent/50"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Search className="h-3 w-3 mr-2" />
                    Обновить список
                  </>
                )}
              </Button>
            </div>

            {formData.availableCategories && formData.availableCategories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                  Выберите рубрики ({formData.selectedCategories?.length || 0} выбрано)
                </p>
                <ScrollArea className="h-[180px] w-full rounded-md border border-border/50 bg-muted/20 p-3">
                  <div className="space-y-3">
                    {formData.availableCategories.map((cat) => (
                      <div key={cat.href} className="flex items-center space-x-2 group">
                        <Checkbox 
                          id={`cat-${cat.href}`} 
                          checked={formData.selectedCategories?.includes(cat.href)}
                          onCheckedChange={() => toggleCategory(cat.href)}
                          className="border-primary/50 data-[state=checked]:bg-primary"
                        />
                        <label
                          htmlFor={`cat-${cat.href}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer group-hover:text-primary transition-colors"
                        >
                          {cat.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/10">
                <p className="text-sm text-muted-foreground mb-3">
                  Список категорий пуст. Нажмите кнопку выше, чтобы загрузить категории с lucru.md.
                </p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleFetchCategories}
                  disabled={isFetching}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Проверить категории
                </Button>
              </div>
            )}
            
            {formData.selectedCategories && formData.selectedCategories.length === 0 && (
              <p className="text-xs text-destructive font-medium bg-destructive/5 p-2 rounded border border-destructive/10">
                ⚠️ Пожалуйста, выберите хотя бы одну категорию. Без этого агент не сможет искать вакансии.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
