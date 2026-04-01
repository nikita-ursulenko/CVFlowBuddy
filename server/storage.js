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
  return readJson(PATHS.stats, {
    totalSent: 0,
    totalErrors: 0,
    totalProcessed: 0,
    dailyStats: [],
    siteStats: [],
    recentActivity: [],
    errorVacancies: []
  });
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
  
  stats.recentActivity.unshift({
    id: `success_${Date.now()}`,
    vacancy, site, url, status: 'success',
    date: now.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    timestamp: now.getTime()
  });
  stats.recentActivity = stats.recentActivity.slice(0, 50);
  
  writeJson(PATHS.stats, stats);
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
  
  stats.recentActivity.unshift({
    id: `error_${Date.now()}`,
    vacancy, site, status: 'error',
    date: now.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    timestamp: now.getTime()
  });
  stats.recentActivity = stats.recentActivity.slice(0, 50);
  
  writeJson(PATHS.stats, stats);
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
  }
  writeJson(PATHS.emails, emails.slice(0, 200));
}
