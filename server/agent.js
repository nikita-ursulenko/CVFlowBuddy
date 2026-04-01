/**
 * agent.js — core SimpleLucruAgent class
 *
 * Ответственность:
 *  - initialize / cleanup браузера
 *  - авторизация и cookies
 *  - загрузка CV
 *  - AI-помощник (findAndClickWithAI)
 *
 * Логика автоотправки → server/agent-apply.js
 * Логика email → server/agent-email.js
 */

import fs from 'fs';
import { chromium } from 'playwright';
import { createGroqClient } from './utils.js';
import { PATHS } from './constants.js';
import { autoApplyToJobs } from './agent-apply.js';

export class SimpleLucruAgent {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.context = null;
    this.cookiesFile = PATHS.cookies;
    this.processedCompanies = new Set();
    this.stats = { totalJobs: 0, newJobs: 0, appliedJobs: 0, processedLimit: false };
    this.isStopped = false;
  }

  /** Сигнал остановки — прерывает следующую итерацию цикла */
  stop() {
    console.log('🛑 Получен сигнал остановки агента.');
    this.isStopped = true;
  }

  // ──────────────────────────────────────────────
  // ИНИЦИАЛИЗАЦИЯ
  // ──────────────────────────────────────────────

  async initialize() {
    console.log('🔧 Инициализация браузера...');
    this.browser = await chromium.launch({ headless: false, slowMo: 300 });

    let contextOptions = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (fs.existsSync(this.cookiesFile)) {
      console.log('🍪 Загружаем cookies...');
      try {
        contextOptions.storageState = JSON.parse(fs.readFileSync(this.cookiesFile, 'utf-8'));
        console.log('✅ Cookies загружены из файла');
      } catch (e) {
        console.log('⚠️ Ошибка загрузки cookies:', e.message);
      }
    } else {
      console.log('ℹ️  Сохраненных cookies не найдено');
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(60000);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.page = null;
    }
  }

  // ──────────────────────────────────────────────
  // АВТОРИЗАЦИЯ
  // ──────────────────────────────────────────────

  async authenticate() {
    console.log('🔐 Авторизация в Lucru.md...');
    await this.page.goto('https://lucru.md/ro/login', { timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);

    await this.page.waitForSelector('input[name="login"]', { timeout: 30000 });
    await this.page.fill('input[name="login"]', this.config.credentials.email);
    await this.page.waitForSelector('input[name="password"]', { timeout: 30000 });
    await this.page.fill('input[name="password"]', this.config.credentials.password);

    const urlBefore = this.page.url();
    await this.page.click('button[type="submit"]');
    try {
      await this.page.waitForURL(url => url !== urlBefore, { timeout: 10000 });
    } catch (e) {
      console.log('⚠️ URL не изменился за 10 сек');
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    console.log('✅ Авторизация выполнена, сохраняем cookies...');
    await this.saveCookies();
  }

  async saveCookies() {
    try {
      const state = await this.context.storageState();
      fs.writeFileSync(this.cookiesFile, JSON.stringify(state, null, 2));
      console.log('✅ Cookies сохранены');
      return true;
    } catch (e) {
      console.error('❌ Ошибка сохранения cookies:', e);
      return false;
    }
  }

  async checkIfLoggedIn() {
    try {
      const url = this.page.url();
      const successPatterns = ['/applicant/', '/my-resumes', '/my-profile', '/contul-meu'];
      const onSuccess = successPatterns.some(p => url.includes(p));
      const notOnLogin = !url.includes('/login') && !url.includes('/signin');
      const noPassword = !(await this.page.evaluate(() =>
        document.querySelectorAll('input[type="password"]').length > 0
      ));
      const hasMenu = await this.page.evaluate(() => {
        const indicators = ['.user-menu', 'a[href*="logout"]', 'a[href*="applicant"]', 'a[href*="contul-meu"]'];
        return indicators.some(sel => document.querySelector(sel));
      });
      return onSuccess || (notOnLogin && noPassword) || hasMenu;
    } catch {
      return false;
    }
  }

  async checkIfLoggedInWithCookies() {
    try {
      console.log('🔍 Проверяем авторизацию через cookies...');
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes', { timeout: 30000 });
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      const url = this.page.url();
      const ok = url.includes('/applicant/') && !url.includes('/login');
      if (ok) {
        console.log('✅ Авторизация через cookies успешна!');
      } else {
        console.log('⚠️ Cookies невалидны');
        if (fs.existsSync(this.cookiesFile)) fs.unlinkSync(this.cookiesFile);
      }
      return ok;
    } catch {
      return false;
    }
  }

  // ──────────────────────────────────────────────
  // CV
  // ──────────────────────────────────────────────

  async checkCVExists() {
    try {
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      const text = await this.page.evaluate(() => document.body.innerText);
      const hasCV = ['CV-urile mele /', 'FIȘIER CV', 'CV ascuns', 'Publică pe site', 'Modifică', 'Descarcă']
        .some(i => text.includes(i));
      const noCV = ['Creează-ți первым CV'].some(i => text.includes(i));
      return hasCV && !noCV;
    } catch {
      return false;
    }
  }

  async uploadCVWithGroqController(cvFilePath, cvData, apiKey) {
    try {
      if (!fs.existsSync(cvFilePath)) throw new Error(`CV файл не найден: ${cvFilePath}`);
      await this.page.goto('https://lucru.md/ro/applicant/my-resumes', { timeout: 60000 });
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);

      const pageText = await this.page.evaluate(() => document.body.innerText);
      const groq = createGroqClient(apiKey);

      const decision = JSON.parse(
        (await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'Отвечай только JSON.' },
            { role: 'user', content: `Есть ли уже загруженное CV на странице? Нужно ли загрузить новое?\nТЕКСТ: ${pageText.substring(0, 3000)}\nОТВЕТЬ JSON: { "hasCVAlready": boolean, "needsUpload": boolean }` }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2
        })).choices[0].message.content.replace(/```json\s*|```/g, '')
      );

      if (decision.hasCVAlready && !decision.needsUpload)
        return { success: true, message: 'CV уже загружен', alreadyExists: true };

      // Жмём "Creează CV" → "Încarcă CV"
      const createBtn = await this.page.$('a:has-text("Creează CV"), button:has-text("Creează CV")');
      if (createBtn) { await createBtn.click(); await this.page.waitForLoadState('networkidle'); }

      const uploadBtn = await this.page.$('a:has-text("Încarcă CV"), button:has-text("Încarcă CV")');
      if (uploadBtn) { await uploadBtn.click(); await this.page.waitForTimeout(3000); }

      const fileInputs = await this.page.$$('input[type="file"]');
      if (!fileInputs.length) throw new Error('Поле загрузки файла не найдено');
      await fileInputs[0].setInputFiles(cvFilePath);
      await this.page.waitForTimeout(3000);

      await this.page.evaluate(cv => {
        const pos = document.querySelector('input[placeholder*="Funcția"], input[placeholder*="dorită"]');
        if (pos) { pos.value = cv.position; pos.dispatchEvent(new Event('input', { bubbles: true })); }

        const tel = document.querySelector('input[type="tel"], input[placeholder*="telefon"]');
        if (tel) {
          tel.value = String(Math.floor(Math.random() * 90000000) + 10000000);
          tel.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, cvData);

      await this.page.waitForTimeout(2000);

      const submitted = await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a.app-btn, .default-btn'));
        const target = btns.find(b => {
          const t = b.textContent?.toLowerCase() || '';
          return t.includes('încarcă') || t.includes('trimite') || t.includes('salvează') || t.includes('creează');
        });
        if (target) { target.click(); return true; }
        return false;
      });

      if (!submitted) await this.page.click('button[type="submit"], .app-btn', { timeout: 5000 }).catch(() => {});
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(5000);

      return { success: true, message: 'CV успешно загружен' };
    } catch (error) {
      console.error('❌ Ошибка загрузки CV:', error);
      return { success: false, message: error.message };
    }
  }

  // ──────────────────────────────────────────────
  // AI-НАВИГАЦИЯ (вспомогательный метод)
  // ──────────────────────────────────────────────

  async findAndClickWithAI(parentElement, elementDescription, groqApiKey) {
    if (!groqApiKey) return false;
    try {
      const html = await parentElement.evaluate(el => {
        const c = el.cloneNode(true);
        c.querySelectorAll('script, style, svg, path, img, iframe').forEach(n => n.remove());
        return c.innerHTML;
      });

      const groq = createGroqClient(groqApiKey);
      const prompt = `HTML snippet:\n\n${html.substring(0, 3000)}\n\nFind element: "${elementDescription}". Return ONLY a CSS selector. If not found, return exactly "NONE".`;

      const res = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1
      });
      const selector = res.choices[0]?.message?.content?.trim();

      if (selector && selector !== 'NONE') {
        const el = await parentElement.$(selector.replace(/['"` ]/g, ''));
        if (el) { await el.click(); return true; }
      }
    } catch (e) {
      console.error('AI Navigation error:', e.message);
    }
    return false;
  }

  // ──────────────────────────────────────────────
  // ГЛАВНЫЙ МЕТОД — делегируем в agent-apply.js
  // ──────────────────────────────────────────────

  async autoApplyToJobs(cvData, options = {}) {
    this.isStopped = false;
    
    // Загружаем историю из emails.json для персистентной дедупликации
    const { getEmails } = await import('./storage.js');
    const history = getEmails();
    
    this.processedCompanies = new Set(
      history.map(e => e.company?.toLowerCase().trim()).filter(Boolean)
    );
    this.processedEmails = new Set(
      history.map(e => e.email?.toLowerCase().trim()).filter(Boolean)
    );

    console.log(`📜 Загружено из истории: ${this.processedCompanies.size} компаний, ${this.processedEmails.size} email-ов`);
    
    return autoApplyToJobs(this, cvData, options);
  }
}
