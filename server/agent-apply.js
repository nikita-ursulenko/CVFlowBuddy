/**
 * agent-apply.js
 * Модуль: основной цикл автоотправки CV на IT-вакансии lucru.md
 * Зависит от: agent-email.js, storage.js, utils.js
 */

import { extractEmailFromJobPage, generateAndQueueEmail } from './agent-email.js';
import { saveSuccessStat, saveTotalCategoryJobs, getGroqStatus } from './storage.js';

/**
 * Группирует видимые вакансии по компаниям из DOM списка страницы.
 * Возвращает Map: companyKey => { displayName, vacancies: [{title, href}] }
 */
async function buildCompanyMap(vacancyRows) {
  const companyMap = {};
  for (const row of vacancyRows) {
    const { title, href, company } = await row.evaluate(el => {
      const link = el.querySelector('a.job-title') || el.querySelector('h2 a') || el.querySelector('a');
      const title = link?.textContent?.trim() || 'Unknown';
      const href = link?.getAttribute('href') || '';
      const companyEl = el.querySelector('.employer, .company-name, .employer-name, a[href*="/companii/"]');
      const company = companyEl ? companyEl.textContent.trim() : '';
      return { title, href, company };
    });

    const key = company
      ? company.toLowerCase().trim()
      : 'cid_' + (href.match(/\d+/) || ['unknown'])[0];

    if (!companyMap[key]) {
      companyMap[key] = { displayName: company || key, vacancies: [] };
    }
    companyMap[key].vacancies.push({ title, href });
  }
  return companyMap;
}

/**
 * Нажимает кнопку «Скрыть» (Ascunde) после отправки CV.
 * Если не найдена — пробует AI fallback, потом закрывает модал.
 */
async function hideVacancy(page, row, jobTitle, apiKey, model, provider, findAndClickWithAI) {
  try {
    console.log(`👁️ Скрываем вакансию: ${jobTitle}`);
    await row.hover();
    await page.waitForTimeout(1000);

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
      console.log('🤖 AI fallback для кнопки "Ascunde"');
      hideClicked = await findAndClickWithAI(row, "Кнопка 'Скрыть' (Ascunde)", apiKey, model, provider);
    }

    if (hideClicked) {
      console.log('Ждем модалку для закрытия...');
      await page.waitForTimeout(2000);

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
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️ Кнопка "Скрыть" не найдена');
    }
  } catch (err) {
    console.error('Ошибка при скрытии вакансии:', err.message);
  }
}

/**
 * Главный цикл: загружает страницу IT-вакансий,
 * группирует по компаниям, собирает HR email (1 запрос/компания),
 * отправляет CV на каждую вакансию.
 */
export async function autoApplyToJobs(agent, cvData, options = {}) {
  const { maxJobs = 10, apiKey, model, provider = 'groq', emailMode = 'auto' } = options;
  const { page, browser, processedCompanies, isStopped } = agent;

  try {
    const itJobsUrl = 'https://www.lucru.md/ro/posturi-vacante/categorie/it';
    await page.goto(itJobsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle');

    // Парсинг общего числа вакансий в категории (напр. "IT, Programare / 702 Joburi")
    const h1Text = await page.evaluate(() => {
      const h1 = document.querySelector('h1.page-title') || document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    const totalMatch = h1Text.match(/(\d+)\s*Joburi/i) || h1Text.match(/(\d+)/);
    const totalCategoryJobs = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    console.log(`📊 Всего в категории: "${h1Text}" → ${totalCategoryJobs} вак.`);
    if (totalCategoryJobs > 0) saveTotalCategoryJobs(totalCategoryJobs);

    // Прокрутка для загрузки карточек
    let prevCount = 0;
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1500);
      const rows = await page.$$('li.vacancyRow');
      if (rows.length === prevCount || rows.length >= maxJobs) break;
      prevCount = rows.length;
    }

    const vacancyRows = await page.$$('li.vacancyRow');
    const jobCards = vacancyRows.slice(0, Math.min(maxJobs, vacancyRows.length));

    // Группировка по компаниям (без HTTP-запросов)
    const companyMap = await buildCompanyMap(vacancyRows);
    const companies = Object.entries(companyMap);
    console.log(`🏢 Группировка: ${companies.length} компаний (из ${vacancyRows.length} вакансий)`);
    companies.forEach(([key, info]) =>
      console.log(`  • ${info.displayName}: ${info.vacancies.length} вак.`)
    );

    let appliedCount = 0;
    const results = [];

    for (let i = 0; i < jobCards.length; i++) {
      // Проверяем флаг остановки агента
      if (agent.isStopped) { console.log('🛑 Агент остановлен!'); break; }
      if (appliedCount >= maxJobs) { agent.stats.processedLimit = true; break; }

      const row = jobCards[i];
      
      // Проверка паузы Groq перед каждым шагом, требующим API
      const groqStatus = getGroqStatus();
      if (groqStatus.pausedUntil && Date.now() < groqStatus.pausedUntil) {
        const waitMs = groqStatus.pausedUntil - Date.now();
        console.warn(`⏳ Groq API на паузе до ${new Date(groqStatus.pausedUntil).toLocaleTimeString()}. Ожидание ${Math.ceil(waitMs/1000)} сек...`);
        await page.waitForTimeout(waitMs);
      }

      // Убираем мешающие overlay
      await page.evaluate(() => {
        const over = document.querySelector('#window_over, .overlay');
        if (over) over.remove();
      });

      // Читаем данные текущей вакансии
      const jobData = await row.evaluate(el => {
        const link = el.querySelector('a.job-title') || el.querySelector('h2 a') || el.querySelector('a');
        const title = link?.textContent?.trim() || 'Unknown Title';
        const href = link?.getAttribute('href') || '';
        const companyEl = el.querySelector('.employer, .company-name, .employer-name, a[href*="/companii/"]');
        const company = companyEl ? companyEl.textContent.trim() : '';
        return { title, href, company };
      });

      const companyKey = jobData.company
        ? jobData.company.toLowerCase().trim()
        : 'cid_' + (jobData.href.match(/\d+/) || ['unknown'])[0];

      const companyInfo = companyMap[companyKey];
      const vacancyCount = companyInfo ? companyInfo.vacancies.length : 1;

      if (agent.processedCompanies.has(companyKey)) {
        console.log(`⏩ Пропуск: "${companyKey}" уже в истории. Скрываем...`);
        await hideVacancy(page, row, jobData.title, apiKey, agent.findAndClickWithAI?.bind(agent));
        continue;
      }

      // HR email — открываем страницу ТОЛЬКО 1 раз на компанию или на конкретный Email
      if (apiKey) {
        console.log(`🏢 "${companyKey}" | ${vacancyCount} вак. | Ищем HR email...`);
        const { email, jobDescription, companyName } = await extractEmailFromJobPage(
          browser, `https://lucru.md${jobData.href}`, apiKey, model, provider
        );
        const displayName = companyName || companyInfo?.displayName || companyKey;
        
        if (email) {
          const emailLower = email.toLowerCase().trim();
          if (!agent.processedEmails.has(emailLower)) {
            await generateAndQueueEmail({ 
              companyName: displayName, 
              jobTitle: jobData.title, 
              jobDescription, 
              cvData, 
              apiKey, 
              model,
              provider,
              targetEmail: email, 
              emailMode 
            });
            agent.processedEmails.add(emailLower);
          } else {
            console.log(`⏩ Пропуск генерации письма: Email ${email} уже в очереди (для другой вакансии)`);
          }
        } else {
          console.log(`⚠️ Email не найден для: ${displayName}`);
        }
        agent.processedCompanies.add(companyKey);
        if (companyName) agent.processedCompanies.add(companyName.toLowerCase().trim());
        await page.bringToFront();
      }

      // Отправка CV
      try {
        await row.hover();
        const cvButton = await row.$('a.cat_blue_btn');
        if (!cvButton) {
          console.log(`ℹ️ Кнопка отклика не найдена для: ${jobData.title} (возможно, уже откликнулись)`);
          results.push({ job: jobData.title, status: 'skipped' });
          continue; 
        }

        await cvButton.click();
        await page.waitForTimeout(3000);

        const clicked = await page.evaluate(() => {
          const selectors = [
            'button[type="submit"].app-btn',
            '#pop_send button[type="submit"]',
            'div.tab_content.active button[type="submit"]',
            '.modal-footer button.primary',
            'button.default-btn'
          ];
          for (const s of selectors) {
            const btn = document.querySelector(s);
            if (btn && btn.offsetParent !== null) { btn.click(); return true; }
          }
          const allBtns = Array.from(document.querySelectorAll('button, a.app-btn'));
          const textBtn = allBtns.find(b => {
            const t = b.textContent?.toLowerCase() || '';
            return (t.includes('trimite') || t.includes('încarcă') || t.includes('aplică')) && b.offsetParent !== null;
          });
          if (textBtn) { textBtn.click(); return true; }
          return false;
        });

        if (clicked) {
          await page.waitForTimeout(2000);
          await page.keyboard.press('Escape');
          appliedCount++;
          results.push({ job: jobData.title, status: 'applied' });

          try {
            saveSuccessStat({ vacancy: jobData.title, site: 'lucru.md', url: `https://lucru.md${jobData.href}` });
          } catch (e) {
            console.error('Ошибка сохранения статистики:', e.message);
          }

          await hideVacancy(
            page, 
            row, 
            jobData.title, 
            apiKey, 
            model, 
            provider, 
            agent.findAndClickWithAI?.bind(agent)
          );
        } else {
          console.log(`⚠️ Не удалось нажать финальную кнопку отклика для: ${jobData.title}`);
          results.push({ job: jobData.title, status: 'failed_button' });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }
      } catch (rowErr) {
        console.error(`❌ Ошибка при обработке вакансии "${jobData.title}":`, rowErr.message);
        results.push({ job: jobData.title, status: 'error', error: rowErr.message });
      }

      // Пауза между вакансиями для имитации человека и предотвращения 429 Rate Limit
      if (i < jobCards.length - 1) {
        console.log(`⏳ Ждем 5 секунд перед следующей вакансией...`);
        await page.waitForTimeout(5000);
      }
    }

    console.log(`✅ Обработка завершена. Успешно: ${appliedCount}, Всего в списке: ${results.length}`);
    return { success: true, appliedCount, total: results.length, results };
  } catch (error) {
    console.error('❌ Ошибка автоотправки:', error);
    return { success: false, error: error.message };
  }
}
