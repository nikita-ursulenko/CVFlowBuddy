import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { createGroqClient } from './utils.js';
import { openMailClient, sendEmailWithAttachment } from './email.js';
import { PATHS } from './constants.js';
import { saveSuccessStat, saveErrorStat, saveEmail } from './storage.js';

export class SimpleLucruAgent {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.processedCompanies = new Set(); // Компании, обработанные в текущей сессии
    this.stats = { totalJobs: 0, newJobs: 0, appliedJobs: 0, processedLimit: false };
  }

  // Смарт-поиск селектора через AI
  async findAndClickWithAI(parentElement, elementDescription, groqApiKey) {
    if (!groqApiKey) return false;
    try {
      const strippedHtml = await parentElement.evaluate(el => {
        const clone = el.cloneNode(true);
        // Удаляем лишний мусор для экономии токенов
        clone.querySelectorAll('script, style, svg, path, img, iframe').forEach(n => n.remove());
        return clone.innerHTML;
      });

      const groq = createGroqClient(groqApiKey);
      const prompt = `Here is an HTML snippet from a job search site:\n\n${strippedHtml.substring(0, 3000)}\n\nI need to click on the element corresponding to: "${elementDescription}".\nReturn ONLY a valid CSS selector that uniquely identifies this element within the snippet. Do not use complex pseudo-classes. Just the simplest robust selector. If no such element exists, return EXACTLY the string "NONE" (without quotes).`;
      
      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.1
      });
      const selector = response.choices[0]?.message?.content?.trim();
      
      if (selector && selector !== 'NONE' && selector !== '') {
        const cleanSelector = selector.replace(/['"\`]/g, '');
        console.log(`🧠 AI Selector для '${elementDescription}': ${cleanSelector}`);
        const element = await parentElement.$(cleanSelector);
        if (element) {
          await element.click();
          return true;
        }
      }
    } catch(e) {
      console.error('AI Navigation error:', e.message);
    }
    return false;
  }

  async initialize() {
    console.log('🔧 Инициализация браузера...');
    this.browser = await chromium.launch({ 
      headless: false, // Визуальный режим для отладки
      slowMo: 300
    });
    
    // Проверяем наличие сохраненных cookies
    const COOKIES_FILE = PATHS.cookies;
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
    
    // Заполняем форму входа
    console.log('📝 Заполнение email...');
    await this.page.waitForSelector('input[name="login"]', { timeout: 30000 });
    await this.page.fill('input[name="login"]', this.config.credentials.email);
    
    console.log('📝 Заполнение password...');
    await this.page.waitForSelector('input[name="password"]', { timeout: 30000 });
    await this.page.fill('input[name="password"]', this.config.credentials.password);
    
    console.log('🖱️  Нажатие кнопки входа...');
    await this.page.waitForSelector('button[type="submit"]', { timeout: 30000 });
    
    const urlBeforeClick = this.page.url();
    await this.page.click('button[type="submit"]');
    
    console.log('⏳ Ждем изменения URL после входа...');
    try {
      await this.page.waitForURL(url => url !== urlBeforeClick, { timeout: 10000 });
      console.log('✅ URL изменился - вход успешен!');
    } catch (e) {
      console.log('⚠️ URL не изменился за 10 секунд');
    }
    
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
      const currentUrl = this.page.url();
      
      const successUrlPatterns = ['/applicant/', '/my-resumes', '/my-profile', '/dashboard', '/contul-meu'];
      const hasSuccessUrl = successUrlPatterns.some(pattern => currentUrl.includes(pattern));
      const isNotOnLoginPage = !currentUrl.includes('/login') && !currentUrl.includes('/signin');
      
      const hasPasswordField = await this.page.evaluate(() => {
        const passwordFields = document.querySelectorAll('input[type="password"], input[name="password"]');
        return passwordFields.length > 0;
      });
      
      const elementCheck = await this.page.evaluate(() => {
        const indicators = [
          '[data-testid="user-menu"]', '.user-menu', '.profile-menu', '.account-menu', '.header-user',
          'a[href*="logout"]', 'a[href*="sign-out"]', 'a[href*="exit"]', 'a[href*="iesire"]', 'button[onclick*="logout"]',
          'a[href*="profile"]', 'a[href*="applicant"]', 'a[href*="resume"]', 'a[href*="cv-uri"]', 'a[href*="my-resumes"]',
          'a[href*="contul-meu"]', '.applicant-menu'
        ];
        const found = [];
        for (const selector of indicators) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) found.push(selector);
        }
        return { hasIndicators: found.length > 0, found };
      });

      const isLoggedIn = hasSuccessUrl || (isNotOnLoginPage && !hasPasswordField) || elementCheck.hasIndicators;
      console.log(`✅ ИТОГОВАЯ ПРОВЕРКА АВТОРИЗАЦИИ: ${isLoggedIn ? 'УСПЕХ' : 'НЕУДАЧА'}`);
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
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      const pageText = await this.page.evaluate(() => document.body.innerText);
      const cvIndicators = ['CV-urile mele /', 'FIȘIER CV', 'CV ascuns', 'Publică pe site', 'Modifică', 'Descarcă'];
      const noCVIndicators = ['Creează-ți первым CV', 'первый CV'];
      
      const hasCV = cvIndicators.some(indicator => pageText.includes(indicator));
      const noCV = noCVIndicators.some(indicator => pageText.includes(indicator));
      
      return hasCV && !noCV;
    } catch (error) {
      console.error('❌ Ошибка проверки CV:', error);
      return false;
    }
  }

  async uploadCVWithGroqController(cvFilePath, cvData, apiKey) {
    try {
      console.log('🤖 ИНТЕЛЛЕКТУАЛЬНАЯ ЗАГРУЗКА CV С GROQ-КОНТРОЛЛЕРОМ');
      if (!fs.existsSync(cvFilePath)) throw new Error(`CV файл не найден: ${cvFilePath}`);
      
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes', { timeout: 60000 });
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      const pageText = await this.page.evaluate(() => document.body.innerText);
      const groq = createGroqClient(apiKey);
      
      const step1Prompt = `Ты - ИИ контроллер. Проанализируй страницу.
Кандидат: ${cvData.firstName} ${cvData.lastName}
Цель: Загрузить CV файл
ТЕКСТ СТРАНИЦЫ:
${pageText.substring(0, 3000)}
Есть ли уже загруженное CV на странице? Нужно ли загрузить новое?
ОТВЕТЬ JSON: { "hasCVAlready": boolean, "needsUpload": boolean, "reasoning": string }`;

      const step1Response = await groq.chat.completions.create({
        messages: [{ role: 'system', content: 'Отвечай только JSON.' }, { role: 'user', content: step1Prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2
      });
      
      const decision = JSON.parse(step1Response.choices[0].message.content.replace(/```json\s*|```/g, ''));
      
      if (decision.hasCVAlready && !decision.needsUpload) {
        return { success: true, message: 'CV уже загружен', alreadyExists: true };
      }
      
      // Процесс загрузки
      const createButtons = await this.page.$$('a:has-text("Creează CV"), button:has-text("Creează CV")');
      if (createButtons.length > 0) {
        await createButtons[0].click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
      }
      
      const uploadCVButtons = await this.page.$$('a:has-text("Încarcă CV"), button:has-text("Încarcă CV")');
      if (uploadCVButtons.length > 0) {
        await uploadCVButtons[0].click();
        await this.page.waitForTimeout(3000);
      }
      
      const fileInputs = await this.page.$$('input[type="file"]');
      if (fileInputs.length === 0) throw new Error('Input для загрузки файла не найден');
      await fileInputs[0].setInputFiles(cvFilePath);
      await this.page.waitForTimeout(3000);
      
      // Заполнение формы
      await this.page.evaluate((cv) => {
        const posInput = document.querySelector('input[placeholder*="Funcția"], input[placeholder*="dorită"]');
        if (posInput) {
          posInput.value = cv.position;
          posInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, cvData);
      
      // Телефон + Email
      const randomDigits = Math.floor(Math.random() * 90000000) + 10000000;
      const phone = randomDigits.toString();
      const accountEmail = this.config.credentials.email || 'nikita.ursulenco@gmail.com';
      
      await this.page.evaluate((p, e) => {
        const pInput = document.querySelector('input[type="tel"], input[placeholder*="telefon"]');
        if (pInput) {
          pInput.value = p;
          pInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const eInput = document.querySelector('input[type="email"], input[placeholder*="email"]');
        if (eInput) {
          eInput.value = e;
          eInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, phone, accountEmail);
      
      await this.page.waitForTimeout(2000);
      const clicked = await this.page.evaluate(() => {
        // Ищем кнопку по тексту (Încarcă, Trimite, Salvează)
        const buttons = Array.from(document.querySelectorAll('button, a.app-btn, .default-btn'));
        const target = buttons.find(b => {
          const t = b.textContent?.toLowerCase() || '';
          return t.includes('încarcă') || t.includes('trimite') || t.includes('salvează') || t.includes('creează');
        });
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      
      if (!clicked) {
        console.log('⚠️ Кнопка завершения загрузки не найдена через текст, пробуем селекторы...');
        await this.page.click('button[type="submit"], .app-btn', { timeout: 5000 }).catch(() => {});
      }
      
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(5000);
      
      return { success: true, message: 'CV успешно загружен на Lucru.md' };
    } catch (error) {
      console.error('❌ Ошибка загрузки CV:', error);
      return { success: false, message: error.message };
    }
  }

  async extractEmailFromJobPage(jobUrl) {
    console.log(`🔍 Поиск Email на странице: ${jobUrl}`);
    const newPage = await this.browser.newPage();
    try {
      await newPage.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await newPage.waitForTimeout(2000);
      
      const data = await newPage.evaluate(() => {
        const mailto = document.querySelector('a[href^="mailto:"]');
        let email = mailto ? mailto.getAttribute('href').replace('mailto:', '').split('?')[0].trim() : null;
        
        if (!email) {
          const contactBlock = Array.from(document.querySelectorAll('div, span, p')).find(el => 
            el.textContent.includes('E-mail:') || el.textContent.includes('Email:')
          );
          if (contactBlock) {
            const match = contactBlock.textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (match) email = match[0];
          }
        }

        if (!email) {
          const match = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (match) email = match[0];
        }
        
        const descEl = document.querySelector('.vacancy-description, #vacancy-description, .job-description');
        const desc = descEl ? descEl.innerText.substring(0, 2000) : '';
        
        return { email, desc };
      });
      
      return { email: data.email, jobDescription: data.desc };
    } catch (error) {
      console.error(`❌ Ошибка извлечения данных: ${error.message}`);
      return { email: null, jobDescription: '' };
    } finally {
      await newPage.close();
    }
  }

  async generateAndQueueEmailForCompany(companyName, jobTitle, jobDescription, cvData, apiKey, targetEmail, emailMode = 'auto') {
    if (!apiKey) return false;
    try {
      const groq = createGroqClient(apiKey);
      const prompt = `Ты - HR-консультант. Напиши короткое энергичное сопроводительное письмо для отклика.
Кандидат: ${cvData.firstName} ${cvData.lastName}
Компания: ${companyName}, Вакансия: ${jobTitle}
Описание: ${jobDescription || 'Описание отсутствует, используй общие фразы'}
Тон: энергичный, профессиональный. Сгенерируй ТОЛЬКО финальный текст письма, без вводных фраз вроде "Вот предложение:".`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
      });

      const emailBody = chatCompletion.choices[0].message.content.trim();
      const subject = `Отклик на вакансию ${jobTitle} - ${cvData.firstName} ${cvData.lastName}`;
      const cvFilePath = cvData.serverFilePath || cvData.filePath;
      
      saveEmail({
        email: targetEmail,
        company: companyName,
        jobTitle: jobTitle,
        subject: subject,
        content: emailBody,
        cvPath: cvFilePath,
        mode: emailMode,
        status: 'pending'
      });
      console.log(`✉️ Уникальное письмо для HR ${companyName} (${targetEmail}) добавлено в очередь!`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка генерации письма для HR:', error.message);
      return false;
    }
  }

  async cleanup() {
    if (this.browser) await this.browser.close();
  }

  async autoApplyToITJobs(cvData, options = {}) {
    const { maxJobs = 10, minMatchScore = 70 } = options;
    try {
      const itJobsUrl = 'https://www.lucru.md/ro/posturi-vacante/categorie/it';
      await this.page.goto(itJobsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.page.waitForLoadState('networkidle');
      
      // Прокрутка
      let prevCount = 0;
      for (let i = 0; i < 10; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await this.page.waitForTimeout(1500);
        const rows = await this.page.$$('li.vacancyRow');
        if (rows.length === prevCount || rows.length >= maxJobs) break;
        prevCount = rows.length;
      }

      const vacancyRows = await this.page.$$('li.vacancyRow');
      let jobCards = vacancyRows.slice(0, Math.min(maxJobs, vacancyRows.length));

      let appliedCount = 0;
      let skippedCount = 0;
      const results = [];
      const { apiKey, smtpConfig, emailMode } = options;

      for (let i = 0; i < jobCards.length; i++) {
        const row = jobCards[i];
        
        // Очистка overlay
        await this.page.evaluate(() => {
          const over = document.querySelector('#window_over, .overlay');
          if (over) over.remove();
        });

        const jobData = await row.evaluate(el => {
          const link = el.querySelector('a');
          const title = link?.textContent?.trim() || '';
          const href = link?.getAttribute('href') || '';
          const companyLink = el.querySelector('a[href*="/companii/"]');
          const company = companyLink?.textContent?.trim() || '';
          return { title, href, company };
        });

        // Извлечение Email компании и генерация сопроводительного письма (Очередь)
        const companyKey = jobData.company.toLowerCase().trim();
        if (companyKey && !this.processedCompanies.has(companyKey) && apiKey) {
          const { email, jobDescription } = await this.extractEmailFromJobPage(`https://lucru.md${jobData.href}`);
          if (email) {
            const queued = await this.generateAndQueueEmailForCompany(companyKey, jobData.title, jobDescription, cvData, apiKey, email, emailMode);
            if (queued) this.processedCompanies.add(companyKey);
          }
          await this.page.bringToFront();
        }

        // Обычная отправка
        await row.hover();
        const cvButton = await row.$('a.cat_blue_btn');
        if (cvButton) {
          await cvButton.click();
          await this.page.waitForTimeout(4000);
          
          const clicked = await this.page.evaluate(() => {
            // Более широкий список селекторов и поиск по тексту
            const selectors = [
              'button[type="submit"].app-btn',
              '#pop_send button[type="submit"]',
              'div.tab_content.active button[type="submit"]',
              '.modal-footer button.primary',
              'button.default-btn'
            ];
            
            for (const s of selectors) {
              const btn = document.querySelector(s);
              if (btn && btn.offsetParent !== null) { // Видимый элемент
                btn.click();
                return true;
              }
            }
            
            // Поиск по тексту "Trimite", "Încarcă", "Aplica"
            const allBtns = Array.from(document.querySelectorAll('button, a.app-btn'));
            const textBtn = allBtns.find(b => {
              const t = b.textContent?.toLowerCase() || '';
              return (t.includes('trimite') || t.includes('încarcă') || t.includes('aplică')) && b.offsetParent !== null;
            });
            
            if (textBtn) {
              textBtn.click();
              return true;
            }
            
            return false;
          });

          if (clicked) {
            await this.page.waitForTimeout(2000);
            await this.page.keyboard.press('Escape');
            appliedCount++;
            results.push({ job: jobData.title, status: 'applied' });
            
            // Сохраняем статистику успешной отправки
            try {
              saveSuccessStat({
                vacancy: jobData.title,
                site: 'lucru.md',
                url: `https://lucru.md${jobData.href}`
              });
            } catch (statErr) {
              console.error('Ошибка сохранения статистики:', statErr.message);
            }

            // ==== Скрытие обработанной вакансии ====
            try {
              console.log(`👁️ Скрываем вакансию: ${jobData.title}`);
              await row.hover();
              await this.page.waitForTimeout(1000);
              
              // 1. Попытка нажать встроенными селекторами
              let hideClicked = await row.evaluate((el) => {
                const btns = Array.from(el.querySelectorAll('button, a, div'));
                const hideBtn = btns.find(b => {
                  const title = (b.getAttribute('title') || b.getAttribute('data-original-title') || '').toLowerCase();
                  if (title.includes('ascunde')) return true;
                  if (typeof b.className === 'string' && b.className.includes('hide_vacancy')) return true;
                  return false;
                });
                if (hideBtn) {
                  hideBtn.click();
                  return true;
                }
                return false;
              });

              // 2. Fallback через AI, если нужно и доступен apiKey
              if (!hideClicked && apiKey) {
                console.log('🤖 Включаем AI fallback для поиска кнопки "Ascunde"');
                hideClicked = await this.findAndClickWithAI(row, "Кнопка 'Скрыть' (Ascunde)", apiKey);
              }

              if (hideClicked) {
                console.log('Ждем модалку для закрытия...');
                await this.page.waitForTimeout(2000);
                
                // Нажимаем Închide во всем документе (глобальный поиск)
                const closedModal = await this.page.evaluate(() => {
                  const btns = Array.from(document.querySelectorAll('button, a, div.btn'));
                  const closeBtn = btns.find(b => {
                    const text = (b.textContent || '').trim().toLowerCase();
                    return text.includes('închide') || text.includes('inchide');
                  });
                  
                  if (closeBtn && closeBtn.offsetParent !== null) {
                    closeBtn.click();
                    return true;
                  }
                  return false;
                });
                
                if (!closedModal) {
                  console.log('⚠️ Не нашли кнопку Închide, пробуем нажать Escape');
                  await this.page.keyboard.press('Escape');
                }
                
                await this.page.waitForTimeout(1000);
              } else {
                console.log('⚠️ Кнопка "Скрыть" не найдена ни обычным способом, ни через AI');
              }
            } catch (hideErr) {
              console.error('Ошибка при скрытии вакансии:', hideErr.message);
            }
          }

        }
      }

      return { success: true, appliedCount, total: results.length, results };
    } catch (error) {
      console.error('❌ Ошибка автоотправки:', error);
      return { success: false, error: error.message };
    }
  }
}
