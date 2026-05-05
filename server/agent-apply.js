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
    
    // Сначала убеждаемся, что никакое модальное окно не блокирует экран
    await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('.nm_modal, .modal-content, [role="dialog"]'));
      modals.forEach(m => { if (m.offsetParent !== null) m.remove(); }); // Удаляем мешающие модалки
    });

    await row.scrollIntoViewIfNeeded();
    await row.hover();
    await page.waitForTimeout(1000);

    let hideClicked = await row.evaluate(el => {
      // Ищем кнопку по характерным классам и иконкам lucru.md
      const btn = el.querySelector('.hideVacancyBtn') || 
                  el.querySelector('.hide_vacancy_btn') || 
                  el.querySelector('[title*="Ascunde"]') ||
                  el.querySelector('.fa-eye-slash')?.parentElement;
      
      if (btn) { 
        btn.scrollIntoView();
        btn.click(); 
        return true; 
      }
      return false;
    });

    if (!hideClicked && apiKey && findAndClickWithAI) {
      hideClicked = await findAndClickWithAI(row, "Кнопка 'Скрыть' (глаз/перечеркнутый)", apiKey, model, provider);
    }

    if (hideClicked) {
      console.log(`✅ Нажата кнопка 'Скрыть' для: ${jobTitle}. Ожидаем подтверждение...`);
      await page.waitForTimeout(2000);
      
      const closed = await page.evaluate(() => {
        const closeBtn = document.querySelector('#hidden_vacancy_info_popup_close') || 
                         document.querySelector('.nm_close') ||
                         Array.from(document.querySelectorAll('button, .btn')).find(b => 
                            b.textContent.includes('Закрыть') || 
                            b.textContent.includes('Închide') ||
                            b.textContent.includes('OK')
                         );
        
        if (closeBtn && closeBtn.offsetParent !== null) { 
          closeBtn.click(); 
          return true; 
        }
        return false;
      });
      
      if (!closed) {
        await page.keyboard.press('Escape');
      } else {
        console.log(`✅ Модальное окно скрытия закрыто.`);
      }
      await page.waitForTimeout(500);
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

  // Сбрасываем кэш обработанных компаний/email для текущего запуска, 
  // чтобы сработала проверка по дате из БД
  agent.processedEmails = new Set();
  agent.processedCompanies = new Set();

  try {
    const categories = options.categories && options.categories.length > 0 
      ? options.categories 
      : ['/ro/posturi-vacante/categorie/it'];

    const modeTitle = maxJobs === 1 ? '🎯 РАЗОВАЯ ОТПРАВКА (1 вакансия)' : `🌊 ПОТОКОВАЯ ОТПРАВКА (лимит: ${maxJobs})`;

    console.log(`\n${modeTitle}
--------------------------------------------------
1️⃣  Очистка кэша сессии (проверка по базе 14 дней).
2️⃣  Сканирование категорий: ${categories.join(', ')}.
3️⃣  Группировка по компаниям.
4️⃣  Поиск контактов HR + Раскрытие кнопок.
5️⃣  Отклик на сайте (кнопка 'Trimite CV-ul').
6️⃣  Персональное ИИ-письмо (если есть email).
7️⃣  Скрытие вакансии (Ascunde).
--------------------------------------------------\n`);
    
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
          for (let i = 0; i < Math.min(info.vacancies.length, 2); i++) {
            const v = info.vacancies[i];
            console.log(`🔍 Проверка вакансии ${i+1}/${info.vacancies.length} для поиска email...`);
            extracted = await extractEmailFromJobPage(browser, `https://lucru.md${v.href}`, apiKey, model, provider);
            if (extracted.email) {
              companyEmail = extracted.email;
              companyJobDesc = extracted.jobDescription;
              break; 
            }
          }
          if (extracted?.companyName) realName = extracted.companyName;
          await page.bringToFront();
        }

        const allTitles = info.vacancies.map(v => v.title);
        const appliedTitles = [];

        // 2. Массовый отклик на сайте
        for (const v of info.vacancies) {
          if (agent.isStopped) break;
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

            let modalResult = false;
            try {
              console.log(`⏳ Ожидаем появление кнопки 'Trimite'...`);
              await page.waitForTimeout(2000); 

              const btnHandle = await page.evaluateHandle(() => {
                const all = Array.from(document.querySelectorAll('button, input[type="submit"], a.app-btn, .yellow_btn, .default-btn, .btn'));
                return all.find(b => {
                  const t = (b.innerText || b.value || b.textContent || '').toLowerCase();
                  const style = window.getComputedStyle(b);
                  const isVisible = b.offsetWidth > 0 && b.offsetHeight > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                  return isVisible && (t.includes('trimite') || t.includes('отправить'));
                });
              });

              const modalBtn = btnHandle.asElement();
              if (modalBtn) {
                console.log(`🔘 Кнопка найдена. Кликаем...`);
                await modalBtn.scrollIntoViewIfNeeded();
                await modalBtn.click({ force: true });
                modalResult = true;
                console.log(`✅ Успешно нажато 'Trimite' для: ${v.title}`);
                await page.waitForTimeout(3000); 
              } else {
                console.log(`⚠️ Кнопка 'Trimite' не найдена обычным способом.`);
              }
              
              if (modalResult) {
                console.log(`ℹ️ Закрываем окно успеха ('Aplicat!')...`);
                await page.evaluate(() => {
                  const xBtn = document.querySelector('.mw_close') || document.querySelector('.nm_close') || document.querySelector('.close-modal') || document.querySelector('[class*="close"]');
                  if (xBtn) xBtn.click();
                });
                await page.waitForTimeout(500);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);

                appliedCount++;
                appliedTitles.push(v.title);
                saveSuccessStat({ 
                  vacancy: v.title, 
                  url: `https://lucru.md${v.href}`, 
                  salary: extracted?.salary 
                });
                results.push({ 
                  job: v.title, 
                  status: 'success', 
                  company: realName, 
                  url: `https://lucru.md${v.href}`,
                  salary: extracted?.salary 
                });
                
                await hideVacancy(page, row, v.title, apiKey, model, provider, agent.findAndClickWithAI?.bind(agent));
              } else {
                console.log(`❌ Пропускаем скрытие для ${v.title}, так как отклик не подтвержден.`);
                await page.keyboard.press('Escape');
                results.push({ job: v.title, status: 'failed_modal' });
              }
            } catch (e) {
              console.error(`❌ Ошибка в модальном окне:`, e.message);
            }
          } catch (e) { console.error(`Ошибки на ${v.title}:`, e.message); }
        }

        // 3. Одно письмо на компанию
        if (companyEmail && appliedTitles.length > 0) {
          const emailKey = companyEmail.toLowerCase().trim();
          if (!agent.processedEmails.has(emailKey)) {
            console.log(`✉️ Групповое письмо для ${realName} по ${appliedTitles.length} позициям.`);
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
      }
    }
    return { success: true, message: `Обработано компаний: ${appliedCount}`, appliedCount, results };
  } catch (err) {
    console.error('🔥 Критическая ошибка:', err);
    return { success: false, message: err.message };
  }
}
