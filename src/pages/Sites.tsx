import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Bot, Sparkles, Clock, Globe } from "lucide-react";
import { AgentControl } from "@/components/agents/AgentControl";
import { createLucruConfig } from "@/lib/config/lucru-config";
import { LucruMdConfig } from "@/lib/config/lucru-config";


export default function Sites() {
  const [lucruConfig, setLucruConfig] = useState<LucruMdConfig>(createLucruConfig({}));
  const [sessionUpdateTrigger, setSessionUpdateTrigger] = useState(0);

  useEffect(() => {
    // Загружаем сохраненную конфигурацию из localStorage
    const savedConfig = localStorage.getItem('cvflow_lucru_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        
        // Миграция: добавляем settings если их нет
        if (!parsed.settings) {
          parsed.settings = {
            maxCVDaily: 20,
            intervalHours: 4,
            headless: true
          };
          console.log('✅ Конфигурация обновлена: добавлено поле settings');
        }
        
        setLucruConfig(parsed);
        
        // Сохраняем обновлённую конфигурацию
        localStorage.setItem('cvflow_lucru_config', JSON.stringify(parsed));
      } catch (error) {
        console.error('Failed to load saved config:', error);
        // При ошибке используем конфигурацию по умолчанию
        setLucruConfig(createLucruConfig({}));
      }
    }
  }, []);

  const handleConfigSave = (newConfig: LucruMdConfig) => {
    setLucruConfig(newConfig);
    localStorage.setItem('cvflow_lucru_config', JSON.stringify(newConfig));
  };

  const handleSessionUpdate = () => {
    setSessionUpdateTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              Автоагенты
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Управление автоматическими агентами
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-green-700">1 активен</span>
          </div>
        </div>
      </div>

      {/* Agents Section */}
      <div className="space-y-4">
          <div className="grid gap-6">
            {/* Lucru.md Agent */}
            <AgentControl
              config={lucruConfig}
              onConfigChange={handleConfigSave}
              onSessionUpdate={handleSessionUpdate}
            />
            
            {/* Placeholder for future agents */}
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 hover:shadow-xl transition-all duration-300">
              {/* Декоративные элементы */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full -translate-y-12 translate-x-12"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-green-100/20 to-blue-100/20 rounded-full translate-y-8 -translate-x-8"></div>
              
              <div className="relative p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 shadow-lg">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
                  <Clock className="h-6 w-6 text-blue-600" />
                  Больше агентов скоро
                </h3>
                <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
                  Мы работаем над добавлением агентов для других популярных сайтов поиска работы
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200/50">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">LinkedIn</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200/50">
                    <Globe className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">Indeed</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200/50">
                    <Globe className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Glassdoor</span>
                  </div>
                </div>
                
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 rounded-full">
                  <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span className="text-sm font-semibold text-blue-700">В разработке</span>
                </div>
              </div>
            </Card>
          </div>
      </div>

    </div>
  );
}