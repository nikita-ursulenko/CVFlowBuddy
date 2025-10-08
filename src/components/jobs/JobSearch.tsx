import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, MapPin, Clock, DollarSign, Building, Star, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface JobSearchProps {
  cvData?: any;
  onJobSelect?: (job: JobData) => void;
}

interface JobData {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements: string[];
  benefits: string[];
  matchScore: number;
  source: string;
  url: string;
  postedDate: string;
  isRemote?: boolean;
  experience: string;
}

export const JobSearch: React.FC<JobSearchProps> = ({ cvData, onJobSelect }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');

  // Демо данные вакансий для тестирования
  const demoJobs: JobData[] = [
    {
      id: '1',
      title: 'Senior React Developer',
      company: 'TechCorp Moldova',
      location: 'Chișinău',
      salary: '$2000-3000',
      description: 'Мы ищем опытного React разработчика для работы над современными веб-приложениями.',
      requirements: ['React', 'TypeScript', 'Redux', '5+ лет опыта'],
      benefits: ['Удаленная работа', 'Медицинская страховка', 'Гибкий график'],
      matchScore: 85,
      source: 'lucru.md',
      url: 'https://lucru.md/job/123',
      postedDate: '2 дня назад',
      isRemote: true,
      experience: '5+ лет'
    },
    {
      id: '2',
      title: 'Frontend Developer',
      company: 'StartupLab',
      location: 'Chișinău',
      salary: '$1500-2500',
      description: 'Разработка пользовательских интерфейсов для мобильных и веб приложений.',
      requirements: ['React', 'JavaScript', 'CSS', '3+ лет опыта'],
      benefits: ['Стартап атмосфера', 'Опыт работы с новыми технологиями'],
      matchScore: 72,
      source: 'lucru.md',
      url: 'https://lucru.md/job/124',
      postedDate: '1 день назад',
      experience: '3+ лет'
    },
    {
      id: '3',
      title: 'Full Stack Developer',
      company: 'WebSolutions',
      location: 'Chișinău',
      salary: '$1800-2800',
      description: 'Разработка полного цикла веб-приложений от frontend до backend.',
      requirements: ['React', 'Node.js', 'MongoDB', '4+ лет опыта'],
      benefits: ['Команда профессионалов', 'Обучение'],
      matchScore: 68,
      source: 'lucru.md',
      url: 'https://lucru.md/job/125',
      postedDate: '3 дня назад',
      experience: '4+ лет'
    },
    {
      id: '4',
      title: 'React Native Developer',
      company: 'MobileFirst',
      location: 'Chișinău',
      salary: '$1600-2600',
      description: 'Разработка мобильных приложений на React Native.',
      requirements: ['React Native', 'JavaScript', 'iOS/Android', '2+ лет опыта'],
      benefits: ['Работа с мобильными технологиями', 'Гибкий график'],
      matchScore: 45,
      source: 'lucru.md',
      url: 'https://lucru.md/job/126',
      postedDate: '4 дня назад',
      experience: '2+ лет'
    }
  ];

  const handleSearchJobs = async () => {
    setIsSearching(true);
    setJobs([]);
    setSearchProgress(0);
    setSearchStatus('Начинаем поиск подходящих вакансий...');

    try {
      // Симуляция поиска с прогрессом
      const steps = [
        { progress: 20, status: 'Анализируем ваше CV...' },
        { progress: 40, status: 'Извлекаем ключевые навыки...' },
        { progress: 60, status: 'Ищем подходящие вакансии...' },
        { progress: 80, status: 'Анализируем соответствие...' },
        { progress: 100, status: 'Поиск завершен!' }
      ];

      for (const step of steps) {
        setSearchProgress(step.progress);
        setSearchStatus(step.status);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Устанавливаем найденные вакансии
      setJobs(demoJobs);
      toast.success(`Найдено ${demoJobs.length} подходящих вакансий!`);

    } catch (error) {
      console.error('Job search error:', error);
      toast.error('Ошибка при поиске вакансий');
    } finally {
      setIsSearching(false);
      setSearchStatus('');
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMatchText = (score: number) => {
    if (score >= 80) return 'Отличное соответствие';
    if (score >= 60) return 'Хорошее соответствие';
    return 'Частичное соответствие';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Поиск подходящих вакансий
          </CardTitle>
          <CardDescription>
            AI найдет вакансии, которые лучше всего подходят вашему CV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSearching && jobs.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Начните поиск вакансий</h3>
              <p className="text-muted-foreground mb-4">
                Нажмите кнопку ниже, чтобы найти подходящие вакансии на основе вашего CV
              </p>
              <Button onClick={handleSearchJobs} className="gap-2">
                <Search className="h-4 w-4" />
                Найти подходящие вакансии
              </Button>
            </div>
          )}

          {isSearching && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">{searchStatus}</span>
              </div>
              <Progress value={searchProgress} className="w-full" />
              <div className="text-right text-sm text-muted-foreground">
                {searchProgress}%
              </div>
            </div>
          )}

          {jobs.length > 0 && !isSearching && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Найдено {jobs.length} подходящих вакансий
                </h3>
                <Button variant="outline" onClick={handleSearchJobs} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Обновить поиск
                </Button>
              </div>

              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-semibold">{job.title}</h4>
                            <Badge variant="secondary" className={getMatchColor(job.matchScore)}>
                              {job.matchScore}% соответствие
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              {job.company}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {job.postedDate}
                            </div>
                            {job.salary && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {job.salary}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{job.experience}</Badge>
                          {job.isRemote && <Badge variant="outline">Удаленно</Badge>}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{job.description}</p>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h5 className="font-medium text-sm mb-2">Требования:</h5>
                          <div className="flex flex-wrap gap-1">
                            {job.requirements.map((req, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm mb-2">Преимущества:</h5>
                          <div className="flex flex-wrap gap-1">
                            {job.benefits.map((benefit, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {benefit}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {getMatchText(job.matchScore)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(job.url, '_blank')}
                          >
                            Открыть
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => onJobSelect?.(job)}
                          >
                            Выбрать
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
