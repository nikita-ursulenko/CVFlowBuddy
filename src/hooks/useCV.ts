import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface CVFile {
  id: string;
  name: string;
  date: string;
  size: string;
  filePath?: string;
  aiAnalysis?: any; // Результаты AI анализа
  analyzedAt?: string; // Дата анализа
}

const CV_STORAGE_KEY = 'cvflow_cv_file';
const LOGIN_STORAGE_KEY = 'cvflow_lucru_logged_in';
const SESSION_STORAGE_KEY = 'cvflow_session_id';
const CV_EXISTS_STORAGE_KEY = 'cvflow_cv_exists_on_site';

export const useCV = () => {
  const [cvFile, setCvFile] = useState<CVFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cvExistsOnSite, setCvExistsOnSite] = useState<boolean | null>(null);

  // Загружаем сохраненный CV файл и состояние авторизации при инициализации
  useEffect(() => {
    loadCVFile();
    // Загружаем все состояние синхронно, чтобы избежать race condition
    // Сначала загружаем sessionId и другие данные, потом статус авторизации
    loadSessionId();
    loadCVExistsStatus();
    loadLoginStatus();
  }, []);

  const loadCVFile = useCallback(() => {
    try {
      const stored = localStorage.getItem(CV_STORAGE_KEY);
      if (stored) {
        const file = JSON.parse(stored);
        setCvFile(file);
      }
    } catch (error) {
      console.error('Failed to load CV file:', error);
      toast.error('Ошибка загрузки CV файла');
    }
  }, []);

  const loadLoginStatus = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOGIN_STORAGE_KEY);
      const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      
      if (stored) {
        const loginData = JSON.parse(stored);
        // Устанавливаем isLoggedIn=true только если есть sessionId
        // Это предотвращает рассинхронизацию состояния
        if (loginData.isLoggedIn && storedSessionId) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          // Очищаем невалидное состояние
          if (loginData.isLoggedIn && !storedSessionId) {
            console.log('🔍 Очистка невалидного состояния: isLoggedIn=true но нет sessionId');
            localStorage.removeItem(LOGIN_STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load login status:', error);
    }
  }, []);

  const loadSessionId = useCallback(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        setSessionId(stored);
      }
    } catch (error) {
      console.error('Failed to load session ID:', error);
    }
  }, []);

  const loadCVExistsStatus = useCallback(() => {
    try {
      const stored = localStorage.getItem(CV_EXISTS_STORAGE_KEY);
      if (stored) {
        setCvExistsOnSite(stored === 'true');
      }
    } catch (error) {
      console.error('Failed to load CV exists status:', error);
    }
  }, []);

  const saveCVFile = useCallback((file: CVFile | null) => {
    try {
      if (file) {
        localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(file));
      } else {
        localStorage.removeItem(CV_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save CV file:', error);
    }
  }, []);

  const uploadCV = useCallback(async (file: File, autoAnalyze: boolean = true): Promise<CVFile | null> => {
    setIsLoading(true);
    
    try {
      // Создаем FormData для отправки файла на сервер
      const formData = new FormData();
      formData.append('cv', file);
      
      // Сохраняем файл на сервере для использования агентом
      toast.info('Загрузка CV файла...');
      const response = await fetch('http://localhost:5050/api/agent/upload-cv', {
        method: 'POST',
        body: formData
      });
      
      let serverFilePath = '';
      if (response.ok) {
        const data = await response.json();
        serverFilePath = data.filePath;
        toast.success('CV файл загружен на сервер');
      } else {
        toast.warning('Не удалось загрузить на сервер, файл будет сохранен локально');
      }
      
      const newCVFile: CVFile = {
        id: Date.now().toString(),
        name: file.name,
        date: new Date().toLocaleDateString('ru-RU'),
        size: `${(file.size / 1024).toFixed(0)} KB`,
        filePath: serverFilePath || URL.createObjectURL(file)
      };

      setCvFile(newCVFile);
      saveCVFile(newCVFile);
      
      toast.success(`CV файл "${file.name}" успешно загружен`);
      
      // Автоматический AI анализ если указано
      if (autoAnalyze) {
        toast.info('Запуск AI анализа CV...');
        // AI анализ будет запущен в компоненте CV.tsx
      }
      
      return newCVFile;
    } catch (error) {
      console.error('Failed to upload CV:', error);
      toast.error('Ошибка загрузки CV файла');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [saveCVFile]);
  
  const saveAIAnalysis = useCallback((analysis: any) => {
    if (cvFile) {
      const updatedCV: CVFile = {
        ...cvFile,
        aiAnalysis: analysis,
        analyzedAt: new Date().toISOString()
      };
      setCvFile(updatedCV);
      saveCVFile(updatedCV);
      toast.success('AI анализ сохранен');
    }
  }, [cvFile, saveCVFile]);

  const deleteCV = useCallback(() => {
    try {
      if (cvFile) {
        toast.success(`CV файл "${cvFile.name}" удален`);
      }
      setCvFile(null);
      saveCVFile(null);
    } catch (error) {
      console.error('Failed to delete CV:', error);
      toast.error('Ошибка удаления CV файла');
    }
  }, [cvFile, saveCVFile]);

  const setLoggedIn = useCallback((loggedIn: boolean) => {
    try {
      // Дополнительная валидация: не позволяем установить isLoggedIn=true без sessionId
      const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (loggedIn && !storedSessionId) {
        console.warn('⚠️ Попытка установить isLoggedIn=true без sessionId. Игнорируем.');
        return;
      }
      
      setIsLoggedIn(loggedIn);
      localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify({ isLoggedIn: loggedIn }));
      if (loggedIn) {
        toast.success('Успешный вход в аккаунт Lucru.md');
      } else {
        toast.info('Выход из аккаунта Lucru.md');
      }
    } catch (error) {
      console.error('Failed to save login status:', error);
    }
  }, []);

  const logout = useCallback(() => {
    setLoggedIn(false);
    setSessionId(null);
    setCvExistsOnSite(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(CV_EXISTS_STORAGE_KEY);
  }, [setLoggedIn]);

  const saveSessionId = useCallback((id: string | null) => {
    try {
      if (id) {
        localStorage.setItem(SESSION_STORAGE_KEY, id);
        setSessionId(id);
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionId(null);
      }
    } catch (error) {
      console.error('Failed to save session ID:', error);
    }
  }, []);

  const saveCVExistsStatus = useCallback((exists: boolean | null) => {
    try {
      if (exists !== null) {
        localStorage.setItem(CV_EXISTS_STORAGE_KEY, String(exists));
        setCvExistsOnSite(exists);
      } else {
        localStorage.removeItem(CV_EXISTS_STORAGE_KEY);
        setCvExistsOnSite(null);
      }
    } catch (error) {
      console.error('Failed to save CV exists status:', error);
    }
  }, []);

  return {
    cvFile,
    isLoading,
    isLoggedIn,
    sessionId,
    cvExistsOnSite,
    uploadCV,
    deleteCV,
    setLoggedIn,
    logout,
    saveAIAnalysis,
    saveSessionId,
    saveCVExistsStatus
  };
};
