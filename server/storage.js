import fs from 'fs';
import { PATHS } from './constants.js';

function readJson(path, defaultValue = []) {
  try {
    if (!fs.existsSync(path)) return defaultValue;
    const data = fs.readFileSync(path, 'utf8');
    if (!data) return defaultValue;
    return JSON.parse(data);
  } catch (e) {
    console.error(`Ошибка при чтении ${path}:`, e.message);
    return defaultValue;
  }
}

function writeJson(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Error writing ${path}:`, e.message);
  }
}

export function getStats() {
  const defaults = {
    totalSent: 0,
    totalErrors: 0,
    totalProcessed: 0,
    totalCategoryJobs: 0,
    emailsFound: 0,
    emailsSent: 0,
    dailyStats: [],
    siteStats: [],
    recentActivity: [],
    errorVacancies: []
  };
  
  const stats = { ...defaults, ...readJson(PATHS.stats, defaults) };
  const emails = getEmails();

  // Вспомогательная функция для очистки названий вакансий от cid_
  const formatVacancy = (company, title) => {
    if (!title && !company) return 'Без названия';
    if (!company || company.startsWith('cid_')) return title || company || 'Вакансия';
    if (!title) return company;
    return title;
  };

  // Преобразуем историю писем в формат активности
  const emailActivities = emails.map(e => ({
    id: e.id || `email_${e.timestamp}`,
    vacancy: formatVacancy(e.company, e.jobTitle),
    site: 'Email',
    status: e.status === 'sent' ? 'email_sent' : 'email_generated',
    date: new Date(e.timestamp || Date.now()).toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    }),
    timestamp: new Date(e.timestamp || Date.now()).getTime()
  }));

  // Объединяем и очищаем от дубликатов
  const combined = [...stats.recentActivity.map(a => ({
    ...a,
    vacancy: a.vacancy?.startsWith('cid_') ? (emailActivities.find(ea => ea.vacancy && !ea.vacancy.startsWith('cid_'))?.vacancy || a.vacancy) : a.vacancy
  }))];
  
  emailActivities.forEach(ea => {
    // Проверяем на дубликаты по времени и вакансии
    const isDuplicate = combined.some(a => 
      (a.id === ea.id) || 
      (a.site === ea.site && Math.abs(a.timestamp - ea.timestamp) < 60000) // Совпадение в пределах минуты
    );
    if (!isDuplicate) {
      combined.push(ea);
    }
  });

  stats.recentActivity = combined
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return stats;
}

/**
 * Возвращает расширенный список всех откликов для новой страницы "Отклики"
 */
export function getAppliedVacancies() {
  const emails = getEmails();
  const stats = readJson(PATHS.stats, { recentActivity: [] });
  
  // 1. Собираем отклики из писем
  const fromEmails = emails.map(e => ({
    id: e.id,
    vacancy: e.jobTitle || e.company || 'Вакансия',
    company: e.company,
    jobTitle: e.jobTitle,
    site: 'Email',
    status: e.status, // sent, generated
    date: new Date(e.timestamp || Date.now()).toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    }),
    timestamp: new Date(e.timestamp || Date.now()).getTime(),
    url: e.url || '', // Мы планировали добавить url в email-объекты
    emailContent: {
      subject: e.subject,
      body: e.content,
      to: e.email
    }
  }));

  // 2. Добавляем отклики из статистики (где есть URL, но может не быть письма)
  const fromStats = stats.recentActivity
    .filter(a => a.status === 'success' || a.status === 'email_sent' || a.status === 'email_generated')
    .map(a => ({
      id: a.id,
      vacancy: a.vacancy,
      site: a.site || 'lucru.md',
      status: a.status,
      date: a.date,
      timestamp: a.timestamp,
      url: a.url,
      salary: a.salary || '',
      // Тут письма нет, если оно не смэтчится ниже
    }));

  // 3. Объединяем, отдавая приоритет данным из писем (там есть контент)
  const unified = [...fromEmails];
  
  fromStats.forEach(statItem => {
    // Ищем, нет ли уже такого отклика среди писем (по URL или по названию + времени)
    const exists = unified.find(emailItem => 
      (statItem.url && emailItem.url === statItem.url) ||
      (statItem.vacancy === emailItem.vacancy && Math.abs(statItem.timestamp - emailItem.timestamp) < 300000) // 5 мин
    );
    
    if (exists) {
      // Обогащаем существующую запись из письма URL-ом из статистики, если его не было
      if (!exists.url && statItem.url) exists.url = statItem.url;
      // При наличии зарплаты в письме или статистике — сохраняем её
      if (!exists.salary && statItem.salary) exists.salary = statItem.salary;
    } else {
      unified.push(statItem);
    }
  });

  // 4. Фильтруем "мусор": оставляем ТОЛЬКО те вакансии, у которых есть рабочая ссылка (URL)
  const cleaned = unified.filter(v => {
    // Если ссылки нет или она пустая - это мусор, удаляем без исключений
    if (!v.url || v.url.trim() === '') return false;

    // Убираем технические заглушки без названия, даже если есть ссылка (опционально, но полезно)
    if (v.vacancy === 'Вакансия' || v.vacancy.startsWith('cid_')) {
       // Если это cid_ но есть URL, мы оставляем, так как по ссылке можно понять что это
       return true;
    }
    
    return true;
  });

  return cleaned.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Универсальный метод записи активности в ленту (статус-бар)
 */
export function recordActivity({ type = 'action', vacancy, site, status, url, salary }) {
  const stats = getStats();
  const now = new Date();
  
  const activityItem = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    vacancy, 
    site: site || 'Email', 
    url: url || '', 
    status, // success, error, email_found, email_generated, email_sent
    salary: salary || '',
    date: now.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    timestamp: now.getTime()
  };

  stats.recentActivity.unshift(activityItem);
  stats.recentActivity = stats.recentActivity.slice(0, 50);
  
  writeJson(PATHS.stats, stats);
}

export function saveSuccessStat({ vacancy, site = 'lucru.md', url = '', salary = '' }) {
  const stats = getStats();
  stats.totalSent++;
  stats.totalProcessed++;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const dailyIndex = stats.dailyStats.findIndex(d => d.date === today);
  if (dailyIndex >= 0) stats.dailyStats[dailyIndex].sent++;
  else stats.dailyStats.push({ date: today, sent: 1, errors: 0 });
  
  // Сохраняем основные счётчики
  writeJson(PATHS.stats, stats);
  
  // Добавляем в историю (через recordActivity, которая сама обновит recentActivity)
  recordActivity({
    type: 'success',
    vacancy,
    site,
    url,
    salary,
    status: 'success'
  });
}

export function saveErrorStat({ vacancy, url, reason, site = 'lucru.md' }) {
  const stats = getStats();
  stats.totalErrors++;
  stats.totalProcessed++;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const dailyIndex = stats.dailyStats.findIndex(d => d.date === today);
  if (dailyIndex >= 0) stats.dailyStats[dailyIndex].errors++;
  else stats.dailyStats.push({ date: today, sent: 0, errors: 1 });
  
  stats.errorVacancies.push({
    id: `error_${Date.now()}`,
    url, title: vacancy, reason,
    date: now.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  });
  
  writeJson(PATHS.stats, stats);

  recordActivity({
    type: 'error',
    vacancy,
    site,
    url,
    status: 'error'
  });
}

export function saveEmailActivity(emailData, status = 'email_generated') {
  recordActivity({
    type: 'email',
    vacancy: emailData.jobTitle || emailData.company || emailData.email,
    site: 'Email',
    status: status, // email_generated, email_sent
    url: ''
  });
}

export function saveSiteStat({ site, totalVacancies }) {
  const stats = getStats();
  const idx = stats.siteStats.findIndex(s => s.site === site);
  if (idx >= 0) {
    stats.siteStats[idx].totalVacancies = totalVacancies;
    stats.siteStats[idx].percentage = Math.round((stats.siteStats[idx].processed / totalVacancies) * 100);
  } else {
    stats.siteStats.push({ site, totalVacancies, processed: 0, percentage: 0 });
  }
  writeJson(PATHS.stats, stats);
}

export function saveTotalCategoryJobs(totalCount) {
  const stats = getStats();
  stats.totalCategoryJobs = totalCount;
  writeJson(PATHS.stats, stats);
}

export function incrementEmailsFound(company = '', email = '') {
  const stats = getStats();
  stats.emailsFound = (stats.emailsFound || 0) + 1;
  writeJson(PATHS.stats, stats);

  if (company || email) {
    recordActivity({
      type: 'email_found',
      vacancy: company || email,
      site: 'Email Search',
      status: 'email_found'
    });
  }
}

export function incrementEmailsSent() {
  const stats = getStats();
  stats.emailsSent = (stats.emailsSent || 0) + 1;
  writeJson(PATHS.stats, stats);
}

export function getEmails() {
  return readJson(PATHS.emails, []);
}

export function saveEmail(emailData) {
  const emails = getEmails();
  const idx = emails.findIndex(e => e.id === emailData.id);
  if (idx >= 0) {
    emails[idx] = { ...emails[idx], ...emailData };
  } else {
    emails.unshift({
      id: `email_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...emailData
    });
    // Записываем активность только для новых писем
    saveEmailActivity(emailData, 'email_generated');
  }
  writeJson(PATHS.emails, emails.slice(0, 200));
}
export function isDuplicateEmail(targetEmail, company) {
  const emails = getEmails();
  const normalizedEmail = targetEmail?.toLowerCase().trim();
  const normalizedCompany = company?.toLowerCase().trim();
  
  return emails.some(e => {
    const eEmail = e.email?.toLowerCase().trim();
    const eCompany = e.company?.toLowerCase().trim();
    return (normalizedEmail && eEmail === normalizedEmail) || 
           (normalizedCompany && eCompany === normalizedCompany);
  });
}

export function getAIStatus() {
  return readJson(PATHS.groqStatus, {
    remainingTokens: null,
    limitTokens: null,
    resetTokens: null,
    remainingRequests: null,
    limitRequests: null,
    resetRequests: null,
    pausedUntil: null,
    updatedAt: null
  });
}

export function saveAIStatus(data) {
  const current = getAIStatus();
  writeJson(PATHS.groqStatus, { 
    ...current, 
    ...data, 
    updatedAt: new Date().toISOString() 
  });
}

export function saveAIStatusFromHeaders(headers) {
  const data = {
    remainingTokens: headers.get('x-ratelimit-remaining-tokens'),
    limitTokens: headers.get('x-ratelimit-limit-tokens'),
    resetTokens: headers.get('x-ratelimit-reset-tokens'),
    remainingRequests: headers.get('x-ratelimit-remaining-requests'),
    limitRequests: headers.get('x-ratelimit-limit-requests'),
    resetRequests: headers.get('x-ratelimit-reset-requests'),
  };
  saveAIStatus(data);
}

// Алиасы для обратной совместимости
export const getGroqStatus = getAIStatus;
export const saveGroqStatus = saveAIStatus;
export const saveGroqStatusFromHeaders = saveAIStatusFromHeaders;
// Настройки агента
export function getSettings() {
  const defaults = {
    intervalHours: 1,
    maxCVDaily: 10,
    headless: true,
    emailPrompt: `Write a professional, short and friendly cover letter/email for a job application.
Company: {companyName}
Job Titles: {titles}
Candidate Name: {name}
Candidate Position: {position}
Key Skills: {skills}
Experience Summary: {experience}
Short Job Description: {shortJobDesc}

CRITICAL INSTRUCTION:
1. The letter should be in Russian, written from the first person. 
2. It should be professional yet concise. 
3. If multiple Job Titles are provided, mention that you are interested in several positions.
4. DO NOT include subject line, ONLY the body text.
5. Maximum length: 180 words.`,
    portfolioLink: "https://nikita-ursulenko.github.io/",
    selectedCategories: [],
    availableCategories: []
  };
  return { ...defaults, ...readJson(PATHS.settings, defaults) };
}

export function saveSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  writeJson(PATHS.settings, updated);
  return updated;
}
