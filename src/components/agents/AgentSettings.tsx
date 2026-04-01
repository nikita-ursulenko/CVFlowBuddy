import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentSettings } from '@/types/agent-states';
import { Clock, Settings, Zap } from 'lucide-react';
import { toast } from 'sonner';

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
    headless: settings.headless ?? true // По умолчанию включен
  });

  // Обновляем formData когда открывается диалог или меняются settings
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Загружаем настройки в форму:', settings);
      setFormData({
        ...settings,
        headless: settings.headless ?? true
      });
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    console.log('💾 Сохраняем настройки агента:', formData);
    onSave(formData);
    toast.success(`✅ Настройки сохранены: ${formData.maxCVDaily} CV за запуск, интервал ${formData.intervalHours}ч`);
    onClose();
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
