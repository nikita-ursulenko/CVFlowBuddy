/**
 * agent-apply.js
 * Модуль: основной цикл автоотправки CV на IT-вакансии lucru.md
 * Оптимизирован: Группировка по компаниям (один email на компанию + массовый отклик на сайте)
 */

import { extractEmailFromJobPage, generateAndQueueEmail } from './agent-email.js';
import { saveSuccessStat, saveTotalCategoryJobs, getAIStatus, saveErrorStat } from './storage.js';

/**
 * Вспомогательная функция: найти строку вакансии по ссылке 
 */
async function findRowByHref(page, href) {
  const rows = await page.$$('li.vacancyRow, .job-item, .vacancy-item');
  for (const row of rows) {
    const h = await row.evaluate(el => {
      const a = el.querySelector('a.job-title') || el.querySelector('h2 a') || el.querySelector('a');
      return a?.getAttribute('href') || '';
    });
    if (h === href) return row;
  }
  return null;
}

/**
 * Группирует видимые вакансии по компаниям.
 */
async function buildCompanyMap(vacancyRows) {
  const companyMap = {};
  for (const row of vacancyRows) {
    const data = await row.evaluate(el => {
      const link = el.querySelector('a.job-title') || el.querySelector('h2 a') || el.querySelector('a');
      const title = link?.textContent?.trim() || 'Unknown';
      const href = link?.getAttribute('href') || '';
      const companyEl = el.querySelector('.employer, .company-name, .employer-name, a[href*="/companii/"]');
      const company = companyEl ? companyEl.textContent.trim() : '';
      return { title, href, company };
    });

    const key = data.company
      ? data.company.toLowerCase().trim()
      : 'cid_' + (data.href.match(/\d+/) || ['unknown'])[0];

    if (!companyMap[key]) {
      companyMap[key] = { displayName: data.company || key, vacancies: [] };
    }
    companyMap[key].vacancies.push({ title: data.title, href: data.href });
  }
  return companyMap;
}

/**
 * Нажимает кнопку «Скрыть» (Ascunde).
 */
async function hideVacancy(page, row, jobTitle, apiKey, model, provider, findAndClickWithAI) {
  try {
    console.log(`👁️ Скрываем вакансию: ${jobTitle}`);
    await row.hover();
    await page.waitForTimeout(500);

    let hideClicked = await row.evaluate(el => {
      const btns = Array.from(el.querySelectorAll('button, a, div'));
      const btn = btns.find(b => {
        const title = (b.getAttribute('title') || b.getAttribute('data-original-title') || '').toLowerCase();
        return title.includes('ascunde') || (typeof b.className === 'string' && b.className.includes('hide_vacancy'));
      });
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (!hideClicked && apiKey && findAndClickWithAI) {
      hideClicked = await findAndClickWithAI(row, "Кнопка 'Скрыть' (Ascunde)", apiKey, model, provider);
    }

    if (hideClicked) {
      await page.waitForTimeout(1500);
      const closed = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, div.btn'));
        const closeBtn = btns.find(b => {
          const text = (b.textContent || '').trim().toLowerCase();
          return text.includes('închide') || text.includes('inchide');
        });
        if (closeBtn && closeBtn.offsetParent !== null) { closeBtn.click(); return true; }
        return false;
      });
      if (!closed) await page.keyboard.press('Escape');
    }
  } catch (err) {
    console.error('Ошибка при скрытии:', err.message);
  }
}

/**
 * ГЛАВНЫЙ ЦИКЛ ПРИМЕНЕНИЯ
 */
export async function autoApplyToJobs(agent, cvData, options = {}) {
  const { maxJobs = 10, apiKey, model, provider = 'groq', emailMode = 'auto' } = options;
  const { page, browser } = agent;
  let appliedCount = 0;
  let totalCategoryJobsAccumulated = 0;
  const results = [];

  try {
    const categories = options.categories && options.categories.length > 0 
      ? options.categories 
      : ['/ro/posturi-vacante/categorie/it'];
    
    console.log(`🚀 Начинаем работу. Количество категорий: ${categories.length}`);
    console.log(`📂 Список категорий: ${JSON.stringify(categories)}`);
    
    for (const categoryPath of categories) {
      if (agent.isStopped) break;
      if (appliedCount >= maxJobs) break;

      const categoryUrl = categoryPath.startsWith('http') 
        ? categoryPath 
        : `https://www.lucru.md${categoryPath}`;
      
      console.log(`📂 Переход в категорию: ${categoryUrl}`);
      await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Прокрутка
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(1000);
      }

      const vacancyRows = await page.$$('li.vacancyRow');
      console.log(`📊 В категории ${categoryPath} найдено вакансий: ${vacancyRows.length}`);
      
      const categoryTotal = vacancyRows.length;
      totalCategoryJobsAccumulated += categoryTotal;
      saveTotalCategoryJobs(totalCategoryJobsAccumulated);
      const companyMap = await buildCompanyMap(vacancyRows);
      const companyKeys = Object.keys(companyMap);

      console.log(`🏢 Найдено компаний: ${companyKeys.length}. Начинаем пакетную обработку.`);

    for (const companyKey of companyKeys) {
      if (agent.isStopped) break;
      if (appliedCount >= maxJobs) break;

      const info = companyMap[companyKey];
      
      // Проверка глобальной паузы ИИ
      const aiStatus = getAIStatus();
      if (aiStatus.pausedUntil && Date.now() < aiStatus.pausedUntil) {
        const waitMin = Math.ceil((aiStatus.pausedUntil - Date.now()) / 60000);
        console.log(`\n🛑 ИИ всё ещё на паузе из-за лимитов (осталось ~${waitMin} мин). Пропускаем компанию ${info.displayName}...`);
        continue;
      }

      console.log(`\n📦 Компания: ${info.displayName} (${info.vacancies.length} вак.)`);

      if (agent.processedCompanies.has(companyKey)) {
        console.log(`⏩ Пропуск: "${companyKey}" уже обработана.`);
        for (const v of info.vacancies) {
          const row = await findRowByHref(page, v.href);
          if (row) await hideVacancy(page, row, v.title, apiKey, model, provider, agent.findAndClickWithAI?.bind(agent));
        }
        continue;
      }

      // 1. Поиск Email (раз на компанию)
      let companyEmail = null;
      let companyJobDesc = '';
      let extracted = null;
      let realName = info.displayName;

      if (apiKey) {
        const first = info.vacancies[0];
        extracted = await extractEmailFromJobPage(browser, `https://lucru.md${first.href}`, apiKey, model, provider);
        companyEmail = extracted.email;
        companyJobDesc = extracted.jobDescription;
        if (extracted.companyName) realName = extracted.companyName;
        await page.bringToFront();
      }

      const allTitles = info.vacancies.map(v => v.title);
      const appliedTitles = [];

      // 2. Массовый отклик на сайте
      for (const v of info.vacancies) {
        if (appliedCount >= maxJobs) break;
        const row = await findRowByHref(page, v.href);
        if (!row) continue;

        try {
          await row.hover();
          const btn = await row.$('a.cat_blue_btn');
          if (!btn) {
            results.push({ job: v.title, status: 'skipped' });
            await hideVacancy(page, row, v.title, apiKey, model, provider, agent.findAndClickWithAI?.bind(agent));
            continue;
          }

          console.log(`🔘 Отклик на сайте: ${v.title}`);
          await btn.click();
          await page.waitForTimeout(2000);

          const ok = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button[type="submit"], button.primary, .app-btn'));
            const sub = btns.find(b => {
              const t = b.textContent.toLowerCase();
              return (t.includes('trimite') || t.includes('aplică') || t.includes('send')) && b.offsetParent !== null;
            });
            if (sub) { sub.click(); return true; }
            return false;
          });

          if (ok) {
            await page.waitForTimeout(1500);
            await page.keyboard.press('Escape');
            appliedCount++;
            appliedTitles.push(v.title);
            results.push({ job: v.title, status: 'applied' });
            saveSuccessStat({ 
              vacancy: v.title, 
              site: 'lucru.md', 
              url: `https://lucru.md${v.href}`,
              salary: extracted?.salary 
            });
            await hideVacancy(page, row, v.title, apiKey, model, provider, agent.findAndClickWithAI?.bind(agent));
          } else {
            await page.keyboard.press('Escape');
            results.push({ job: v.title, status: 'failed_modal' });
          }
        } catch (e) { console.error(`Ошибка на ${v.title}:`, e.message); }
      }

      // 3. Одно письмо на компанию (всегда, если нашли email и не отправляли ранее)
      if (companyEmail && allTitles.length > 0) {
        const emailKey = companyEmail.toLowerCase().trim();
        if (!agent.processedEmails.has(emailKey)) {
          console.log(`✉️ Групповое письмо для ${realName} по ${allTitles.length} позициям.`);
          await generateAndQueueEmail({
            companyName: realName,
            jobTitles: allTitles,
            jobDescription: companyJobDesc,
            cvData,
            apiKey,
            model,
            provider,
            targetEmail: companyEmail,
            jobUrl: info.vacancies[0]?.href ? `https://lucru.md${info.vacancies[0].href}` : '',
            salary: extracted?.salary
          });
          agent.processedEmails.add(emailKey);
        }
      }

      agent.processedCompanies.add(companyKey);
      await page.waitForTimeout(3000);
    } // Конец цикла по компаниям
    } // Конец цикла по категориям

    return { success: true, appliedCount, total: results.length, results };
  } catch (error) {
    console.error('Ошибка в autoApplyToJobs:', error);
    return { success: false, error: error.message };
  }
}
