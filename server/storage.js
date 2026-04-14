import fs from 'fs';
import { PATHS } from './constants.js';

function readJson(path, defaultVal = {}) {
  try {
    if (fs.existsSync(path)) return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${path}:`, e.message);
  }
  return defaultVal;
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
  const emails = getEmails(); // Получаем историю из emails.json

  // Преобразуем историю писем в формат активности для ленты
  const emailActivities = emails.map(e => ({
    id: e.id || `email_hist_${e.timestamp}`,
    vacancy: e.company || e.email,
    site: 'Email',
    status: e.status === 'sent' ? 'email_sent' : 'email_generated',
    date: new Date(e.timestamp || Date.now()).toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    }),
    timestamp: new Date(e.timestamp || Date.now()).getTime()
  }));

  // Объединяем, фильтруем дубликаты по названию и времени (с погрешностью 1с)
  // и сортируем по свежести
  const combined = [...stats.recentActivity];
  
  emailActivities.forEach(ea => {
    const isDuplicate = combined.some(a => 
      (a.id === ea.id) || 
      (a.vacancy === ea.vacancy && Math.abs(a.timestamp - ea.timestamp) < 2000)
    );
    if (!isDuplicate) combined.push(ea);
  });

  stats.recentActivity = combined
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return stats;
}

/**
 * Универсальный метод записи активности в ленту (статус-бар)
 */
export function recordActivity({ type = 'action', vacancy, site, status, url }) {
  const stats = getStats();
  const now = new Date();
  
  const activityItem = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    vacancy, 
    site: site || 'Email', 
    url: url || '', 
    status, // success, error, email_found, email_generated, email_sent
    date: now.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    timestamp: now.getTime()
  };

  stats.recentActivity.unshift(activityItem);
  stats.recentActivity = stats.recentActivity.slice(0, 50);
  
  writeJson(PATHS.stats, stats);
}

export function saveSuccessStat({ vacancy, site = 'lucru.md', url = '' }) {
  const stats = getStats();
  stats.totalSent++;
  stats.totalProcessed++;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const dailyIndex = stats.dailyStats.findIndex(d => d.date === today);
  if (dailyIndex >= 0) stats.dailyStats[dailyIndex].sent++;
  else stats.dailyStats.push({ date: today, sent: 1, errors: 0 });
  
  writeJson(PATHS.stats, stats);
  
  recordActivity({
    type: 'success',
    vacancy,
    site,
    url,
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
    vacancy: emailData.company || emailData.email,
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
    portfolioLink: "https://nikita-ursulenko.github.io/"
  };
  return { ...defaults, ...readJson(PATHS.settings, defaults) };
}

export function saveSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  writeJson(PATHS.settings, updated);
  return updated;
}
