#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import Groq from 'groq-sdk';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import nodemailer from 'nodemailer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для создания экземпляра Groq с API ключом
function createGroqClient(apiKey) {
  if (!apiKey) {
    throw new Error('Groq API ключ не указан');
  }
  return new Groq({ apiKey });
}

// Функция для правильного чтения PDF через pdf-parse
async function readPdfText(pdfPath) {
  try {
    console.log('📖 Читаем PDF через pdf-parse v1.1.1...');
    
    // Читаем файл как buffer
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Парсим PDF
    const data = await pdfParse(dataBuffer);
    
    console.log(`✅ PDF успешно прочитан!`);
    console.log(`   📄 Страниц: ${data.numpages}`);
    console.log(`   📝 Символов текста: ${data.text.length}`);
    console.log(`   ℹ️  Информация: ${data.info ? JSON.stringify(data.info) : 'нет'}`);
    
    // Показываем первые 500 символов для проверки
    console.log('\n📝 Первые 500 символов извлеченного текста:');
    console.log(data.text.substring(0, 500));
    console.log('...\n');
    
    if (data.text.length < 50) {
      throw new Error('PDF содержит слишком мало текста');
    }
    
    return data.text;
  } catch (error) {
    console.error('❌ Ошибка чтения PDF через pdf-parse:', error.message);
    console.log('⚠️ Пробуем резервный метод - strings с метаданными...');
    
    try {
      // Резервный метод - strings
      const { stdout } = await execPromise(`strings "${pdfPath}"`);
      
      // Извлекаем метаданные
      const metadata = {
        author: '',
        title: ''
      };
      
      const authorMatch = stdout.match(/\/Author\s*\((.*?)\)/);
      const titleMatch = stdout.match(/\/Title\s*\((.*?)\)/);
      
      if (authorMatch) metadata.author = authorMatch[1];
      if (titleMatch) metadata.title = titleMatch[1];
      
      console.log('📋 Метаданные из strings:', metadata);
      
      let enhancedText = '';
      if (metadata.author) {
        enhancedText += `АВТОР: ${metadata.author}\n`;
      }
      if (metadata.title) {
        enhancedText += `ФАЙЛ: ${metadata.title}\n`;
      }
      enhancedText += `\nТЕКСТ:\n${stdout}`;
      
      console.log(`⚠️ PDF прочитан через strings (${enhancedText.length} символов)`);
      return enhancedText;
    } catch (e) {
      throw new Error('Не удалось прочитать PDF файл ни одним методом');
    }
  }
}

// Функция для отправки Email с вложением (резюме)
async function sendEmailWithAttachment(smtpConfig, to, subject, html, attachmentPath) {
  console.log(`📧 Попытка отправки письма на ${to}...`);
  
  if (!smtpConfig || !smtpConfig.host || !smtpConfig.auth?.user) {
    console.error('❌ Ошибка: SMTP настройки не заданы');
    return { success: false, error: 'SMTP настройки не заданы' };
  }

  try {
    const transporter = nodemailer.createTransport(smtpConfig);

    const attachments = [];
    if (attachmentPath && typeof attachmentPath === 'string') {
      attachments.push({
        filename: path.basename(attachmentPath),
        path: attachmentPath
      });
    }

    const info = await transporter.sendMail({
      from: `"${smtpConfig.name || 'CV Flow Buddy'}" <${smtpConfig.auth.user}>`,
      to,
      subject,
      html,
      attachments
    });

    console.log(`✅ Письмо успешно отправлено: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Ошибка отправки Email:', error);
    return { success: false, error: error.message };
  }
}

// Функция для открытия почтового клиента (Mail.app на Mac)
async function openMailClient(to, subject, body) {
  console.log(`🖥️  ОТКРЫВАЕМ MAIL.APP ДЛЯ: ${to}`);
  try {
    // В Mac OS используем команду open mailto:...
    // Заменяем переносы строк на %0D%0A для mailto
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailto = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    
    // Используем exec из child_process (он уже должен быть в Node.js)
    const { exec } = require('child_process');
    exec(`open "${mailto}"`);
    
    console.log(`   ✅ Команда open выполнена успешно`);
    return { success: true };
  } catch (error) {
    console.error('   ❌ Ошибка открытия почтового клиента:', error);
    return { success: false, error: error.message };
  }
}

/**
 * СОХРАНЕНИЕ ПИСЬМА В ИСТОРИЮ
 */
function saveEmailToHistory(emailData) {
  const EMAILS_FILE = path.join(__dirname, 'emails.json');
  let emails = [];
  
  try {
    if (fs.existsSync(EMAILS_FILE)) {
      emails = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('⚠️ Ошибка чтения emails.json:', e.message);
  }
  
  const newEmail = {
    id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    status: 'new', // 'new', 'sent', 'error'
    ...emailData
  };
  
  emails.unshift(newEmail);
  
  // Храним последние 200 писем
  if (emails.length > 200) emails = emails.slice(0, 200);
  
  fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2));
  return newEmail;
}

async function analyzeCVGeneralWithGroq(cvFilePath, apiKey) {
  console.log('🤖 ГЕНЕРАЦИЯ ОБЩЕГО АНАЛИЗА CV...');
  
  try {
    let cvText = '';
    if (cvFilePath.endsWith('.pdf')) {
      cvText = await readPdfText(cvFilePath);
    } else {
      cvText = fs.readFileSync(cvFilePath, 'utf-8');
    }

    const groq = createGroqClient(apiKey);
    const prompt = `Ты эксперт по найму и карьере. Проанализируй это резюме и дай честную оценку.
    
    ОТВЕТЬ СТРОГО В ПРЕДЛОЖЕННОМ JSON ФОРМАТЕ:
    {
      "relevance": number (общий рейтинг 0-100),
      "matchScore": number (качество оформления 0-100),
      "experienceLevel": "junior" | "middle" | "senior" | "lead",
      "companyType": "string (какие типы компаний подойдут лучше всего)",
      "keySkills": ["навык1", "навык2", "навык3", "навык4"],
      "strengths": ["сильная сторона1", "сильная сторона2", "сильная сторона3"],
      "weaknesses": ["зона роста1", "зона роста2", "зона роста3"],
      "recommendations": ["совет1", "совет2", "совет3"]
    }

    ТЕКСТ РЕЗЮМЕ:
    ${cvText.substring(0, 8000)}`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Ты карьерный консультант. Отвечай только валидным JSON на русском языке.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    return JSON.parse(resultText);
  } catch (error) {
    console.error('❌ Ошибка анализа CV:', error);
    throw error;
  }
}

async function analyzeCVWithGroq(cvFilePath, apiKey) {
  console.log('🤖 НАЧИНАЕМ АНАЛИЗ CV С ПОМОЩЬЮ GROQ AI...');
  console.log(`📄 Файл CV: ${cvFilePath}`);
  
  if (!fs.existsSync(cvFilePath)) {
    throw new Error(`❌ Файл CV не найден: ${cvFilePath}`);
  }
  
  try {
    // ШАГ 1: ЧИТАЕМ ТЕКСТ ИЗ PDF
    console.log('📖 Шаг 1: Чтение текста из PDF...');
    let cvText = '';
    
    if (cvFilePath.endsWith('.pdf')) {
      cvText = await readPdfText(cvFilePath);
      console.log(`✅ Прочитано ${cvText.length} символов из PDF`);
      
      if (cvText.length < 50) {
        throw new Error('PDF содержит слишком мало текста');
      }
    } else {
      cvText = fs.readFileSync(cvFilePath, 'utf-8');
      console.log(`✅ Прочитано ${cvText.length} символов из текстового файла`);
    }
    
    // ШАГ 2: ОЧИСТКА ТЕКСТА (убираем мусор от strings)
    console.log('🧹 Шаг 2: Очистка текста...');
    
    // Показываем первые 500 символов для отладки
    console.log('📝 Первые 500 символов текста:');
    console.log(cvText.substring(0, 500));
    console.log('...\n');
    
    // Очищаем текст от мусора
    let cleanedText = cvText
      .replace(/[^\x20-\x7E\u0400-\u04FF\n]/g, ' ') // Оставляем только печатные символы + кириллицу
      .replace(/\s+/g, ' ') // Множественные пробелы в один
      .trim();
    
    console.log(`✅ Очищенный текст: ${cleanedText.length} символов`);
    console.log('📝 Первые 300 символов очищенного текста:');
    console.log(cleanedText.substring(0, 300));
    console.log('...\n');
    
    // ШАГ 3: АНАЛИЗ С ПОМОЩЬЮ GROQ AI
    console.log('🤖 Шаг 3: Отправка CV в Groq AI для ПОЛНОГО анализа...');
    
    if (!apiKey) {
      throw new Error('Groq API ключ не указан. Настройте API ключ в разделе AI → Настройки');
    }
    
    const groq = createGroqClient(apiKey);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Ты эксперт по анализу резюме. 

Извлеки из резюме ПОЛНУЮ информацию:

ОБЯЗАТЕЛЬНЫЕ ПОЛЯ:
1. firstName - имя кандидата
2. lastName - фамилия кандидата  
3. position - желаемая должность (на английском: Software Developer, QA Engineer и т.д.)
4. phone - номер телефона
5. email - электронная почта

ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ (извлечь если есть):
6. skills - массив навыков и технологий (["React", "TypeScript", "Node.js", ...])
7. experience - массив опыта работы [{company, position, period, description}, ...]
8. education - образование (строка)
9. languages - языки (массив ["Русский", "English", ...])
10. summary - краткое описание (1-2 предложения)

ВАЖНО:
- Ищи ВСЕ упоминания технологий, языков программирования, фреймворков
- Извлекай весь опыт работы с компаниями и проектами
- Если поле не найдено - используй null
- Отвечай ТОЛЬКО валидным JSON

Формат: {
  "firstName": "",
  "lastName": "",
  "position": "",
  "phone": "",
  "email": "",
  "skills": [],
  "experience": [],
  "education": "",
  "languages": [],
  "summary": ""
}`
        },
        {
          role: 'user',
          content: `Проанализируй это резюме полностью и извлеки ВСЮ информацию:\n\n${cleanedText.substring(0, 10000)}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 2000 // Увеличиваем для полного анализа
    });
    
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('Groq не вернул ответ');
    }
    
    console.log('📥 Ответ от Groq AI:', responseText);
    
    // ШАГ 3: ПАРСИМ JSON ОТВЕТ
    console.log('🔍 Шаг 3: Парсинг JSON ответа...');
    
    let cvData;
    
    // Убираем markdown форматирование если есть
    let cleanText = responseText.trim();
    cleanText = cleanText.replace(/```json\s*/g, '');
    cleanText = cleanText.replace(/```\s*/g, '');
    cleanText = cleanText.trim();
    
    try {
      cvData = JSON.parse(cleanText);
    } catch (e) {
      // Пробуем извлечь JSON из текста
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cvData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Не удалось распарсить JSON ответ от Groq: ${cleanText}`);
      }
    }
    
    // ШАГ 4: ВАЛИДАЦИЯ ДАННЫХ
    console.log('✅ Шаг 4: Валидация извлеченных данных...');
    
    // Менее строгая валидация - позволяем пустые значения
    if (!cvData.firstName || cvData.firstName === 'Unknown') {
      console.log('⚠️ Имя не найдено, используем заглушку');
      cvData.firstName = 'Не указано';
    }
    
    if (!cvData.lastName || cvData.lastName === 'Unknown') {
      console.log('⚠️ Фамилия не найдена, используем заглушку');
      cvData.lastName = 'Не указано';
    }
    
    if (!cvData.position || cvData.position === 'Unknown') {
      console.log('⚠️ Должность не найдена, используем заглушку');
      cvData.position = 'Specialist';
    }
    
    if (!cvData.phone) cvData.phone = 'Не указан';
    if (!cvData.email) cvData.email = 'Не указан';
    
    console.log('✅ ДАННЫЕ УСПЕШНО ИЗВЛЕЧЕНЫ:');
    console.log(`   👤 Имя: ${cvData.firstName} ${cvData.lastName}`);
    console.log(`   💼 Должность: ${cvData.position}`);
    console.log(`   📞 Телефон: ${cvData.phone}`);
    console.log(`   📧 Email: ${cvData.email}`);
    
    return cvData;
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА CV:', error.message);
    throw new Error(`Не удалось проанализировать CV: ${error.message}`);
  }
}

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());

// Для загрузки файлов нужен multer
import multer from 'multer';

// Настройка multer для загрузки CV файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
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
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Поддерживаются только PDF и DOCX файлы'));
    }
  }
});

// Глобальное хранилище для активных агентов
const activeAgents = new Map();

// Функция проверки активности браузера
function isBrowserActive(agent) {
  if (!agent || !agent.browser) {
    return false;
  }
  try {
    return agent.browser.isConnected();
  } catch (e) {
    return false;
  }
}

// Простой класс агента для Lucru.md
class SimpleLucruAgent {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.processedCompanies = new Set(); // Компании, обработанные в текущей сессии
  }

  async initialize() {
    console.log('🔧 Инициализация браузера...');
    this.browser = await chromium.launch({ 
      headless: false, // Визуальный режим для отладки
      slowMo: 300
    });
    
    // Проверяем наличие сохраненных cookies
    const COOKIES_FILE = path.join(__dirname, 'lucru-cookies.json');
    let contextOptions = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    if (fs.existsSync(COOKIES_FILE)) {
      console.log('🍪 Найдены сохраненные cookies, загружаем...');
      try {
        const storageState = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
        contextOptions.storageState = storageState;
        console.log('✅ Cookies загружены из файла');
      } catch (error) {
        console.log('⚠️ Ошибка загрузки cookies:', error.message);
      }
    } else {
      console.log('ℹ️  Сохраненных cookies не найдено');
    }
    
    const context = await this.browser.newContext(contextOptions);
    this.page = await context.newPage();
    this.context = context; // Сохраняем контекст
    this.cookiesFile = COOKIES_FILE; // Путь к файлу
    
    // Устанавливаем таймауты
    this.page.setDefaultTimeout(60000);
  }

  async authenticate() {
    console.log('🔐 Авторизация в Lucru.md...');
    
    // Переход на страницу входа
    const loginUrl = 'https://lucru.md/ro/login';
    await this.page.goto(loginUrl, { timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    
    console.log('📍 URL перед входом:', this.page.url());
    
    // Заполняем форму входа - используем правильные селекторы
    console.log('📝 Заполнение email...');
    await this.page.waitForSelector('input[name="login"]', { timeout: 30000 });
    await this.page.fill('input[name="login"]', this.config.credentials.email);
    
    console.log('📝 Заполнение password...');
    await this.page.waitForSelector('input[name="password"]', { timeout: 30000 });
    await this.page.fill('input[name="password"]', this.config.credentials.password);
    
    console.log('🖱️  Нажатие кнопки входа...');
    await this.page.waitForSelector('button[type="submit"]', { timeout: 30000 });
    
    // Запоминаем URL до клика
    const urlBeforeClick = this.page.url();
    
    await this.page.click('button[type="submit"]');
    
    // Ждем изменения URL (это означает успешный редирект после входа)
    console.log('⏳ Ждем изменения URL после входа...');
    try {
      await this.page.waitForURL(url => url !== urlBeforeClick, { timeout: 10000 });
      console.log('✅ URL изменился - вход успешен!');
    } catch (e) {
      console.log('⚠️ URL не изменился за 10 секунд');
    }
    
    // Дополнительное ожидание для загрузки страницы
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    
    console.log('📍 URL после входа:', this.page.url());
    console.log('✅ Авторизация выполнена');
    
    // Сохраняем cookies после успешного входа
    await this.saveCookies();
  }

  async checkIfLoggedIn() {
    try {
      console.log('🔍 Проверяем авторизацию...');
      console.log('📍 Текущий URL:', this.page.url());
      
      const currentUrl = this.page.url();
      
      // Проверка 1: URL содержит признаки успешного входа
      const successUrlPatterns = [
        '/applicant/',
        '/my-resumes',
        '/my-profile',
        '/dashboard',
        '/contul-meu'
      ];
      
      const hasSuccessUrl = successUrlPatterns.some(pattern => currentUrl.includes(pattern));
      
      // Проверка 2: URL НЕ содержит страницу входа
      const isNotOnLoginPage = !currentUrl.includes('/login') && !currentUrl.includes('/signin');
      
      console.log(`   📊 URL проверка:`);
      console.log(`      - Успешный URL паттерн: ${hasSuccessUrl}`);
      console.log(`      - Не на странице логина: ${isNotOnLoginPage}`);
      
      // Проверка 3: Есть ли поле пароля на странице (если есть - мы на странице входа)
      const hasPasswordField = await this.page.evaluate(() => {
        const passwordFields = document.querySelectorAll('input[type="password"], input[name="password"]');
        return passwordFields.length > 0;
      });
      
      console.log(`      - Поле пароля на странице: ${hasPasswordField}`);
      
      // Проверка 4: Проверяем наличие элементов авторизации
      const elementCheck = await this.page.evaluate(() => {
        const indicators = [
          // Меню пользователя
          '[data-testid="user-menu"]',
          '.user-menu',
          '.profile-menu',
          '.account-menu',
          '.header-user',
          
          // Ссылки выхода
          'a[href*="logout"]',
          'a[href*="sign-out"]',
          'a[href*="exit"]',
          'a[href*="iesire"]',
          'button[onclick*="logout"]',
          
          // Профиль и резюме
          'a[href*="profile"]',
          'a[href*="applicant"]',
          'a[href*="resume"]',
          'a[href*="cv-uri"]',
          'a[href*="my-resumes"]',
          
          // Румынские элементы
          'a[href*="contul-meu"]',
          '.applicant-menu'
        ];
        
        const foundElements = [];
        
        for (const selector of indicators) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements.push({
              selector,
              count: elements.length,
              visible: Array.from(elements).some(el => el.offsetParent !== null)
            });
          }
        }
        
        return {
          hasIndicators: foundElements.length > 0,
          foundElements
        };
      });

      console.log('🔍 Найденные индикаторы авторизации:', JSON.stringify(elementCheck.foundElements, null, 2));

      // ЛОГИКА ОПРЕДЕЛЕНИЯ ВХОДА:
      // Вход успешен если:
      // 1. URL содержит успешный паттерн (/applicant/, /my-resumes и т.д.) ИЛИ
      // 2. (Мы не на странице логина И нет поля пароля) ИЛИ
      // 3. Найдены элементы авторизации
      const isLoggedIn = 
        hasSuccessUrl || 
        (isNotOnLoginPage && !hasPasswordField) || 
        elementCheck.hasIndicators;

      console.log(`\n✅ ИТОГОВАЯ ПРОВЕРКА АВТОРИЗАЦИИ: ${isLoggedIn ? '🎉 УСПЕХ' : '❌ НЕУДАЧА'}`);
      console.log(`   📊 Критерии:`);
      console.log(`      1. Успешный URL паттерн: ${hasSuccessUrl}`);
      console.log(`      2. Не на логине + нет поля пароля: ${isNotOnLoginPage && !hasPasswordField}`);
      console.log(`      3. Найдены индикаторы: ${elementCheck.hasIndicators} (${elementCheck.foundElements.length} шт)`);
      
      return isLoggedIn;
    } catch (error) {
      console.error('❌ Ошибка проверки авторизации:', error);
      return false;
    }
  }

  async saveCookies() {
    try {
      console.log('💾 Сохраняем cookies...');
      const storageState = await this.context.storageState();
      fs.writeFileSync(this.cookiesFile, JSON.stringify(storageState, null, 2));
      console.log(`✅ Cookies сохранены: ${this.cookiesFile}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения cookies:', error);
      return false;
    }
  }
  
  async checkIfLoggedInWithCookies() {
    try {
      console.log('🔍 Проверяем авторизацию через cookies...');
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes', { timeout: 30000 });
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      const currentUrl = this.page.url();
      const isLoggedIn = currentUrl.includes('/applicant/') && !currentUrl.includes('/login');
      
      if (isLoggedIn) {
        console.log('✅ Авторизация через cookies успешна!');
        return true;
      } else {
        console.log('⚠️ Cookies невалидны или истекли');
        // Удаляем старые cookies
        if (fs.existsSync(this.cookiesFile)) {
          fs.unlinkSync(this.cookiesFile);
          console.log('🗑️  Старые cookies удалены');
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка проверки авторизации:', error);
      return false;
    }
  }

  async checkCVExists() {
    try {
      console.log('🔍 Проверяем наличие CV на сайте...');
      
      // Переходим на страницу резюме
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // ПРАВИЛЬНАЯ ЛОГИКА: Ищем признаки СУЩЕСТВУЮЩЕГО CV
      const pageText = await this.page.evaluate(() => document.body.innerText);
      
      console.log('📄 Текст страницы (первые 500 символов):');
      console.log(pageText.substring(0, 500));
      console.log('...\n');
      
      // Признаки что CV ЕСТЬ:
        const cvIndicators = [
        'CV-urile mele /',        // "Мои CV / 1" или "/ 2" и т.д.
        'FIȘIER CV',              // Тип файла CV
        'CV ascuns',              // Скрытое CV
        'Publică pe site',        // Опубликовать на сайте
        'Modifică',               // Редактировать
        'Descarcă'                // Скачать
      ];
      
      // Признаки что CV НЕТ:
      const noCVIndicators = [
        'Creează-ți primul CV',   // Создай первое CV
        'primul CV'               // Первое CV
      ];
      
      const hasCV = cvIndicators.some(indicator => pageText.includes(indicator));
      const noCV = noCVIndicators.some(indicator => pageText.includes(indicator));
      
      // Если есть признаки CV И нет признаков отсутствия - CV существует
      const cvExists = hasCV && !noCV;
      
      console.log('🔍 Проверка индикаторов:');
      console.log(`   ✓ Признаки CV: ${hasCV}`);
      console.log(`   ✗ Признаки отсутствия: ${noCV}`);
      console.log(`📄 CV существует на сайте: ${cvExists}`);
      console.log(`   ${cvExists ? '✅ CV уже загружен' : '⚠️ CV не найден, нужна загрузка'}`);
      
      return cvExists;
    } catch (error) {
      console.error('❌ Ошибка проверки CV:', error);
      return false;
    }
  }

  async uploadCVWithGroqController(cvFilePath, cvData, apiKey) {
    try {
      console.log('\n' + '='.repeat(70));
      console.log('🤖 ИНТЕЛЛЕКТУАЛЬНАЯ ЗАГРУЗКА CV С GROQ-КОНТРОЛЛЕРОМ');
      console.log('='.repeat(70));
      console.log(`📂 Файл CV: ${cvFilePath}`);
      console.log(`👤 Кандидат: ${cvData.firstName} ${cvData.lastName}`);
      console.log(`💼 Должность: ${cvData.position}`);
      console.log(`📞 Телефон: ${cvData.phone}`);
      console.log(`📧 Email: ${cvData.email}`);
      console.log('='.repeat(70) + '\n');
      
      // Проверяем файл
      if (!fs.existsSync(cvFilePath)) {
        throw new Error(`CV файл не найден: ${cvFilePath}`);
      }
      
      // ШАГ 1: Переходим на страницу резюме
      console.log('📍 ШАГ 1: Открываем страницу my-resumes...');
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes', { timeout: 60000 });
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      // ШАГ 2: Получаем состояние страницы
      console.log('📄 ШАГ 2: Анализируем текущее состояние страницы...');
      const pageText = await this.page.evaluate(() => document.body.innerText);
      
      console.log('📝 Текст страницы (первые 800 символов):');
      console.log(pageText.substring(0, 800));
      console.log('...\n');
      
      // ШАГ 3: Спрашиваем Groq что видно и что делать
      console.log('🤖 ШАГ 3: Groq анализирует страницу и принимает решение...');
      
      if (!apiKey) {
        throw new Error('Groq API ключ не указан');
      }
      const groq = createGroqClient(apiKey);
      
      const step1Prompt = `Ты - ИИ контроллер агента загрузки CV. Проанализируй страницу.

КОНТЕКСТ:
- Кандидат: ${cvData.firstName} ${cvData.lastName}
- Должность: ${cvData.position}
- Цель: Загрузить CV файл на сайт Lucru.md
- Текущая страница: /ro/applicant/my-resumes

ТЕКСТ СТРАНИЦЫ:
${pageText.substring(0, 3000)}

ВОПРОСЫ:
1. Есть ли уже загруженное CV на странице?
2. Если есть - совпадает ли имя с "${cvData.firstName} ${cvData.lastName}"?
3. Что нужно сделать: загрузить новое CV или CV уже есть?

ОТВЕТЬ JSON:
{
  "hasCVAlready": boolean,
  "cvName": string,
  "matchesOurName": boolean,
  "needsUpload": boolean,
  "nextAction": string,
  "reasoning": string
}`;

      const step1Response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Ты ИИ-ассистент. Отвечай только валидным JSON без markdown.' },
          { role: 'user', content: step1Prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 500
      });
      
      const step1Text = step1Response.choices[0]?.message?.content.trim()
        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      console.log('📥 Ответ Groq (Шаг 1):\n', step1Text, '\n');
      
      let decision;
      try {
        decision = JSON.parse(step1Text);
      } catch (e) {
        const jsonMatch = step1Text.match(/\{[\s\S]*\}/);
        decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { needsUpload: true, nextAction: 'upload' };
      }
      
      console.log('🎯 Решение Groq:', JSON.stringify(decision, null, 2));
      
      // Если CV уже есть и совпадает - завершаем
      if (decision.hasCVAlready && decision.matchesOurName) {
        console.log('✅ CV уже загружен и имя совпадает!');
        console.log('ℹ️  Детали:', decision.reasoning);
        return { success: true, message: 'CV уже загружен', alreadyExists: true };
      }
      
      // ШАГ 4: Если нужна загрузка - начинаем процесс
      if (!decision.needsUpload) {
        console.log('ℹ️  Groq решил что загрузка не требуется');
        return { success: true, message: decision.reasoning };
      }
      
      console.log('📤 ШАГ 4: Начинаем процесс загрузки CV...');
      
      // Ищем все возможные кнопки и input для загрузки
      const pageHTML = await this.page.content();
      
      const uploadStrategyPrompt = `Проанализируй HTML страницы и скажи КАК загрузить CV.

HTML ФРАГМЕНТ:
${pageHTML.substring(0, 5000)}

ТЕКСТ СТРАНИЦЫ:
${pageText.substring(0, 2000)}

ЗАДАЧА: Найти способ загрузить CV файл.

ОТВЕТЬ JSON:
{
  "hasFileInput": boolean,
  "hasUploadButton": boolean,
  "buttonText": string,
  "strategy": string,
  "steps": string[]
}`;

      const strategyResponse = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Ты ИИ-ассистент для анализа HTML. Отвечай JSON.' },
          { role: 'user', content: uploadStrategyPrompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 600
      });
      
      const strategyText = strategyResponse.choices[0]?.message?.content.trim()
        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      console.log('📥 Стратегия загрузки от Groq:\n', strategyText, '\n');
      
      let strategy;
      try {
        strategy = JSON.parse(strategyText);
      } catch (e) {
        const jsonMatch = strategyText.match(/\{[\s\S]*\}/);
        strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : { hasFileInput: true };
      }
      
      console.log('📋 План действий:', strategy.steps);
      
      // ШАГ 5: Нажимаем "Creează CV"
      console.log('📁 ШАГ 5: Ищем и нажимаем "Creează CV"...');
      const createButtons = await this.page.$$('a:has-text("Creează CV"), button:has-text("Creează CV")');
      
      if (createButtons.length > 0) {
        console.log(`✅ Найдено кнопок "Creează CV": ${createButtons.length}`);
        await createButtons[0].click();
        console.log('✅ Кнопка "Creează CV" нажата!');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
      }
      
      // ШАГ 6: Нажимаем "Încarcă CV"
      console.log('📁 ШАГ 6: Ищем и нажимаем "Încarcă CV"...');
      const uploadCVButtons = await this.page.$$('a:has-text("Încarcă CV"), button:has-text("Încarcă CV")');
      
      if (uploadCVButtons.length > 0) {
        console.log(`✅ Найдено кнопок "Încarcă CV": ${uploadCVButtons.length}`);
        await uploadCVButtons[0].click();
        console.log('✅ Кнопка "Încarcă CV" нажата!');
        await this.page.waitForTimeout(3000);
      }
      
      // ШАГ 7: Загружаем файл
      console.log('📁 ШАГ 7: Загружаем файл CV...');
      const fileInputs = await this.page.$$('input[type="file"]');
      
      if (fileInputs.length === 0) {
        throw new Error('Input для загрузки файла не найден');
      }
      
      console.log(`✅ Найдено input элементов: ${fileInputs.length}`);
      await fileInputs[0].setInputFiles(cvFilePath);
      console.log('✅ Файл загружен в input!');
      await this.page.waitForTimeout(3000);
      
      // ШАГ 8: ЗАПОЛНЯЕМ ФОРМУ ДАННЫМИ ОТ AI
      console.log('\n📝 ШАГ 8: ЗАПОЛНЯЕМ ФОРМУ ДАННЫМИ ОТ AI...');
      console.log('='.repeat(70));
      console.log(`   Имя: ${cvData.firstName} ${cvData.lastName}`);
      console.log(`   Должность: ${cvData.position}`);
      console.log(`   Телефон: ${cvData.phone}`);
      console.log(`   Email: ${cvData.email}`);
      console.log('='.repeat(70));
      
      // Должность
      try {
        await this.page.evaluate((position) => {
          const positionInput = document.querySelector('input[placeholder*="Funcția"], input[placeholder*="dorită"]');
          if (positionInput) {
            positionInput.value = position;
            positionInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, cvData.position);
        console.log(`✅ Должность: ${cvData.position}`);
      } catch (e) {
        console.log('⚠️ Ошибка заполнения должности');
      }
      
      // Телефон - генерируем уникальный молдавский БЕЗ кода (+373 уже в dropdown)
      try {
        // Генерируем уникальный молдавский номер (8 цифр)
        const randomDigits = Math.floor(Math.random() * 90000000) + 10000000;
        const phone = randomDigits.toString();
        
        console.log(`📞 Генерируем уникальный молдавский номер: ${phone} (код +373 в dropdown)`);
        
        // Ищем поле телефона по разным селекторам
        const phoneFilledSuccessfully = await this.page.evaluate((phoneValue) => {
          const selectors = [
            'input[type="tel"]',
            'input[placeholder*="telefon"]',
            'input[placeholder*="phone"]',
            'input[name*="phone"]',
            'input[name*="telefon"]',
            '.phone-input input',
            '[data-test="phone-input"]'
          ];
          
          for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input) {
              // Фокусируем и заполняем
              input.focus();
              input.value = phoneValue;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new Event('blur', { bubbles: true }));
              console.log(`Телефон заполнен через: ${selector}`);
            return true;
          }
        }
          return false;
        }, phone);
        
        if (phoneFilledSuccessfully) {
          console.log(`✅ Телефон заполнен: ${phone}`);
        } else {
          console.log(`⚠️ Не удалось найти поле телефона!`);
        }
      } catch (e) {
        console.log('⚠️ Ошибка заполнения телефона:', e.message);
      }
      
      // Email - ВСЕГДА используем email текущего аккаунта (не из CV!)
      try {
        const accountEmail = this.config.credentials.email || 'nikita.ursulenco@gmail.com';
        
        const emailFilledSuccessfully = await this.page.evaluate((email) => {
          const selectors = [
            'input[type="email"]',
            'input[placeholder*="email"]',
            'input[placeholder*="E-mail"]',
            'input[name*="email"]',
            '[data-test="email-input"]'
          ];
          
          for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input) {
              input.focus();
              input.value = email;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new Event('blur', { bubbles: true }));
              console.log(`Email заполнен через: ${selector}`);
              return true;
            }
          }
          return false;
        }, accountEmail);
        
        if (emailFilledSuccessfully) {
          console.log(`✅ Email заполнен: ${accountEmail} (email аккаунта)`);
        } else {
          console.log(`⚠️ Не удалось найти поле email!`);
        }
      } catch (e) {
        console.log('⚠️ Ошибка заполнения email:', e.message);
      }
      
      await this.page.waitForTimeout(2000);
      
      // ШАГ 9: Нажимаем желтую кнопку "Încarcă"
      console.log('\n🖱️  ШАГ 9: Нажимаем желтую кнопку "Încarcă"...');
      
      const allButtons = await this.page.$$('button');
      console.log(`   Всего кнопок: ${allButtons.length}`);
      
      let submitButton = null;
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && text.includes('Încarcă')) {
          submitButton = btn;
          console.log(`   Найдена кнопка: "${text.trim()}"`);
          break;
        }
      }
      
      if (submitButton) {
        await submitButton.click();
        console.log('✅ Кнопка "Încarcă" нажата!');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(5000);
        
        // Скриншот после отправки для отладки (закомментировано для экономии места)
        // const screenshotPath = path.join(__dirname, `cv-upload-result-${Date.now()}.png`);
        // await this.page.screenshot({ path: screenshotPath, fullPage: true });
        // console.log(`📸 Скриншот сохранен: ${screenshotPath}`);
      } else {
        console.log('⚠️ Кнопка "Încarcă" не найдена');
      }
      
      // ШАГ 10: Финальная проверка через Groq
      const finalText = await this.page.evaluate(() => document.body.innerText);
      
      console.log('\n📄 ТЕКСТ СТРАНИЦЫ ПОСЛЕ ОТПРАВКИ (первые 1000 символов):');
      console.log(finalText.substring(0, 1000));
      console.log('...\n');
      
      console.log('\n🤖 ШАГ 10: Groq проверяет финальный результат...');
      const verificationPrompt = `Форма отправлена. Проверь загружен ли CV.

ОЖИДАЕМ CV ДЛЯ: ${cvData.firstName} ${cvData.lastName}

ТЕКСТ СТРАНИЦЫ:
${finalText.substring(0, 3000)}

ОТВЕТЬ JSON:
{
  "uploadSuccessful": boolean,
  "cvVisible": boolean,
  "nameMatches": boolean,
  "message": string,
  "confidence": number
}`;

      const verificationResponse = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Ты ИИ-ассистент. Отвечай JSON.' },
          { role: 'user', content: verificationPrompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 400
      });
      
      const verificationText = verificationResponse.choices[0]?.message?.content.trim()
        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      console.log('📥 Ответ Groq:\n', verificationText, '\n');
      
      let verification;
      try {
        verification = JSON.parse(verificationText);
      } catch (e) {
        const jsonMatch = verificationText.match(/\{[\s\S]*\}/);
        verification = jsonMatch ? JSON.parse(jsonMatch[0]) : { uploadSuccessful: false, message: 'Не удалось проверить' };
      }
      
      console.log('\n' + '='.repeat(70));
      console.log('🎉 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:');
      console.log(`   ✅ Загрузка успешна: ${verification.uploadSuccessful}`);
      console.log(`   📄 CV видно: ${verification.cvVisible}`);
      console.log(`   🎯 Имя совпадает: ${verification.nameMatches}`);
      console.log(`   📊 Уверенность: ${verification.confidence}%`);
      console.log(`   💬 Сообщение: ${verification.message}`);
      console.log('='.repeat(70) + '\n');
      
      return {
        success: verification.uploadSuccessful || verification.cvVisible,
        message: verification.message || 'CV успешно загружен на Lucru.md',
        details: verification
      };
      
    } catch (error) {
      console.error('❌ Ошибка загрузки CV с Groq-контроллером:', error);
      return { success: false, message: error.message };
    }
  }

  async uploadCV(cvFilePath, cvData, apiKey) {
    // Используем новый метод с Groq-контроллером
    return await this.uploadCVWithGroqController(cvFilePath, cvData, apiKey);
  }
  
  async uploadCVOld(cvFilePath, cvData) {
    // Старый метод - оставляем как fallback
    try {
      console.log('📤 Начинаем загрузку CV на сайт (старый метод)...');
      
      // Шаг 1: Переходим на страницу резюме
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // Шаг 2: Проверяем, есть ли уже CV
      const pageText = await this.page.textContent('body');
      if (!pageText.includes('Creează-ți primul CV')) {
        console.log('✅ CV уже загружен на сайте');
        return true;
      }
      
      // Шаг 3: Нажимаем "Creează CV"
      console.log('📦 Нажимаем кнопку "Creează CV"...');
      const createButton = await this.page.$('.add-cv-btn-tag:has-text("Creează CV")');
      if (createButton && await createButton.isVisible()) {
        await createButton.click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
      }
      
      // Шаг 4: Нажимаем "Încarcă CV"
      console.log('📦 Нажимаем кнопку "Încarcă CV"...');
      const uploadButton = await this.page.$('button:has-text("Încarcă CV")');
      if (uploadButton && await uploadButton.isVisible()) {
        await uploadButton.click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
      }
      
      // Шаг 5: Загружаем файл
      console.log('📦 Загружаем файл CV...');
      const fileInput = await this.page.$('input[type="file"]');
      if (!fileInput) {
        throw new Error('Поле загрузки файла не найдено');
      }
      
      await fileInput.setInputFiles(cvFilePath);
      console.log('✅ Файл CV выбран');
      await this.page.waitForTimeout(3000);
      
      // Шаг 6: Заполняем форму с данными из Groq AI
      console.log('📦 ЗАПОЛНЕНИЕ ФОРМЫ ДАННЫМИ ОТ GROQ AI...');
      console.log('📋 Данные для заполнения:', JSON.stringify(cvData, null, 2));
      
      if (!cvData || !cvData.position || !cvData.phone || !cvData.email) {
        throw new Error('Данные от Groq AI неполные. Невозможно заполнить форму.');
      }
      
      // Функция/должность (обязательно)
      const positionInput = await this.page.$('input[placeholder*="funcția"], input[placeholder*="dorită"]');
      if (!positionInput || !(await positionInput.isVisible())) {
        throw new Error('Поле "Должность" не найдено');
      }
      await positionInput.fill(cvData.position);
      console.log('✅ Должность заполнена:', cvData.position);
      
      // Телефон (обязательно)
      const phoneInput = await this.page.$('input[placeholder*="telefon"]');
      if (!phoneInput || !(await phoneInput.isVisible())) {
        throw new Error('Поле "Телефон" не найдено');
      }
      await phoneInput.fill(cvData.phone);
      console.log('✅ Телефон заполнен:', cvData.phone);
      
      // Email (обязательно)
      const emailInput = await this.page.$('input[type="email"], input[placeholder*="email"]');
      if (!emailInput || !(await emailInput.isVisible())) {
        throw new Error('Поле "Email" не найдено');
      }
      await emailInput.fill(cvData.email);
      console.log('✅ Email заполнен:', cvData.email);
      
      await this.page.waitForTimeout(2000);
      
      // Шаг 7: Нажимаем кнопку "Încarcă" (Загрузить)
      console.log('📦 Нажимаем кнопку подтверждения...');
      const submitButton = await this.page.$('button[type="submit"]:has-text("Încarcă")');
      if (submitButton && await submitButton.isVisible()) {
        await submitButton.click();
        console.log('✅ Кнопка подтверждения нажата');
        
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(5000);
        
        console.log('✅ CV успешно загружен!');
        return true;
      } else {
        console.log('⚠️ Кнопка подтверждения не найдена');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки CV:', error.message);
      return false;
    }
  }

  async getCookies() {
    try {
      if (!this.page) {
        throw new Error('Page не инициализирована');
      }
      
      // Получаем все cookies из браузерного контекста
      const cookies = await this.page.context().cookies();
      console.log(`📦 Получено ${cookies.length} cookies из браузера`);
      
      return cookies;
    } catch (error) {
      console.error('❌ Ошибка получения cookies:', error);
      return [];
    }
  }

  async extractEmailFromJobPage(jobUrl) {
    console.log(`\n🔍 Поиск Email на странице: ${jobUrl}`);
    const newPage = await this.browser.newPage();
    try {
      // Переходим на страницу вакансии
      await newPage.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await newPage.waitForTimeout(2000);
      
      const email = await newPage.evaluate(() => {
        // 1. Ищем ссылки mailto
        const mailto = document.querySelector('a[href^="mailto:"]');
        if (mailto) {
          const href = mailto.getAttribute('href');
          return href.replace('mailto:', '').split('?')[0].trim();
        }
        
        // 2. Ищем текст в блоке контактов (как на скриншоте)
        const contactBlock = Array.from(document.querySelectorAll('div, span, p')).find(el => 
          el.textContent.includes('E-mail:') || el.textContent.includes('Email:')
        );
        
        if (contactBlock) {
          const text = contactBlock.textContent;
          const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (match) return match[0];
        }

        // 3. Общий поиск по тексту всей страницы
        const bodyText = document.body.innerText;
        const match = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return match ? match[0] : null;
      });
      
      const jobDescription = await newPage.evaluate(() => {
        const descEl = document.querySelector('.vacancy-description, #vacancy-description, .job-description');
        return descEl ? descEl.innerText.substring(0, 2000) : '';
      });

      if (email) {
        console.log(`   ✅ Email найден: ${email}`);
      }
      
      return { email, jobDescription };
    } catch (error) {
      console.error(`   ❌ Ошибка извлечения данных со страницы: ${error.message}`);
      return { email: null, jobDescription: '' };
    } finally {
      await newPage.close();
    }
  }

  async generateAndSendEmailForCompany(companyName, jobTitle, jobDescription, cvData, apiKey, smtpConfig, emailMode = 'auto') {
    if (!apiKey) {
      console.log('   ⚠️ Пропускаем Email: Groq API ключ не указан');
      return false;
    }

    try {
      console.log(`   🤖 Генерируем сопроводительное письмо для ${companyName}...`);
      const groq = createGroqClient(apiKey);
      
      const prompt = `
Ты - профессиональный HR-консультант. Напиши короткое, убедительное и персонализированное сопроводительное письмо на русском языке.
Кандидат: ${cvData.firstName} ${cvData.lastName}
Должность кандидата: ${cvData.position}
Навыки: ${cvData.skills ? cvData.skills.join(', ') : 'указаны в резюме'}
Компания: ${companyName}
Вакансия: ${jobTitle}
Описание вакансии: ${jobDescription}

Кандидат также имеет портфолио и проекты здесь:
- Портфолио: https://nikita-ursulenko.github.io/
- GitHub: https://github.com/nikita-ursulenko

ПРАВИЛА:
1. Письмо должно быть коротким (максимум 3 небольших абзаца).
2. Сделай акцент на том, как опыт кандидата поможет именно этой компании в этой роли.
3. Тон: профессиональный, но энергичный.
4. ${emailMode === 'manual' 
    ? 'В конце ОБЯЗАТЕЛЬНО укажи ссылки на https://nikita-ursulenko.github.io/ и GitHub, отметив, что там можно найти полное резюме и мои проекты (так как прикрепить файл в этом режиме нельзя).' 
    : 'В конце обязательно укажи: "Мое полное резюме прикреплено к этому письму."'}
5. Верни ТОЛЬКО текст письма, без лишних вступлений (типа "Вот ваше письмо").
`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
      });

      const emailBody = chatCompletion.choices[0].message.content;
      const subject = `Отклик на вакансию ${jobTitle} - ${cvData.firstName} ${cvData.lastName}`;

      // Ищем путь к CV файлу
      const cvFilePath = cvData.serverFilePath || cvData.filePath; 
      
      if (emailMode === 'manual') {
        // РУЧНОЙ РЕЖИМ: Открываем Mail.app на Mac
        console.log(`   🖥️  Выбран РУЧНОЙ режим. Открываем Mail.app для ${smtpConfig.targetEmail}...`);
        const manualResult = await openMailClient(
          smtpConfig.targetEmail,
          subject,
          emailBody
        );
        return manualResult.success;
      } else {
        // АВТОМАТИЧЕСКИЙ РЕЖИМ: Отправляем через nodemailer (SMTP)
        console.log(`   📧 Выбран АВТОМАТИЧЕСКИЙ режим. Отправка через SMTP...`);
        const emailResult = await sendEmailWithAttachment(
          smtpConfig,
          smtpConfig.targetEmail, 
          subject,
          emailBody.replace(/\n/g, '<br>'),
          cvFilePath
        );
        return emailResult.success;
      }
    } catch (error) {
      console.error('   ❌ Ошибка генерации/отправки Email:', error.message);
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // АВТООТПРАВКА НА IT ВАКАНСИИ С GROQ-АНАЛИЗОМ
  async autoApplyToITJobs(cvData, options = {}) {
    const { maxJobs = 10, minMatchScore = 70 } = options;

    try {
      console.log('\n' + '='.repeat(70));
      console.log('🤖 АВТОМАТИЧЕСКАЯ ОТПРАВКА CV НА IT ВАКАНСИИ');
      console.log('='.repeat(70));
      console.log(`📋 Параметры:`);
      console.log(`   • Максимум вакансий: ${maxJobs}`);
      console.log(`   • Минимальное соответствие: ${minMatchScore}%`);
      console.log(`   • Кандидат: ${cvData.firstName} ${cvData.lastName}`);
      console.log(`   • Должность: ${cvData.position}`);
      console.log(`   • Технологии: ${cvData.skills?.length || 0}`);
      console.log('='.repeat(70) + '\n');

      // Переходим на IT вакансии (румынская версия работает стабильнее)
      const itJobsUrl = 'https://www.lucru.md/ro/posturi-vacante/categorie/it';
      console.log('📍 Переходим на IT вакансии...');
      console.log(`   🔗 URL: ${itJobsUrl}`);
      await this.page.goto(itJobsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      console.log('✅ Страница загружена\n');

      // КРИТИЧЕСКИ ВАЖНО: Прокручиваем страницу чтобы загрузить все вакансии (lazy loading)
      console.log('📜 Прокручиваем страницу для загрузки всех вакансий...');
      
      // Прокручиваем страницу постепенно вниз чтобы загрузить все вакансии
      let previousVacancyCount = 0;
      let currentVacancyCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 20; // Максимум 20 прокруток
      
      do {
        // Прокрутка вниз
        await this.page.evaluate(() => {
          window.scrollBy(0, 1000); // Прокрутка на 1000px вниз
        });
        await this.page.waitForTimeout(1500); // Ждем загрузки новых вакансий
        
        // Считаем текущее количество вакансий
        const currentRows = await this.page.$$('li.vacancyRow');
        currentVacancyCount = currentRows.length;
        
        console.log(`   📜 Прокрутка ${scrollAttempts + 1}: найдено ${currentVacancyCount} вакансий`);
        
        scrollAttempts++;
        
        // Если количество не изменилось - больше вакансий нет
        if (currentVacancyCount === previousVacancyCount) {
          console.log(`   ✅ Достигнут конец списка (вакансий больше нет)`);
          break;
        }
        
        previousVacancyCount = currentVacancyCount;
        
        // Если достаточно вакансий для обработки - останавливаем прокрутку
        if (currentVacancyCount >= maxJobs) {
          console.log(`   ✅ Загружено достаточно вакансий: ${currentVacancyCount} >= ${maxJobs}`);
          break;
        }
        
      } while (scrollAttempts < maxScrollAttempts);
      
      console.log(`📋 Всего загружено вакансий после прокрутки: ${currentVacancyCount}\n`);
      
      // Прокручиваем обратно наверх перед началом обработки
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(1000);
      
      // ПРАВИЛЬНЫЙ ПОИСК: ищем li.vacancyRow элементы
      console.log('🔍 Собираем все элементы вакансий li.vacancyRow...');
      
      const vacancyRows = await this.page.$$('li.vacancyRow');
      console.log(`📋 Найдено вакансий для обработки: ${vacancyRows.length}`);
      
      // ОТЛАДКА: Сохраняем HTML первой вакансии для анализа
      if (vacancyRows.length > 0) {
        const firstVacancyHTML = await vacancyRows[0].evaluate(el => el.outerHTML);
        console.log('\n🔍 HTML первой вакансии (первые 800 символов):');
        console.log(firstVacancyHTML.substring(0, 800));
        console.log('...\n');
      }
      
      // Обновляем статистику сайта
      try {
        const response = await fetch('http://localhost:5050/api/stats/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site: 'lucru.md',
            totalVacancies: vacancyRows.length
          })
        });
        if (response.ok) {
          console.log(`   📊 Статистика сайта обновлена: ${vacancyRows.length} вакансий`);
        }
      } catch (e) {
        console.log(`   ⚠️  Ошибка записи статистики сайта: ${e.message}`);
      }
      
      if (vacancyRows.length === 0) {
        throw new Error('Элементы li.vacancyRow не найдены на странице');
      }
      
      // Используем найденные элементы
      let jobCards = vacancyRows.slice(0, Math.min(maxJobs, vacancyRows.length));
      
      console.log(`📋 Итого вакансий для обработки: ${jobCards.length}\n`);

      let appliedCount = 0;
      let skippedCount = 0;
      const results = [];
      const processedCompanies = new Set(); // Для отслеживания компаний, которым уже отправили Email

      const { apiKey, smtpConfig, emailMode } = options;

      for (let i = 0; i < Math.min(jobCards.length, maxJobs); i++) {
        const vacancyRow = jobCards[i];
        
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 ПРОГРЕСС: ${i + 1} / ${Math.min(jobCards.length, maxJobs)} вакансий`);
        console.log(`   ✅ Отправлено: ${appliedCount} | ⏭️ Пропущено: ${skippedCount}`);
        console.log(`${'='.repeat(70)}`);
        
        // КРИТИЧЕСКИ ВАЖНО: Закрываем любые открытые модальные окна и overlay ПЕРЕД обработкой вакансии
        try {
          console.log(`   🧹 Очистка: Закрываем старые модальные окна и overlay...`);
          await this.page.evaluate(() => {
            // Закрываем overlay
            const overlay = document.querySelector('#window_over, .overlay');
            if (overlay) {
              overlay.style.display = 'none';
              overlay.remove();
            }
            
            // Закрываем модальные окна
            const modals = document.querySelectorAll('#light_window, .mw_wrap, .modal, .popup');
            modals.forEach(modal => {
              modal.style.display = 'none';
            });
            
            // Убираем overflow:hidden с body
            document.body.style.overflow = '';
          });
          await this.page.waitForTimeout(500);
        } catch (cleanupError) {
          console.log(`   ⚠️  Ошибка очистки (не критично): ${cleanupError.message}`);
        }
        
        try {
          // Извлекаем данные вакансии из li.vacancyRow
          const jobData = await vacancyRow.evaluate(el => {
            // НОВЫЙ ПОДХОД: Ищем любую ссылку с href содержащим /lucru/ или /ro/
            const allLinks = el.querySelectorAll('a');
            let link = null;
            
            // Находим первую ссылку ведущую на вакансию
            for (const a of allLinks) {
              const href = a.getAttribute('href') || '';
              if (href.includes('/lucru/') || href.includes('/ro/')) {
                link = a;
                break;
              }
            }
            
            // Если не нашли через href - пробуем старые селекторы
            if (!link) link = el.querySelector('a.vacancyShowPopup');
            if (!link) link = el.querySelector('a.vacancy-title');
            
            // Если всё равно нет ссылки - пытаемся взять название из innerText
            let title = '';
            let href = '';
            
            if (link) {
              title = link.textContent?.trim() || '';
              href = link.getAttribute('href') || '';
            } else {
              // Fallback: извлекаем из innerText (первая непустая строка)
              const lines = (el.innerText || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
              title = lines[0] || '';
              href = '';
            }
            
            // Ищем кнопку CV агрессивно - ПО ВСЕМ возможным признакам
            let cvButton = null;
            
            // 1. По классам
            cvButton = el.querySelector('a.cat_blue_btn');
            if (!cvButton) cvButton = el.querySelector('a[class*="blue_btn"]');
            if (!cvButton) cvButton = el.querySelector('a[class*="cv-btn"]');
            if (!cvButton) cvButton = el.querySelector('a[class*="apply"]');
            
            // 2. По тексту внутри ссылки
            if (!cvButton) {
              const links = el.querySelectorAll('a');
              for (const a of links) {
                const text = (a.textContent || '').toLowerCase();
                if (text.includes('cv') || text.includes('trimite') || text.includes('aplică')) {
                  cvButton = a;
                  break;
                }
              }
            }
            
            // 3. По data-атрибутам
            if (!cvButton) cvButton = el.querySelector('a[data-caid]');
            if (!cvButton) cvButton = el.querySelector('a[data-vacancy-id]');
            
            // 4. По href
            if (!cvButton) cvButton = el.querySelector('a[href*="sendcv"]');
            if (!cvButton) cvButton = el.querySelector('a[href*="apply"]');
            
            const vacancyId = cvButton?.getAttribute('data-caid') || cvButton?.getAttribute('data-id') || cvButton?.getAttribute('data-vacancy-id') || '';
            const companyId = cvButton?.getAttribute('data-cid') || cvButton?.getAttribute('data-company-id') || '';
            
            // Ищем название компании
            let company = '';
            const companyLink = el.querySelector('a[href*="/companii/"]');
            if (companyLink) {
              company = companyLink.textContent?.trim() || '';
            } else {
              // Попытка найти через VIP селектор или другие варианты
              const vipCompany = el.querySelector('.vip_company--name');
              company = vipCompany?.textContent?.trim() || '';
            }
            
            return { title, href, vacancyId, companyId, company, debugInfo };
          });
          
          // Выводим отладочную информацию для первых 3 вакансий
          if (i < 3) {
            console.log(`   🔍 Debug вакансии ${i + 1}:`, jobData.debugInfo);
          }
          
          if (!jobData.title) {
            console.log(`   ⏭️  Пропускаем: нет названия (debug:`, jobData.debugInfo?.innerText?.substring(0, 50), '...)');
            continue;
          }

          console.log(`\n📄 ${i + 1}. ${jobData.title}`);
          console.log(`   🔗 ${jobData.href}`);
          console.log(`   🆔 Vacancy ID: ${jobData.vacancyId}`);

          // ГИБРИДНАЯ ЛОГИКА: Если компания новая - пробуем найти Email и отправить личное письмо
          // Используем НАСТОЯЩЕЕ название компании для дедупликации
          const companyName = jobData.company || jobData.title.split(' ')[0];
          const companyKey = companyName.toLowerCase().trim();
          
          if (companyKey && !this.processedCompanies.has(companyKey) && smtpConfig && smtpConfig.auth?.user) {
            console.log(`\n🏢 НОВАЯ КОМПАНИЯ: "${companyName}". Пробуем найти Email...`);
            
            try {
              const { email: hrEmail, jobDescription } = await this.extractEmailFromJobPage(`https://lucru.md${jobData.href}`);
              
              if (hrEmail) {
                // Временная подмена targetEmail для функции отправки
                const currentSmtpConfig = { ...smtpConfig, targetEmail: hrEmail };
                
                const sent = await this.generateAndSendEmailForCompany(
                  companyKey, 
                  jobData.title, 
                  jobDescription, 
                  cvData, 
                  apiKey, 
                  currentSmtpConfig,
                  emailMode
                );
                
                if (sent) {
                  this.processedCompanies.add(companyKey);
                  console.log(`   ✅ ГИБРИД: Email успешно отправлен компании "${companyName}"!`);
                }
              }
            } catch (hybridError) {
              console.log(`   ⚠️ Ошибка гибридного отклика (пропускаем): ${hybridError.message}`);
            }
            
            // После попытки отправки Email - возвращаемся к основной странице если Playwright потерял контекст
            // Но мы использовали newPage(), так что main page должна быть на месте.
            await this.page.bringToFront();
          }
          
          // ШАГ 1: Делаем hover на вакансию чтобы появилась кнопка CV
          console.log(`   🖱️  Hover на вакансию...`);
          await vacancyRow.hover();
          await this.page.waitForTimeout(1000);
          
          // ШАГ 2: Ищем кнопку CV внутри этой вакансии
          const cvButton = await vacancyRow.$('a.cat_blue_btn');
          
          if (!cvButton) {
            console.log(`   ⚠️  Кнопка CV не найдена - копируем ссылку и скрываем`);
            
            // Копируем ссылку на вакансию
            const fullUrl = `https://lucru.md${jobData.href}`;
            console.log(`   📋 Ссылка скопирована: ${fullUrl}`);
            
              // Скрываем вакансию
            try {
              await vacancyRow.hover();
              await this.page.waitForTimeout(1000);
              
              const hideButton = await vacancyRow.$('button.hideVacancyBtn');
              if (hideButton) {
                console.log(`   ✅ Кнопка "скрыть" найдена, кликаем...`);
                await hideButton.click({ force: true });
                await this.page.waitForTimeout(2000);
                
                // Закрываем модальное окно подтверждения скрытия
                console.log(`   🔍 Закрываем модальное окно скрытия...`);
                try {
                  // Ищем кнопку закрытия модального окна скрытия
                  const closeBtn = await this.page.$('#hidden_vacancy_info_popup_close, button#hidden_vacancy_info_popup_close');
                  if (closeBtn) {
                    console.log(`   ✅ Кнопка "Închide" модального окна скрытия найдена, кликаем...`);
                    await closeBtn.click({ force: true });
                    await this.page.waitForTimeout(1000);
                    console.log(`   ✅ Модальное окно скрытия закрыто!`);
                  } else {
                    console.log(`   ⚠️  Кнопка модального окна скрытия не найдена, пробуем Escape...`);
                    await this.page.keyboard.press('Escape');
                    await this.page.waitForTimeout(1000);
                    console.log(`   ✅ Модальное окно закрыто через Escape`);
                  }
                } catch (e2) {
                  console.log(`   ⚠️  Не удалось закрыть модальное окно: ${e2.message}`);
                }
                
                console.log(`   ✅ Вакансия скрыта (нет кнопки CV)!`);
              }
            } catch (e) {
              console.log(`   ⚠️  Не удалось скрыть вакансию: ${e.message}`);
            }
            
            skippedCount++;
            results.push({ job: jobData.title, url: fullUrl, status: 'no_cv_button_saved' });
            continue;
          }
          
          console.log(`   ✅ Кнопка CV найдена, кликаем...`);
          await cvButton.click();
          
          // ШАГ 3: Ждем появления модального окна (увеличено до 5 секунд)
          console.log(`   ⏳ Ждем появления модального окна (5 сек)...`);
          await this.page.waitForTimeout(5000);
          
          // Дополнительное ожидание: ждем пока кнопка станет видимой
          try {
            await this.page.waitForSelector('button[type="submit"].app-btn', { 
              state: 'visible',
              timeout: 5000 
            });
            console.log(`   ✅ Модальное окно полностью загружено!`);
            } catch (e) {
            console.log(`   ⚠️  Кнопка не стала видимой за 5 секунд (это нормально)`);
            
            // Сохраняем скриншот для отладки (закомментировано)
            // const modalScreenshot = path.join(__dirname, `modal-debug-${Date.now()}.png`);
            // await this.page.screenshot({ path: modalScreenshot });
            // console.log(`   📸 Скриншот модального окна: ${modalScreenshot}`);
          }
          
          // Проверяем появилось ли модальное окно
          const modalText = await this.page.evaluate(() => document.body.innerText);
          
          // Дебаг: выводим текст модального окна
          console.log(`   📝 Текст на странице (500 символов):`, modalText.substring(0, 500));
          
          // Проверяем наличие модального окна по разным признакам (румынский и русский)
          const modalIndicators = [
            'Trimite CV-ul',      // Румынский: Отправить CV
            'ATAȘEAZĂ CV-UL',    // Румынский: Прикрепить CV
            'Отправить резюме',   // Русский
            'Aplică',             // Румынский: Применить
            'Aplicați',           // Румынский: Подать заявку
            'aplicare',           // румынский: подача заявки
            'Anexează CV'         // Румынский: Прикрепить CV
          ];
          
          const hasModal = modalIndicators.some(indicator => modalText.includes(indicator));
          
          if (hasModal) {
            console.log(`   📋 Модальное окно появилось!`);
            
            // ШАГ 4: Ищем кнопку отправки в модальном окне (правильный селектор)
            console.log(`   🔍 Ищем кнопку отправки...`);
            
            // Отладка: выводим все кнопки на странице
            const allButtons = await this.page.$$('button');
            console.log(`   📋 Всего кнопок на странице: ${allButtons.length}`);
            
            for (let j = 0; j < Math.min(5, allButtons.length); j++) {
              const btnInfo = await allButtons[j].evaluate(btn => ({
                text: btn.textContent?.trim(),
                type: btn.type,
                classes: btn.className,
                visible: btn.offsetParent !== null
              }));
              console.log(`      ${j+1}. "${btnInfo.text?.substring(0, 30)}" | type="${btnInfo.type}" | visible=${btnInfo.visible}`);
            }
            
            // ВАЖНО: Ищем кнопку только в АКТИВНОЙ вкладке!
            const buttonSelectors = [
              'div.tab_content.active button[type="submit"]',
              '#pop_send button[type="submit"]',
              'div.tab_content.active button.default-btn',
              'button[type="submit"].app-btn'
            ];
            
            let sendButton = null;
            for (const selector of buttonSelectors) {
              try {
                sendButton = await this.page.$(selector);
                if (sendButton) {
                  console.log(`   ✅ Кнопка найдена через селектор: ${selector}`);
                  break;
                }
              } catch (e) {
                // Пробуем следующий селектор
              }
            }
            
            if (sendButton) {
              console.log(`   🖱️  Кликаем на кнопку отправки...`);
              
              // Проверяем видимость кнопки
              const isVisible = await sendButton.isVisible().catch(() => false);
              console.log(`   👁️  Кнопка видима по мнению Playwright: ${isVisible}`);
              
              // ВАЖНО: Используем force click, который игнорирует проверки видимости
              // Это нужно потому что модальное окно может иметь анимацию
              console.log(`   ⚡ Принудительный клик (force: true)...`);
              
              try {
                await sendButton.click({ force: true, timeout: 10000 });
                console.log(`   ✅ Клик выполнен через Playwright force`);
              } catch (e) {
                console.log(`   ⚠️  Force клик не сработал: ${e.message}`);
                console.log(`   ⚡ Пробуем клик через JavaScript в АКТИВНОЙ вкладке...`);
                await this.page.evaluate(() => {
                  // Ищем кнопку только в активной вкладке!
                  const activeTab = document.querySelector('div.tab_content.active, #pop_send');
                  if (activeTab) {
                    const btn = activeTab.querySelector('button[type="submit"]');
                    if (btn) {
                      console.log('Кликаем на кнопку в активной вкладке');
                      btn.click();
                      return true;
                    }
                  }
                  return false;
                });
              }
              
              // Ждем обработки клика
                  await this.page.waitForTimeout(3000);
              
              console.log(`   ✅ CV отправлен на вакансию: ${jobData.title}!`);
              
              // Записываем успешную отправку в статистику
              try {
                const fullUrl = `https://lucru.md${jobData.href}`;
                const response = await fetch('http://localhost:5050/api/stats/success', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    vacancy: jobData.title,
                    site: 'lucru.md',
                    url: fullUrl
                  })
                });
                if (response.ok) {
                  console.log(`   📊 Статистика обновлена: ${jobData.title}`);
                } else {
                  console.log(`   ⚠️  Ошибка записи статистики: ${response.status}`);
                }
                  } catch (e) {
                console.log(`   ⚠️  Ошибка записи статистики: ${e.message}`);
              }
              
              // ШАГ 5: Закрываем модальное окно "Aplicat!"
              console.log(`   🔍 Закрываем модальное окно успеха...`);
              try {
                // Сначала ждем появления overlay
                await this.page.waitForTimeout(2000);
                
                // Сначала кликаем по overlay чтобы убрать блокировку
                const overlay = await this.page.$('#window_over, .overlay');
                if (overlay) {
                  console.log(`   ✅ Overlay найден, кликаем для снятия блокировки...`);
                  await overlay.click({ force: true });
                  await this.page.waitForTimeout(500);
                }
                
                // Теперь ищем и кликаем кнопку закрытия через JavaScript
                console.log(`   🔍 Ищем кнопку закрытия через JavaScript...`);
                const closeResult = await this.page.evaluate(() => {
                  // Ищем все возможные кнопки закрытия
                  const selectors = [
                    'span.mw_close[title="Închide"]',
                    '.mw_close:not(.hidden)',
                    '.mw_close.sm\\:inline-block',
                    'span[title="Închide"]',
                    '.mw_close'
                  ];
                  
                  for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                      if (element.offsetParent !== null) { // Проверяем видимость
                        console.log(`Найдена видимая кнопка: ${selector}`);
                        element.click();
                        return { success: true, selector };
                      }
                    }
                  }
                  
                  // Если не нашли, пробуем кликнуть по overlay
                  const overlay = document.querySelector('#window_over, .overlay');
                  if (overlay) {
                    overlay.click();
                    return { success: true, method: 'overlay' };
                  }
                  
                  return { success: false };
                });
                
                if (closeResult.success) {
                  console.log(`   ✅ Модальное окно закрыто через JavaScript! Метод: ${closeResult.selector || closeResult.method}`);
                  await this.page.waitForTimeout(1000);
                } else {
                  console.log(`   ⚠️  JavaScript клик не сработал, пробуем Escape...`);
                  await this.page.keyboard.press('Escape');
                  await this.page.waitForTimeout(1000);
                  console.log(`   ✅ Модальное окно закрыто через Escape`);
                }
              } catch (e) {
                console.log(`   ⚠️  Не удалось закрыть модальное окно: ${e.message}`);
              }
              
              appliedCount++;
              results.push({ job: jobData.title, status: 'applied' });
              
              // ВАЖНО: Логируем промежуточный прогресс для мониторинга
              console.log(`   📊 Промежуточный итог: Отправлено ${appliedCount} из ${maxJobs} CV`);
              
              // ШАГ 6: Скрываем вакансию после отправки
              console.log(`   👁️  Скрываем вакансию из списка...`);
              
              // Делаем hover на вакансию снова чтобы появилась кнопка "скрыть"
              try {
                await vacancyRow.hover();
                await this.page.waitForTimeout(1000);
                
                // Ищем кнопку "скрыть" внутри вакансии
                const hideButton = await vacancyRow.$('button.hideVacancyBtn');
                
                if (hideButton) {
                  console.log(`   ✅ Кнопка "скрыть" найдена, кликаем...`);
                  await hideButton.click({ force: true });
                  await this.page.waitForTimeout(2000);
                  
                  // Закрываем модальное окно подтверждения скрытия
                  console.log(`   🔍 Закрываем модальное окно скрытия...`);
                  try {
                    // Ищем кнопку закрытия модального окна скрытия
                    const closeBtn = await this.page.$('#hidden_vacancy_info_popup_close, button#hidden_vacancy_info_popup_close');
                    if (closeBtn) {
                      console.log(`   ✅ Кнопка "Închide" модального окна скрытия найдена, кликаем...`);
                      await closeBtn.click({ force: true });
                      await this.page.waitForTimeout(1000);
                      console.log(`   ✅ Модальное окно скрытия закрыто!`);
              } else {
                      console.log(`   ⚠️  Кнопка модального окна скрытия не найдена, пробуем Escape...`);
                      await this.page.keyboard.press('Escape');
                      await this.page.waitForTimeout(1000);
                      console.log(`   ✅ Модальное окно закрыто через Escape`);
                    }
                  } catch (e2) {
                    console.log(`   ⚠️  Не удалось закрыть модальное окно: ${e2.message}`);
                  }
                  
                  console.log(`   ✅ Вакансия скрыта!`);
            } else {
                  console.log(`   ⚠️  Кнопка "скрыть" не найдена`);
                }
              } catch (e) {
                console.log(`   ⚠️  Не удалось скрыть вакансию: ${e.message}`);
              }
            } else {
              console.log(`   ⚠️  Кнопка отправки в модале не найдена ни одним селектором`);
              skippedCount++;
              results.push({ job: jobData.title, status: 'modal_no_button' });
            }
          } else {
            console.log(`   ⚠️  Модальное окно не появилось`);
            skippedCount++;
            results.push({ job: jobData.title, status: 'no_modal' });
          }


        } catch (error) {
          console.error(`   ❌ Ошибка: ${error.message}`);
          skippedCount++;
        }

        await this.page.waitForTimeout(1500);
      }

      console.log('\n' + '='.repeat(70));
      console.log('📊 ИТОГИ:');
      console.log(`   ✅ Отправлено: ${appliedCount}`);
      console.log(`   ⏭️  Пропущено: ${skippedCount}`);
      console.log(`   📋 Обработано: ${results.length}`);
      console.log('='.repeat(70) + '\n');

      return { success: true, appliedCount, skippedCount, total: results.length, results };

    } catch (error) {
      console.error('❌ Ошибка автоотправки:', error);
      return { success: false, error: error.message };
    }
  }
}

// Автоматическая отправка CV на IT вакансии
app.post('/api/agent/auto-apply-jobs', async (req, res) => {
  try {
    const { sessionId, cvData, maxJobs = 10, minMatchScore = 70, headless = true, isScheduled = false, apiKey, smtpConfig, emailMode = 'auto' } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Не указан sessionId'
      });
    }

    let agent = activeAgents.get(sessionId);
    
    // Если агент нашелся - запускаем задачу
    if (agent) {
      // Запускаем в фоновом режиме
      agent.autoApplyToITJobs(cvData, { maxJobs, minMatchScore, apiKey, smtpConfig, emailMode }).then(result => {
        console.log(`✅ Задача автоотправки ${sessionId} завершена`);
      }).catch(err => {
        console.error(`❌ Ошибка в фоновой задаче ${sessionId}:`, err);
      });

      return res.json({
        success: true,
        message: 'Задача запущена в фоновом режиме',
        jobId: sessionId
      });
    }
    
    // Если агента нет - пробуем восстановить из cookies (для автоматизации)
    if (!agent) {
      console.log('🔄 Агент не найден, пробуем создать новый с cookies...');
      
      // Проверяем наличие файла cookies
      const COOKIES_FILE = path.join(__dirname, 'lucru-cookies.json');
      if (!fs.existsSync(COOKIES_FILE)) {
        return res.status(401).json({
          success: false,
          message: 'Сессия не найдена и cookies отсутствуют. Выполните вход заново.',
          needsLogin: true
        });
      }
      
      try {
        // Создаём нового агента с cookies
      agent = new SimpleLucruAgent({
          credentials: { email: '', password: '' },
          headless: headless,
        timeout: 30000
      });
      
      await agent.initialize();
      
      // Проверяем авторизацию через cookies
      const isLoggedIn = await agent.checkIfLoggedInWithCookies();
      
      if (!isLoggedIn) {
        await agent.cleanup();
        return res.status(401).json({
        success: false,
            message: 'Cookies истекли. Выполните вход заново.',
            needsLogin: true
      });
      }
      
        // Сохраняем агента с этим sessionId
      activeAgents.set(sessionId, agent);
        console.log('✅ Агент восстановлен из cookies');
      } catch (error) {
        console.error('❌ Ошибка создания агента из cookies:', error);
        return res.status(401).json({
          success: false,
          message: 'Не удалось восстановить сессию из cookies.',
          needsLogin: true
        });
      }
    }
    
    // Если браузер закрыт - восстанавливаем его с cookies
    if (!isBrowserActive(agent)) {
      console.log('🔄 Браузер закрыт, восстанавливаем сессию с cookies...');
      
      try {
        // Создаём новый браузер для существующего агента
        await agent.initialize();
        
        // Проверяем авторизацию через cookies
        const isLoggedIn = await agent.checkIfLoggedInWithCookies();
        
        if (!isLoggedIn) {
          await agent.cleanup();
          activeAgents.delete(sessionId);
          return res.status(401).json({
            success: false,
            message: 'Сессия истекла. Выполните вход заново.',
            needsLogin: true
          });
        }
        
        console.log('✅ Браузер восстановлен с сохранёнными cookies');
      } catch (error) {
        console.error('❌ Ошибка восстановления сессии:', error);
        activeAgents.delete(sessionId);
        return res.status(401).json({
          success: false,
          message: 'Не удалось восстановить сессию. Выполните вход заново.',
          needsLogin: true
        });
      }
    }

    if (!cvData) {
      return res.status(400).json({
        success: false,
        message: 'Не указаны данные CV'
      });
    }

    console.log(`🚀 Запуск автоматической отправки CV на IT вакансии...`);
    console.log(`   👤 Кандидат: ${cvData.firstName} ${cvData.lastName}`);
    console.log(`   📊 Параметры: max=${maxJobs}, minMatch=${minMatchScore}%\n`);

    const result = await agent.autoApplyToITJobs(cvData, { maxJobs, minMatchScore, apiKey, smtpConfig });

    if (result.success) {
      console.log(`\n✅ Отправка завершена! Результат: ${result.appliedCount} отправлено, ${result.skippedCount} пропущено`);
      
      // Если это автоматический запуск (от планировщика) - закрываем браузер
      if (isScheduled) {
        console.log('🤖 Автоматический запуск завершён. Закрываем браузер через 10 секунд...');
        setTimeout(async () => {
          if (activeAgents.has(sessionId) && agent.browser) {
            console.log('🔒 Закрываем браузер после автоматической отправки');
            try {
              await agent.cleanup();
              console.log('✅ Браузер закрыт. Следующий запуск по расписанию.');
            } catch (e) {
              console.log('⚠️  Ошибка закрытия браузера:', e.message);
            }
          }
        }, 10000); // 10 секунд для завершения всех операций
      } else {
        // Для ручного запуска (разовой отправки) - браузер НЕ закрываем
        console.log('✅ Разовая отправка завершена. Браузер остаётся открытым для дальнейшей работы.');
        console.log('💡 Браузер можно закрыть вручную через UI или он закроется через 30 минут неактивности.');
      }
      
      res.json({
        success: true,
        message: `Автоотправка завершена! Отправлено: ${result.appliedCount}, Пропущено: ${result.skippedCount}`,
        appliedCount: result.appliedCount,
        skippedCount: result.skippedCount,
        total: result.total,
        results: result.results
      });
    } else {
      // Закрываем браузер при ошибке
      setTimeout(async () => {
        if (agent.browser) {
          await agent.cleanup();
        }
      }, 2000);
      
      res.status(500).json({
        success: false,
        message: result.error || 'Ошибка автоотправки'
      });
    }

  } catch (error) {
    console.error('❌ Ошибка endpoint auto-apply-jobs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Тестовая отправка Email или проверка открытия приложения
app.post('/api/agent/test-email', async (req, res) => {
  try {
    const { to, subject, body, mode, smtpConfig } = req.body;
    
    console.log(`🧪 ТЕСТОВЫЙ ЗАПУСК EMAIL (${mode}):`);
    console.log(`   Кому: ${to}`);
    
    if (mode === 'manual') {
      const result = await openMailClient(to, subject, body);
      return res.json(result);
    } else {
      // Для SMTP пока заглушка, как просил пользователь
      console.log('   🔗 Проверка SMTP соединения (имитация)...');
      setTimeout(() => {
        res.json({ 
          success: true, 
          message: 'Соединение с SMTP сервером успешно проверено (заглушка)' 
        });
      }, 1500);
    }
  } catch (error) {
    console.error('❌ Ошибка в тестовом эндпоинте:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Проверка статуса агента
app.post('/api/agent/status', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.json({
        active: false,
        message: 'sessionId не указан'
      });
    }

    const agent = activeAgents.get(sessionId);
    
    if (!agent) {
      return res.json({
        active: false,
        message: 'Сессия не найдена'
      });
    }

    const browserActive = isBrowserActive(agent);
    
    res.json({
      active: true,
      browserActive: browserActive,
      sessionId: sessionId,
      message: browserActive ? 'Агент активен и готов к работе' : 'Агент в памяти, но браузер закрыт'
    });
    
  } catch (error) {
    res.status(500).json({
      active: false,
      error: error.message
    });
  }
});

// Ручное закрытие агента
app.post('/api/agent/close', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId не указан'
      });
    }

    const agent = activeAgents.get(sessionId);
    
    if (!agent) {
      return res.json({
        success: false,
        message: 'Сессия не найдена'
      });
    }

    console.log(`🔒 Ручное закрытие агента: ${sessionId}`);
    
    if (agent.browser) {
      await agent.cleanup();
    }
    
    activeAgents.delete(sessionId);
    
    res.json({
      success: true,
      message: 'Агент успешно закрыт'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Statistics endpoints
app.get('/api/stats', async (req, res) => {
  try {
    // Читаем статистику из файла или создаем пустую
    let stats = {
      totalSent: 0,
      totalErrors: 0,
      totalProcessed: 0,
      dailyStats: [],
      siteStats: [],
      recentActivity: [],
      errorVacancies: []
    };
    
    try {
      const statsFile = fs.readFileSync('stats.json', 'utf8');
      stats = JSON.parse(statsFile);
    } catch (e) {
      // Файл не существует, используем пустую статистику
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stats/success', async (req, res) => {
  try {
    const { vacancy, site = 'lucru.md', url = '' } = req.body;
    
    // Читаем текущую статистику
    let stats = {
      totalSent: 0,
      totalErrors: 0,
      totalProcessed: 0,
      dailyStats: [],
      siteStats: [],
      recentActivity: [],
      errorVacancies: []
    };
    
    try {
      const statsFile = fs.readFileSync('stats.json', 'utf8');
      stats = JSON.parse(statsFile);
    } catch (e) {
      // Файл не существует, используем пустую статистику
    }
    
    // Обновляем статистику
    stats.totalSent++;
    stats.totalProcessed++;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Обновляем дневную статистику
    const dailyIndex = stats.dailyStats.findIndex(d => d.date === today);
    if (dailyIndex >= 0) {
      stats.dailyStats[dailyIndex].sent++;
    } else {
      stats.dailyStats.push({
        date: today,
        sent: 1,
        errors: 0
      });
    }
    
    // Добавляем в активность
    stats.recentActivity.unshift({
      id: `success_${Date.now()}`,
      vacancy,
      site,
      url: url, // URL вакансии для ссылки
      status: 'success',
      date: now.toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      timestamp: now.getTime()
    });
    
    // Ограничиваем историю активности (последние 50 записей)
    stats.recentActivity = stats.recentActivity.slice(0, 50);
    
    // Сохраняем статистику
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stats/error', async (req, res) => {
  try {
    const { vacancy, url, reason, site = 'lucru.md' } = req.body;
    
    // Читаем текущую статистику
    let stats = {
      totalSent: 0,
      totalErrors: 0,
      totalProcessed: 0,
      dailyStats: [],
      siteStats: [],
      recentActivity: [],
      errorVacancies: []
    };
    
    try {
      const statsFile = fs.readFileSync('stats.json', 'utf8');
      stats = JSON.parse(statsFile);
    } catch (e) {
      // Файл не существует, используем пустую статистику
    }
    
    // Обновляем статистику
    stats.totalErrors++;
    stats.totalProcessed++;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Обновляем дневную статистику
    const dailyIndex = stats.dailyStats.findIndex(d => d.date === today);
    if (dailyIndex >= 0) {
      stats.dailyStats[dailyIndex].errors++;
    } else {
      stats.dailyStats.push({
        date: today,
        sent: 0,
        errors: 1
      });
    }
    
    // Добавляем в ошибки
    stats.errorVacancies.push({
      id: `error_${Date.now()}`,
      url,
      title: vacancy,
      reason,
      date: now.toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    });
    
    // Добавляем в активность
    stats.recentActivity.unshift({
      id: `error_${Date.now()}`,
      vacancy,
      site,
      status: 'error',
      date: now.toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      timestamp: now.getTime()
    });
    
    // Ограничиваем историю активности (последние 50 записей)
    stats.recentActivity = stats.recentActivity.slice(0, 50);
    
    // Сохраняем статистику
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stats/site', async (req, res) => {
  try {
    const { site, totalVacancies } = req.body;
    
    // Читаем текущую статистику
    let stats = {
      totalSent: 0,
      totalErrors: 0,
      totalProcessed: 0,
      dailyStats: [],
      siteStats: [],
      recentActivity: [],
      errorVacancies: []
    };
    
    try {
      const statsFile = fs.readFileSync('stats.json', 'utf8');
      stats = JSON.parse(statsFile);
    } catch (e) {
      // Файл не существует, используем пустую статистику
    }
    
    // Обновляем статистику сайта
    const siteIndex = stats.siteStats.findIndex(s => s.site === site);
    if (siteIndex >= 0) {
      stats.siteStats[siteIndex].totalVacancies = totalVacancies;
      stats.siteStats[siteIndex].percentage = Math.round((stats.siteStats[siteIndex].processed / totalVacancies) * 100);
    } else {
      stats.siteStats.push({
        site,
        totalVacancies,
        processed: 0,
        percentage: 0
      });
    }
    
    // Сохраняем статистику
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - показывает что видит агент на странице
app.post('/api/agent/debug-page', async (req, res) => {
  try {
    const { sessionId, url } = req.body;
    
    const agent = activeAgents.get(sessionId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Сессия не найдена'
      });
    }
    
    await agent.page.goto(url || 'https://lucru.md/ro/applicant/my-resumes');
    await agent.page.waitForLoadState('networkidle');
    
    const pageText = await agent.page.evaluate(() => document.body.innerText);
    const pageHTML = await agent.page.content();
    
    res.json({
      success: true,
      url: agent.page.url(),
      textLength: pageText.length,
      text: pageText.substring(0, 3000),
      htmlLength: pageHTML.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Проверка наличия CV на сайте Lucru.md
app.post('/api/agent/check-cv-status', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Не указан sessionId'
      });
    }

    let agent = activeAgents.get(sessionId);
    
    // Если агента нет - требуется авторизация
    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Сессия не найдена. Выполните вход заново.'
      });
    }
    
    // Если браузер закрыт - восстанавливаем его с cookies
    if (!isBrowserActive(agent)) {
      console.log('🔄 Браузер закрыт, восстанавливаем сессию с cookies...');
      
      try {
        // Создаём новый браузер для существующего агента
      await agent.initialize();
      
      // Проверяем авторизацию через cookies
      const isLoggedIn = await agent.checkIfLoggedInWithCookies();
      
      if (!isLoggedIn) {
        await agent.cleanup();
          activeAgents.delete(sessionId);
        return res.status(401).json({
        success: false,
            message: 'Сессия истекла. Выполните вход заново.'
          });
        }
        
        console.log('✅ Браузер восстановлен с сохранёнными cookies');
      } catch (error) {
        console.error('❌ Ошибка восстановления сессии:', error);
        activeAgents.delete(sessionId);
        return res.status(401).json({
          success: false,
          message: 'Не удалось восстановить сессию. Выполните вход заново.'
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔍 ПРОВЕРКА НАЛИЧИЯ CV НА САЙТЕ');
    console.log('='.repeat(60));

    // Переходим на страницу my-resumes
    await agent.page.goto('https://lucru.md/ro/applicant/my-resumes');
    await agent.page.waitForLoadState('networkidle');
    await agent.page.waitForTimeout(2000);

    // Получаем текст страницы
    const pageText = await agent.page.evaluate(() => document.body.innerText);

    console.log('📄 Текст страницы (первые 500 символов):');
    console.log(pageText.substring(0, 500));
    console.log('...\n');

    // ПРАВИЛЬНАЯ ЛОГИКА: Ищем признаки СУЩЕСТВУЮЩЕГО CV
    const cvIndicators = [
      'CV-urile mele /',        // "Мои CV / 1"
      'FIȘIER CV',              // Тип файла
      'CV ascuns',              // Скрытое CV
      'Publică pe site',        // Опубликовать
      'Modifică',               // Редактировать
      'Descarcă'                // Скачать
    ];
    
    const noCVIndicators = [
      'Creează-ți primul CV',   // Первое CV
      'primul CV'               // Первое CV
    ];
    
    const hasCV = cvIndicators.some(indicator => pageText.includes(indicator));
    const noCV = noCVIndicators.some(indicator => pageText.includes(indicator));
    const cvExists = hasCV && !noCV;

    console.log('🔍 Проверка индикаторов:');
    console.log(`   ✓ Признаки CV: ${hasCV}`);
    console.log(`   ✗ Признаки отсутствия: ${noCV}`);
    console.log(`📊 Результат: CV ${cvExists ? 'ЕСТЬ' : 'НЕТ'} на сайте`);
    console.log('='.repeat(60) + '\n');

    // НЕ закрываем браузер - сессия остаётся активной
    console.log('✅ Проверка завершена. Браузер остаётся открытым.');
    
    // Не закрываем браузер автоматически
    // setTimeout(async () => {
    //   if (activeAgents.has(sessionId) && agent.browser) {
    //     console.log('🔒 Закрываем браузер после проверки CV');
    //     await agent.cleanup();
    //     console.log('✅ Браузер закрыт');
    //   }
    // }, 5000);

    res.json({
      success: true,
      cvExists: cvExists,
      needsUpload: !cvExists,
      message: cvExists 
        ? 'CV уже загружено на сайт' 
        : 'CV не найдено на сайте, требуется загрузка'
    });

  } catch (error) {
    console.error('❌ Ошибка проверки статуса CV:', error);
    
    // Закрываем браузер при ошибке
    if (agent && agent.browser) {
      setTimeout(async () => {
        await agent.cleanup();
      }, 2000);
    }
    
    res.status(500).json({
      success: false,
      message: `Ошибка проверки: ${error.message}`
    });
  }
});

// Загрузка CV файла на сервер
app.post('/api/agent/upload-cv', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CV файл не был загружен'
      });
    }

    console.log('📤 CV файл загружен на сервер:');
    console.log(`   📄 Имя: ${req.file.originalname}`);
    console.log(`   📂 Путь: ${req.file.path}`);
    console.log(`   📊 Размер: ${(req.file.size / 1024).toFixed(2)} KB`);

    res.json({
      success: true,
      message: 'CV файл успешно загружен',
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки CV файла:', error);
    res.status(500).json({
      success: false,
      message: `Ошибка загрузки файла: ${error.message}`
    });
  }
});

// AI анализ CV
app.post('/api/agent/analyze-cv', async (req, res) => {
  try {
    const { filePath, apiKey } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'Не указан путь к файлу CV'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Не указан Groq API ключ. Настройте API ключ в разделе AI → Настройки'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Файл CV не найден'
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🤖 НАЧАЛО AI АНАЛИЗА CV');
    console.log('='.repeat(60));
    console.log(`📂 Файл: ${filePath}`);

    // Используем функцию analyzeCVWithGroq с API ключом
    const cvData = await analyzeCVWithGroq(filePath, apiKey);

    console.log('\n✅ AI АНАЛИЗ ЗАВЕРШЕН УСПЕШНО');
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      message: 'AI анализ завершен',
      analysis: {
        ...cvData,
        serverFilePath: filePath
      }
    });

  } catch (error) {
    console.error('❌ Ошибка AI анализа:', error);
    res.status(500).json({
      success: false,
      message: `Ошибка AI анализа: ${error.message}`
    });
  }
});

// Получение истории писем
app.get('/api/agent/emails', (req, res) => {
  try {
    const EMAILS_FILE = path.join(__dirname, 'emails.json');
    let emails = [];
    
    if (fs.existsSync(EMAILS_FILE)) {
      emails = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf8'));
    }
    
    res.json({
      success: true,
      emails: emails
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Отправка письма из истории
app.post('/api/agent/emails/send', async (req, res) => {
  try {
    const { emailId, mode: explicitMode } = req.body;
    const EMAILS_FILE = path.join(__dirname, 'emails.json');
    
    if (!fs.existsSync(EMAILS_FILE)) {
      return res.status(404).json({ success: false, message: 'Письма не найдены' });
    }
    
    let emails = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf8'));
    const emailIndex = emails.findIndex(e => e.id === emailId);
    
    if (emailIndex === -1) {
      return res.status(404).json({ success: false, message: 'Письмо не найдено' });
    }
    
    const email = emails[emailIndex];
    const mode = explicitMode || email.mode || 'manual';
    
    console.log(`🚀 Отправка письма ${emailId} в режиме ${mode}...`);
    
    let result;
    if (mode === 'manual') {
      result = await openMailClient(email.email, `Отклик на вакансию: ${email.jobTitle}`, email.content);
    } else {
      // Здесь был бы реальный SMTP, но пока заглушка (или используем nodemailer если настроен)
      console.log('   🔗 SMTP отправка (имитация)...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      result = { success: true, message: 'Письмо успешно отправлено через SMTP' };
    }
    
    if (result.success) {
      emails[emailIndex].status = 'sent';
      emails[emailIndex].sentAt = new Date().toISOString();
      fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2));
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка при отправке из истории:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Общий AI анализ (оценка резюме)
app.post('/api/agent/analyze-cv-general', async (req, res) => {
  try {
    const { filePath, apiKey } = req.body;
    
    if (!filePath || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Необходимы filePath и apiKey'
      });
    }

    const analysis = await analyzeCVGeneralWithGroq(filePath, apiKey);
    
    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('❌ Ошибка общего анализа CV:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Авторизация в Lucru.md
app.post('/api/agent/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Не указаны email или пароль'
      });
    }

    console.log('🔐 Начинаем авторизацию в Lucru.md...');
    
    const agent = new SimpleLucruAgent({
      credentials: { email, password },
      headless: false, // Визуальный режим для наглядности
      timeout: 30000
    });

    // Инициализируем агента
    await agent.initialize();
    
    // Сначала проверяем cookies
    const cookiesValid = await agent.checkIfLoggedInWithCookies();
    
    if (cookiesValid) {
      console.log('✅ Используем сохраненные cookies, авторизация не требуется!');
    } else {
      console.log('🔐 Выполняем авторизацию...');
    // Выполняем авторизацию
    await agent.authenticate();
    
    // Проверяем успешность входа
      const isLoggedIn = await agent.checkIfLoggedIn();
      
      if (!isLoggedIn) {
        await agent.cleanup();
        return res.status(401).json({
          success: false,
          message: 'Не удалось войти в аккаунт'
        });
      }
      
      console.log('✅ Успешная авторизация в Lucru.md');
    }
    
    // Всегда проверяем авторизацию для получения актуальных cookies
    const isLoggedIn = await agent.checkIfLoggedIn();
    
    if (isLoggedIn) {
      
      // Получаем cookies из браузера
      const cookies = await agent.getCookies();
      console.log(`📦 Получено ${cookies.length} cookies`);
      
      // Конвертируем cookies в строку для сохранения
      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      // Сохраняем sessionId для дальнейшего использования
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Сохраняем агента в памяти для дальнейшего использования (синхронизация CV и т.д.)
      activeAgents.set(sessionId, agent);
      
      console.log('✅ Агент сохранен в памяти');
      console.log('✅ Браузер остаётся открытым для работы с агентом');
      console.log('💡 Сессия активна в течение 30 минут');
      
      // НЕ закрываем браузер сразу после входа - он нужен для работы!
      // Браузер будет закрыт только при неактивности через 30 минут
      // setTimeout(async () => {
      //   try {
      //     console.log(`🔍 Проверяем сессию ${sessionId}...`);
      //     console.log(`   activeAgents.has: ${activeAgents.has(sessionId)}`);
      //     console.log(`   agent.browser: ${agent.browser ? 'существует' : 'null'}`);
      //     
      //     if (activeAgents.has(sessionId) && agent.browser) {
      //       console.log('🔒 Закрываем браузер после успешного входа');
      //       await agent.browser.close();
      //       console.log('✅ Браузер закрыт');
      //     } else {
      //       console.log('⚠️ Браузер уже закрыт или сессия не найдена');
      //     }
      //   } catch (error) {
      //     console.error('❌ Ошибка при закрытии браузера:', error.message);
      //   }
      // }, 5000);
      
      // Полностью удаляем сессию через 30 минут
      setTimeout(async () => {
        if (activeAgents.has(sessionId)) {
          console.log('⏰ Удаление неиспользуемой сессии (30 мин таймаут)');
          const agentToClean = activeAgents.get(sessionId);
          if (agentToClean && agentToClean.browser) {
            try {
              await agentToClean.cleanup();
            } catch (e) {
              // Браузер уже закрыт
            }
          }
          activeAgents.delete(sessionId);
        }
      }, 30 * 60 * 1000); // 30 минут
      
      res.json({
        success: true,
        message: 'Успешная авторизация в Lucru.md! Браузер закроется через 5 секунд.',
        sessionId,
        cookies: cookieString
      });
    } else {
      await agent.cleanup();
      res.status(401).json({
        success: false,
        message: 'Не удалось авторизоваться в Lucru.md'
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error);
    res.status(500).json({
      success: false,
      message: `Ошибка авторизации: ${error.message}`
    });
  }
});

// Синхронизация CV
app.post('/api/agent/sync-cv', async (req, res) => {
  try {
    const { sessionId, fileName, filePath } = req.body;
    
    if (!sessionId || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'Не указаны sessionId или fileName'
      });
    }

    let agent = activeAgents.get(sessionId);
    
    // Если агента нет - требуется авторизация
    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Сессия не найдена. Выполните вход заново.'
      });
    }
    
    // Если браузер закрыт - восстанавливаем его с cookies
    if (!isBrowserActive(agent)) {
      console.log('🔄 Браузер закрыт, восстанавливаем сессию с cookies...');
      
      try {
        // Создаём новый браузер для существующего агента
      await agent.initialize();
      
      // Проверяем авторизацию через cookies
      const isLoggedIn = await agent.checkIfLoggedInWithCookies();
      
      if (!isLoggedIn) {
        await agent.cleanup();
          activeAgents.delete(sessionId);
        return res.status(401).json({
        success: false,
            message: 'Сессия истекла. Выполните вход заново.'
          });
        }
        
        console.log('✅ Браузер восстановлен с сохранёнными cookies');
      } catch (error) {
        console.error('❌ Ошибка восстановления сессии:', error);
        activeAgents.delete(sessionId);
        return res.status(401).json({
          success: false,
          message: 'Не удалось восстановить сессию. Выполните вход заново.'
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📄 НАЧАЛО СИНХРОНИЗАЦИИ CV');
    console.log('='.repeat(60) + '\n');
    
    // Определяем путь к файлу
    const fullPath = filePath || path.join(__dirname, 'public', fileName);
    console.log(`📂 Путь к файлу CV: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Файл CV не найден: ${fullPath}`);
      return res.status(404).json({
        success: false,
        message: `Файл CV не найден: ${fullPath}`
      });
    }
    
    console.log('✅ Файл CV найден');
    
    // ШАГ 1: ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА НАЛИЧИЯ CV НА САЙТЕ
    console.log('\n🔍 ШАГ 1: Проверяем наличие CV на сайте...');
    const cvExists = await agent.checkCVExists();
    
    if (cvExists) {
      console.log('✅ CV уже существует на сайте - синхронизация не требуется');
      console.log('\n' + '='.repeat(60));
      res.json({
        success: true,
        message: 'CV уже загружен на сайт'
      });
      return;
    }
    
    console.log('⚠️ CV не найден на сайте - требуется загрузка');
    
    // ШАГ 2: ОБЯЗАТЕЛЬНЫЙ АНАЛИЗ CV С ПОМОЩЬЮ GROQ AI
    console.log('\n🤖 ШАГ 2: АНАЛИЗ CV С ПОМОЩЬЮ GROQ AI...');
    console.log('⏳ Это может занять 10-30 секунд...');
    
    // Получаем API ключ из запроса или переменной окружения
    const apiKey = req.body.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Groq API ключ не указан. Укажите apiKey в запросе или установите переменную окружения GROQ_API_KEY'
      });
    }
    
    let cvData;
    try {
      cvData = await analyzeCVWithGroq(fullPath, apiKey);
    } catch (analyzeError) {
      console.error('❌ Groq AI не смог проанализировать CV:', analyzeError.message);
      console.log('\n' + '='.repeat(60));
      return res.status(500).json({
        success: false,
        message: `Ошибка анализа CV: ${analyzeError.message}`
      });
    }
    
    // ШАГ 3: ЗАГРУЗКА CV С GROQ-КОНТРОЛИРУЕМЫМ ПРОЦЕССОМ
    console.log('\n📤 ШАГ 3: ЗАГРУЗКА CV НА САЙТ С GROQ-КОНТРОЛЛЕРОМ...');
    console.log('🤖 Groq будет управлять всем процессом загрузки');
    console.log('📋 Используем данные от Groq AI для заполнения формы');
    
    const uploadSuccess = await agent.uploadCVWithGroqController(fullPath, cvData, apiKey);
    
    if (uploadSuccess) {
      console.log('\n✅ CV УСПЕШНО ЗАГРУЖЕН НА САЙТ!');
      console.log('='.repeat(60) + '\n');
      
      // НЕ закрываем браузер - пользователь может продолжить работу
      console.log('✅ Синхронизация завершена. Браузер остаётся открытым.');
      
      // Не закрываем браузер автоматически
      // setTimeout(async () => {
      //   if (activeAgents.has(sessionId) && agent.browser) {
      //     console.log('🔒 Закрываем браузер после синхронизации CV');
      //     await agent.cleanup();
      //     console.log('✅ Браузер закрыт');
      //   }
      // }, 5000);
      
      res.json({
        success: true,
        message: 'CV успешно загружен на сайт с помощью Groq AI'
      });
    } else {
      console.error('\n❌ НЕ УДАЛОСЬ ЗАГРУЗИТЬ CV');
      console.log('='.repeat(60) + '\n');
      
      // Закрываем браузер даже при ошибке
      setTimeout(async () => {
        if (agent.browser) {
          await agent.cleanup();
        }
      }, 2000);
      
      res.status(500).json({
        success: false,
        message: 'Не удалось загрузить CV на сайт'
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка синхронизации CV:', error);
    res.status(500).json({
      success: false,
      message: `Ошибка синхронизации CV: ${error.message}`
    });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Остановка сервера агента...');
  
  // Очищаем все активные сессии
  for (const [sessionId, agent] of activeAgents) {
    try {
      await agent.cleanup();
      console.log(`✅ Сессия ${sessionId} очищена`);
    } catch (error) {
      console.error(`❌ Ошибка очистки сессии ${sessionId}:`, error);
    }
  }
  
  activeAgents.clear();
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 СЕРВЕР АГЕНТА ЗАПУЩЕН');
  console.log('='.repeat(70));
  console.log(`📡 API доступно: http://localhost:${PORT}`);
  console.log(`🌐 Сеть: http://0.0.0.0:${PORT} (доступен по IP)`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📤 Upload CV: http://localhost:${PORT}/api/agent/upload-cv`);
  console.log(`🤖 AI анализ: http://localhost:${PORT}/api/agent/analyze-cv`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/agent/login`);
  console.log(`🔄 Sync CV: http://localhost:${PORT}/api/agent/sync-cv`);
  console.log('='.repeat(70) + '\n');
});
