import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { PATHS } from './constants.js';
import { analyzeCVWithGroq, analyzeCVGeneralWithGroq } from './ai.js';
import { SimpleLucruAgent } from './agent.js';
import { openMailClient } from './email.js';
import { 
  getStats, 
  saveSuccessStat, 
  saveSiteStat, 
  getEmails, 
  saveEmail,
  getGroqStatus 
} from './storage.js';

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
    const uploadDir = path.dirname(PATHS.uploads);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cv-' + uniqueSuffix + path.extname(file.originalname));
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

// CV Status
app.post('/api/agent/check-cv-status', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const agent = activeAgents.get(sessionId);
    if (!agent) return res.status(401).json({ success: false, message: 'Session not found' });
    
    if (!isBrowserActive(agent)) await agent.initialize();
    
    const cvExists = await agent.checkCVExists();
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
    const { filePath, apiKey, model } = req.body;
    if (!filePath || !apiKey) return res.status(400).json({ success: false, message: 'File/API key required' });
    
    const cvData = await analyzeCVWithGroq(filePath, apiKey, model);
    res.json({ success: true, analysis: { ...cvData, serverFilePath: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync CV with Site
app.post('/api/agent/sync-cv', async (req, res) => {
  try {
    const { sessionId, fileName, filePath, apiKey, model } = req.body;
    const agent = activeAgents.get(sessionId);
    if (!agent) return res.status(401).json({ success: false, message: 'Session not found' });
    
    const fullPath = filePath || path.join(__dirname, 'uploads', fileName);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, message: 'CV not found' });

    if (!isBrowserActive(agent)) await agent.initialize();
    
    const cvExists = await agent.checkCVExists();
    if (cvExists) return res.json({ success: true, message: 'CV already exists' });

    const cvData = await analyzeCVWithGroq(fullPath, apiKey, model);
    const result = await agent.uploadCVWithGroqController(fullPath, cvData, apiKey);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-Apply
app.post('/api/agent/auto-apply-jobs', async (req, res) => {
  try {
    const { sessionId, cvData, maxJobs = 10, apiKey, model, smtpConfig, emailMode = 'auto' } = req.body;
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
    agent.autoApplyToJobs(cvData, { maxJobs, apiKey, model, smtpConfig, emailMode })
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

// Stats routes
app.get('/api/stats', (req, res) => res.json(getStats()));
app.get('/api/agent/groq-status', (req, res) => {
  res.json({ success: true, ...getGroqStatus() });
});

app.post('/api/agent/groq-status/refresh', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key required' });

    console.log(`📊 Refreshing Groq limits for model: ${model || 'llama-3.3-70b-versatile'}`);
    
    const { createGroqClient } = await import('./utils.js');
    const { saveGroqStatusFromHeaders } = await import('./storage.js');
    
    const groq = createGroqClient(apiKey);
    const { response } = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'hi' }],
      model: model || 'llama-3.3-70b-versatile',
      max_tokens: 1
    }).withResponse();

    saveGroqStatusFromHeaders(response.headers);
    res.json({ success: true, ...getGroqStatus() });
  } catch (error) {
    console.error('Groq refresh error:', error);
    
    // Если в ошибке есть заголовки (например, при 429), сохраняем их
    if (error.response && error.response.headers) {
      try {
        const { saveGroqStatusFromHeaders } = await import('./storage.js');
        saveGroqStatusFromHeaders(error.response.headers);
      } catch (headerErr) {
        console.error('Failed to save headers from error:', headerErr);
      }
    }

    if (error.error) {
      return res.status(error.status || 400).json({ 
        success: false, 
        error: error.error,
        message: error.message,
        ...getGroqStatus() // Добавляем текущие лимиты даже при ошибке
      });
    }
    res.status(500).json({ success: false, message: error.message, ...getGroqStatus() });
  }
});
app.post('/api/stats/success', (req, res) => { saveSuccessStat(req.body); res.json({ success: true }); });
app.post('/api/stats/error', (req, res) => { saveErrorStat(req.body); res.json({ success: true }); });
app.post('/api/stats/site', (req, res) => { saveSiteStat(req.body); res.json({ success: true }); });

// Email history
app.get('/api/agent/emails', (req, res) => res.json({ success: true, emails: getEmails() }));
app.post('/api/agent/emails/send', async (req, res) => {
  try {
    const { emailId, mode: expMode } = req.body;
    const emails = getEmails();
    const email = emails.find(e => e.id === emailId);
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    const mode = expMode || email.mode || 'manual';
    let result;
    if (mode === 'manual') {
      result = await openMailClient(email.email, `Apply: ${email.jobTitle}`, email.content);
    } else {
      // SMTP implementation would go here
      result = { success: true, message: 'SMTP simulation success' };
    }
    
    if (result.success) {
      email.status = 'sent';
      email.sentAt = new Date().toISOString();
      saveEmail(email);
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
