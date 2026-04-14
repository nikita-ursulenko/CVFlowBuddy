import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { PATHS } from './constants.js';
import { analyzeCV, analyzeCVGeneral } from './ai.js';
import { SimpleLucruAgent } from './agent.js';
import { openMailClient } from './email.js';
import * as Storage from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());

// Настройка multer для загрузки CV файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = PATHS.uploads; // Исправлено: теперь сохраняем прямо в uploads
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    // Очистка папки перед новой загрузкой, чтобы всегда был только 1 файл
    try {
      const files = fs.readdirSync(uploadDir);
      for (const f of files) {
        if (f.startsWith('cv-')) fs.unlinkSync(path.join(uploadDir, f));
      }
    } catch (e) {
      console.error('Ошибка очистки uploads:', e.message);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Фиксированное имя для предотвращения накопления файлов
    cb(null, 'cv-current' + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Поддерживаются только PDF и DOCX файлы'));
  }
});

// Глобальное хранилище для активных агентов
const activeAgents = new Map();

// Хелпер для проверки активности браузера
function isBrowserActive(agent) {
  if (!agent || !agent.browser) return false;
  try {
    return agent.browser.isConnected();
  } catch (e) {
    return false;
  }
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth & Login
app.post('/api/agent/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email/password required' });

    console.log('🔐 Авторизация в Lucru.md...');
    const agent = new SimpleLucruAgent({ credentials: { email, password }, headless: false });
    await agent.initialize();
    
    const cookiesValid = await agent.checkIfLoggedInWithCookies();
    if (!cookiesValid) {
      await agent.authenticate();
      const isLoggedIn = await agent.checkIfLoggedIn();
      if (!isLoggedIn) {
        await agent.cleanup();
        return res.status(401).json({ success: false, message: 'Login failed' });
      }
    }
    
    const sessionId = `session_${Date.now()}`;
    activeAgents.set(sessionId, agent);
    
    // Auto-cleanup after 30 mins
    setTimeout(async () => {
      if (activeAgents.has(sessionId)) {
        const a = activeAgents.get(sessionId);
        if (a && a.browser) try { await a.cleanup(); } catch(e) {}
        activeAgents.delete(sessionId);
      }
    }, 30 * 60 * 1000);

    res.json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Categories Scraping
app.get('/api/agent/lucru/categories', async (req, res) => {
  let agent = null;
  try {
    console.log('🔍 Получение списка категорий с Lucru.md...');
    agent = new SimpleLucruAgent({ credentials: { email: '', password: '' }, headless: true });
    await agent.initialize();
    
    await agent.page.goto('https://www.lucru.md/ro/posturi-vacante', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Ждем появления списка категорий
    await agent.page.waitForSelector('a[href*="/categorie/"]', { timeout: 10000 });
    
    const categories = await agent.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/categorie/"]'));
      return links.map(a => {
        const span = a.querySelector('span');
        const name = span ? span.textContent.trim() : a.textContent.trim();
        const href = a.getAttribute('href');
        return { name, href };
      }).filter(c => c.name && c.href);
    });

    console.log(`✅ Найдено ${categories.length} категорий`);
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Ошибка при получении категорий:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (agent) {
      try { await agent.cleanup(); } catch (e) {}
    }
  }
});

// CV Status
app.post('/api/agent/check-cv-status', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const agent = activeAgents.get(sessionId);
    if (!agent) return res.status(401).json({ success: false, message: 'Session not found' });
    
    if (!isBrowserActive(agent)) await agent.initialize();
    
    const cvExists = await agent.checkCVExists();
    
    // Закрываем браузер после успешной проверки (авторизации),
    // чтобы он не "зависал" на экране пользователя
    try { await agent.cleanup(); } catch (e) {}

    res.json({ success: true, cvExists, needsUpload: !cvExists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Agent Status (is browser open)
app.get('/api/agent/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const agent = activeAgents.get(sessionId);
  res.json({ 
    success: true, 
    active: isBrowserActive(agent),
    sessionId 
  });
});

// Close Agent Browser
app.post('/api/agent/close', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const agent = activeAgents.get(sessionId);
    if (agent) {
      if (typeof agent.stop === 'function') agent.stop(); // Остановка цикла
      await agent.cleanup(); // Закрытие браузера
      activeAgents.delete(sessionId);
      console.log(`🛑 Агент ${sessionId} остановлен и закрыт вручную`);
      return res.json({ success: true, message: 'Браузер агента закрыт' });
    }
    res.status(404).json({ success: false, message: 'Сессия не признана активной' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload file to server
app.post('/api/agent/upload-cv', upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, filePath: req.file.path, fileName: req.file.originalname });
});

// Analyze CV
app.post('/api/agent/analyze-cv', async (req, res) => {
  try {
    let { filePath, apiKey, model, provider } = req.body;
    if (!filePath || !apiKey) return res.status(400).json({ success: false, message: 'File/API key required' });
    
    // ПРОВЕРКА ПУТИ: Если файл не найден, пробуем найти его в папке uploads
    if (!fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      // 1. Пробуем оригинальное имя в uploads
      let candidate = path.join(PATHS.uploads, fileName);
      
      // 2. Если нет, пробуем cv-current с тем же расширением
      if (!fs.existsSync(candidate)) {
        candidate = path.join(PATHS.uploads, `cv-current${ext}`);
      }

      if (fs.existsSync(candidate)) {
        console.log(`ℹ️ Путь ${filePath} не найден, используем ${candidate}`);
        filePath = candidate;
      }
    }

    const cvData = await analyzeCV(filePath, apiKey, model, provider);
    res.json({ success: true, analysis: { ...cvData, serverFilePath: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync CV with Site
app.post('/api/agent/sync-cv', async (req, res) => {
  try {
    const { sessionId, fileName, filePath, apiKey, model, provider } = req.body;
    const agent = activeAgents.get(sessionId);
    if (!agent) return res.status(401).json({ success: false, message: 'Session not found' });
    
    let fullPath = filePath || path.join(PATHS.uploads, fileName);
    
    // ПРОВЕРКА ПУТИ
    if (!fs.existsSync(fullPath)) {
      const fallbackPath = path.join(PATHS.uploads, path.basename(fullPath));
      if (fs.existsSync(fallbackPath)) {
        fullPath = fallbackPath;
      } else {
        return res.status(404).json({ success: false, message: `CV не найден: ${fullPath}` });
      }
    }

    if (!isBrowserActive(agent)) await agent.initialize();
    
    const cvExists = await agent.checkCVExists();
    if (cvExists) return res.json({ success: true, message: 'CV already exists' });

    const cvData = await analyzeCV(fullPath, apiKey, model, provider);
    const result = await agent.uploadCVWithAI(fullPath, cvData, apiKey, model, provider);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-Apply
app.post('/api/agent/auto-apply-jobs', async (req, res) => {
  try {
    const { sessionId, cvData, maxJobs = 10, apiKey, model, provider, emailMode = 'manual', categories } = req.body;
    let agent = activeAgents.get(sessionId);
    
    if (!agent) {
      // Try restore from cookies
      if (fs.existsSync(PATHS.cookies)) {
        agent = new SimpleLucruAgent({ credentials: { email: '', password: '' } });
        await agent.initialize();
        if (await agent.checkIfLoggedInWithCookies()) {
          activeAgents.set(sessionId, agent);
        } else {
          await agent.cleanup();
          return res.status(401).json({ success: false, needsLogin: true });
        }
      } else {
        return res.status(401).json({ success: false, needsLogin: true });
      }
    }

    if (!isBrowserActive(agent)) await agent.initialize();

    // Start in background
    agent.autoApplyToJobs(cvData, { maxJobs, apiKey, model, provider, emailMode, categories })
      .then(async result => {
        console.log(`✅ Auto-apply ${sessionId} done`);
        // Автоматически закрываем браузер после завершения отправок
        try {
          await agent.cleanup();
          console.log(`🔒 Браузер агента ${sessionId} автоматически закрыт после выполнения работы`);
        } catch (e) {
          console.error(`Ошибка при закрытии браузера:`, e.message);
        }
      })
      .catch(async err => {
        console.error(`❌ Auto-apply ${sessionId} error:`, err);
        try {
          await agent.cleanup();
        } catch (e) {}
      });

    res.json({ success: true, message: 'Job started in background', jobId: sessionId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analyze CV General (Job analysis)
app.post('/api/agent/analyze-cv-general', async (req, res) => {
  try {
    let { filePath, apiKey, model, provider } = req.body;
    
    // ПРОВЕРКА ПУТИ: Если файл не найден, пробуем найти его в папке uploads
    if (filePath && !fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      // 1. Пробуем оригинальное имя
      let candidate = path.join(PATHS.uploads, fileName);
      
      // 2. Если нет, пробуем cv-current с тем же расширением
      if (!fs.existsSync(candidate)) {
        candidate = path.join(PATHS.uploads, `cv-current${ext}`);
      }

      if (fs.existsSync(candidate)) {
        filePath = candidate;
      }
    }

    const analysis = await analyzeCVGeneral(filePath, apiKey, model, provider);
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Stats routes
app.get('/api/stats', (req, res) => res.json(Storage.getStats()));
app.get('/api/agent/settings', (req, res) => res.json(Storage.getSettings()));
app.post('/api/agent/settings', (req, res) => {
  const settings = Storage.saveSettings(req.body);
  res.json({ success: true, settings });
});

app.get('/api/agent/groq-status', (req, res) => {
  res.json({ success: true, ...Storage.getAIStatus() });
});

app.post('/api/agent/groq-status/refresh', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key required' });

    console.log(`📊 Refreshing Groq limits for model: ${model || 'llama-3.3-70b-versatile'}`);
    
    const { createGroqClient } = await import('./utils.js');
    
    const groq = createGroqClient(apiKey);
    const { response } = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'hi' }],
      model: model || 'llama-3.3-70b-versatile',
      max_tokens: 1
    }).withResponse();

    Storage.saveGroqStatusFromHeaders(response.headers);
    res.json({ success: true, ...Storage.getAIStatus() });
  } catch (error) {
    console.error('Groq refresh error:', error);
    
    // Если в ошибке есть заголовки (например, при 429), сохраняем их
    if (error.response && error.response.headers) {
      try {
        Storage.saveGroqStatusFromHeaders(error.response.headers);
      } catch (headerErr) {
        console.error('Failed to save headers from error:', headerErr);
      }
    }

    if (error.error) {
      return res.status(error.status || 400).json({ 
        success: false, 
        error: error.error,
        message: error.message,
        ...Storage.getAIStatus() // Добавляем текущие лимиты даже при ошибке
      });
    }
    res.status(500).json({ success: false, message: error.message, ...Storage.getAIStatus() });
  }
});
app.post('/api/agent/gemini/test', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key required' });

    console.log(`💎 Testing Gemini connection for model: ${model || 'gemini-3-flash-preview'}`);
    
    const { callAI } = await import('./ai.js');
    const result = await callAI({
      provider: 'gemini',
      apiKey,
      model: model || 'gemini-3-flash-preview',
      messages: [{ role: 'user', content: 'Say "Connection successful" in one sentence.' }],
      temperature: 0.1
    });

    res.json({ success: true, message: result.content });
  } catch (error) {
    console.error('Gemini test error:', error);
    let message = error.message;
    // Очищаем технический мусор из сообщений Google SDK
    if (message.includes('[400 Bad Request] API key not valid')) {
      message = 'Неверный API ключ. Пожалуйста, проверьте настройки.';
    } else if (message.includes('GoogleGenerativeAI Error')) {
      // Пытаемся извлечь только осмысленную часть сообщения
      const match = message.match(/\[.*\] (.*?) \[/);
      if (match) message = match[1];
    }
    res.status(500).json({ success: false, message });
  }
});

app.post('/api/stats/success', (req, res) => { Storage.saveSuccessStat(req.body); res.json({ success: true }); });
app.post('/api/stats/error', (req, res) => { Storage.saveErrorStat(req.body); res.json({ success: true }); });
app.post('/api/stats/site', (req, res) => { Storage.saveSiteStat(req.body); res.json({ success: true }); });

app.get('/api/agent/stats-summary', (req, res) => {
  const stats = Storage.getStats();
  const today = new Date().toISOString().split('T')[0];
  const daily = stats.dailyStats.find(d => d.date === today);
  
  res.json({
    success: true,
    totalRequests: stats.totalSent || 0,
    todayRequests: daily ? daily.sent : 0
  });
});

// Test Email
app.post('/api/agent/test-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    console.log(`🧪 Тестовое письмо (Manual): к=${to}`);
    const result = await openMailClient(to, subject, body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Email history
app.get('/api/agent/emails', (req, res) => res.json({ success: true, emails: Storage.getEmails() }));
app.get('/api/agent/applied-vacancies', (req, res) => {
  res.json({ success: true, vacancies: Storage.getAppliedVacancies() });
});
app.post('/api/agent/emails/send', async (req, res) => {
  try {
    const { emailId } = req.body;
    const emails = Storage.getEmails();
    const email = emails.find(e => e.id === emailId);
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    console.log(`✉️ Отправка письма вручную: ${email.company}`);
    const result = await openMailClient(email.email, `Apply: ${email.jobTitle}`, email.content);
    
    if (result.success) {
      email.status = 'sent';
      email.sentAt = new Date().toISOString();
      Storage.saveEmail(email);
      // Записываем активность отправки
      Storage.saveEmailActivity(email, 'email_sent');
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Page Debug
app.post('/api/agent/debug-page', async (req, res) => {
  const { sessionId, url } = req.body;
  const agent = activeAgents.get(sessionId);
  if (!agent) return res.status(404).json({ success: false, message: 'Session not found' });
  
  await agent.page.goto(url || 'https://lucru.md/ro/applicant/my-resumes');
  const text = await agent.page.evaluate(() => document.body.innerText);
  res.json({ success: true, text: text.substring(0, 3000) });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  for (const [id, agent] of activeAgents) {
    try { await agent.cleanup(); } catch(e) {}
  }
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Modular Server started on http://localhost:${PORT}`);
});
