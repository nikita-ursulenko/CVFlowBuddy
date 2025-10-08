import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle, Upload, Download, AlertTriangle } from 'lucide-react';
import { agentServerAPI } from '@/lib/api/agent-server';
import { toast } from 'sonner';

interface CVSyncProps {
  cvFile?: any;
  isLoggedIn?: boolean;
  sessionId?: string;
  cvExistsOnSite?: boolean | null; // null = не проверено, true = есть, false = нет
  onSyncComplete?: () => void;
}

interface SyncStatus {
  localCV: boolean;
  websiteCV: boolean;
  isSynced: boolean;
  lastSync?: string;
}

export const CVSync: React.FC<CVSyncProps> = ({ cvFile, isLoggedIn, sessionId, cvExistsOnSite, onSyncComplete }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncData, setSyncData] = useState<SyncStatus>({
    localCV: !!cvFile,
    websiteCV: cvExistsOnSite === true,
    isSynced: !!cvFile && cvExistsOnSite === true
  });

  const handleSyncCV = async () => {
    if (!cvFile) {
      toast.error('Сначала загрузите CV файл');
      return;
    }

    if (!isLoggedIn) {
      toast.error('Сначала войдите в аккаунт Lucru.md');
      return;
    }

    if (!sessionId) {
      toast.error('Сессия не найдена. Войдите в аккаунт заново.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus('Начинаем синхронизацию CV...');

    try {
      // Шаг 1: Проверка локального CV
      setSyncProgress(20);
      setSyncStatus('Проверяем локальный CV файл...');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!cvFile) {
        throw new Error('Локальный CV файл не найден');
      }

      // Шаг 2: Синхронизация через API сервер
      setSyncProgress(50);
      setSyncStatus('Синхронизируем с сайтом Lucru.md...');
      
      const result = await agentServerAPI.syncCV(sessionId, {
        fileName: cvFile.name,
        filePath: cvFile.filePath
      });

      setSyncProgress(90);
      setSyncStatus('Завершаем синхронизацию...');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (result.success) {
        // Шаг 3: Завершение синхронизации
        setSyncProgress(100);
        setSyncStatus('Синхронизация завершена!');

        // Обновляем статус
        setSyncData({
          localCV: true,
          websiteCV: true,
          isSynced: true,
          lastSync: new Date().toLocaleString('ru-RU')
        });

        toast.success(result.message);
        onSyncComplete?.();
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Ошибка синхронизации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setSyncStatus('Ошибка синхронизации');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const handleCheckSync = async () => {
    if (!sessionId) {
      toast.error('Сессия не найдена. Войдите в аккаунт заново.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus('Проверяем статус CV на сайте...');

    try {
      setSyncProgress(50);
      
      // Проверяем через API
      const result = await agentServerAPI.checkCVStatus(sessionId);

      setSyncProgress(100);
      setSyncStatus('Проверка завершена');

      // Обновляем статус
      const newSyncData = {
        localCV: !!cvFile,
        websiteCV: result.cvExists,
        isSynced: !!cvFile && result.cvExists,
        lastSync: new Date().toLocaleString('ru-RU')
      };

      setSyncData(newSyncData);

      if (newSyncData.isSynced) {
        toast.success('✅ CV уже загружено на Lucru.md!');
      } else {
        toast.warning('⚠️ CV не найдено на Lucru.md, требуется синхронизация');
      }

    } catch (error) {
      console.error('Check sync error:', error);
      toast.error('Ошибка проверки синхронизации');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 2000);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon(status)}
        <span className="text-sm">{label}</span>
        <Badge variant={status ? "default" : "destructive"}>
          {status ? "ОК" : "Требует внимания"}
        </Badge>
      </div>
    );
  };

  const canSync = cvFile && isLoggedIn && !isSyncing && cvExistsOnSite !== true;
  const needsSync = !syncData.isSynced && cvExistsOnSite !== true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Синхронизация CV
          </CardTitle>
          <CardDescription>
            Убедитесь, что ваш CV загружен как в приложении, так и на сайте Lucru.md
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Статус синхронизации */}
          <div className="space-y-3">
            <h4 className="font-medium">Статус синхронизации:</h4>
            <div className="space-y-2">
              {getStatusBadge(syncData.localCV, "CV в приложении")}
              {getStatusBadge(syncData.websiteCV, "CV на сайте Lucru.md")}
            </div>
            
            {syncData.lastSync && (
              <div className="text-sm text-muted-foreground">
                Последняя синхронизация: {syncData.lastSync}
              </div>
            )}
          </div>

          {/* Предупреждения */}
          {cvExistsOnSite === true && (
            <Alert className="border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <strong>CV уже загружено на Lucru.md!</strong> Синхронизация не требуется.
              </AlertDescription>
            </Alert>
          )}

          {cvExistsOnSite === false && (
            <Alert className="border-yellow-500">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription>
                <strong>CV не найдено на Lucru.md!</strong> Нажмите "Синхронизировать CV" для загрузки.
              </AlertDescription>
            </Alert>
          )}

          {cvExistsOnSite === null && isLoggedIn && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Статус CV не проверен. Нажмите "Проверить статус" для проверки.
              </AlertDescription>
            </Alert>
          )}

          {/* Прогресс синхронизации */}
          {isSyncing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">{syncStatus}</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
              <div className="text-right text-sm text-muted-foreground">
                {syncProgress}%
              </div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex gap-3">
            {cvExistsOnSite === true ? (
              <Button 
                disabled
                variant="outline"
                className="gap-2 cursor-not-allowed"
              >
                <CheckCircle className="h-4 w-4 text-green-500" />
                CV синхронизирован
              </Button>
            ) : (
              <Button 
                onClick={handleSyncCV}
                disabled={!canSync}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Синхронизировать CV
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={handleCheckSync}
              disabled={isSyncing || !isLoggedIn}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Проверить статус
            </Button>
          </div>

          {/* Требования для синхронизации */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Для синхронизации необходимо:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Загрузить CV файл в приложении</li>
              <li>Войти в аккаунт Lucru.md</li>
              <li>Нажать кнопку "Синхронизировать CV"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
