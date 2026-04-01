/**
 * agent-email.js
 * Модуль: извлечение HR-email со страницы вакансии + генерация письма через Groq AI
 */

import { createGroqClient } from './utils.js';
import { saveEmail, isDuplicateEmail } from './storage.js';

/**
 * Извлекает email HR-а со страницы вакансии.
 * Стратегия (4 уровня):
 *   1. mailto: ссылка
 *   2. текстовый блок "E-mail:" / "Email:"
 *   3. Regex по всему тексту страницы
 *   4. Groq AI (если ключ передан и ничего не нашли)
 */
export async function extractEmailFromJobPage(browser, jobUrl, apiKey = null) {
  console.log(`🔍 Поиск Email: ${jobUrl}`);
  const newPage = await browser.newPage();
  try {
    await newPage.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await newPage.waitForTimeout(2000);

    const data = await newPage.evaluate(() => {
      const blacklist = ['lucru@lucru.md', 'support@lucru.md', 'info@lucru.md', 'noreply@lucru.md', 'marketing@lucru.md'];
      const isValid = (e) => e && !blacklist.includes(e.toLowerCase().trim());

      // 1. mailto: link
      const mailto = document.querySelector('a[href^="mailto:"]');
      let email = mailto
        ? mailto.getAttribute('href').replace('mailto:', '').split('?')[0].trim()
        : null;
      if (!isValid(email)) email = null;

      // 2. блок с подписью "E-mail:" / "Email:"
      if (!email) {
        const blocks = Array.from(document.querySelectorAll('div, span, p, li')).filter(el =>
          el.textContent.match(/E[-\s]?mail\s*:/i)
        );
        for (const block of blocks) {
          const m = block.textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (m && isValid(m[0])) { email = m[0]; break; }
        }
      }

      // 3. regex по всей странице
      if (!email) {
        const matches = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        email = matches.find(isValid) || null;
      }

      const companyEl = document.querySelector(
        '.employer-name, .company-name, h2.employer, [itemprop="hiringOrganization"]'
      );
      const companyName = companyEl ? companyEl.textContent.trim() : '';

      const descEl = document.querySelector(
        '.vacancy-description, #vacancy-description, .job-description, article'
      );
      const desc = descEl
        ? descEl.innerText.substring(0, 3000)
        : document.body.innerText.substring(0, 3000);

      return { email, desc, companyName };
    });

    // 4. Groq AI fallback
    if (!data.email && apiKey) {
      console.log('🤖 DOM email не найден, спрашиваем Groq AI...');
      try {
        const groq = createGroqClient(apiKey);
        const aiResp = await groq.chat.completions.create({
          messages: [{
            role: 'user',
            content: `Find the HR contact email address in the following job page text. Reply ONLY with the email address, nothing else. If there is no email, reply "none".\n\n${data.desc.substring(0, 2000)}`
          }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0,
          max_tokens: 50
        });
        const aiEmail = aiResp.choices[0].message.content.trim().toLowerCase();
        if (aiEmail !== 'none' && aiEmail.includes('@')) {
          data.email = aiEmail;
          console.log(`🤖 Groq AI нашёл email: ${aiEmail}`);
        } else {
          console.log('🤖 Groq AI: email не найден');
        }
      } catch (aiErr) {
        console.warn('⚠️ Groq AI ошибка при поиске email:', aiErr.message);
      }
    }

    return { email: data.email, jobDescription: data.desc, companyName: data.companyName };
  } catch (error) {
    console.error(`❌ Ошибка извлечения email: ${error.message}`);
    return { email: null, jobDescription: '', companyName: '' };
  } finally {
    await newPage.close();
  }
}

/**
 * Генерирует уникальное сопроводительное письмо через Groq AI
 * и сохраняет его в очередь (emails.json).
 */
export async function generateAndQueueEmail({ companyName, jobTitle, jobDescription, cvData, apiKey, targetEmail, emailMode = 'auto' }) {
  if (!apiKey) return false;
  
  if (isDuplicateEmail(targetEmail, companyName)) {
    console.log(`⏩ Пропуск: Письмо для ${companyName} (${targetEmail}) уже существует в базе.`);
    return true; // Считаем "успехом" для логики цикла
  }
  try {
    const groq = createGroqClient(apiKey);
    const prompt = `Ты - HR-консультант. Напиши короткое энергичное сопроводительное письмо для отклика.
Кандидат: ${cvData.firstName} ${cvData.lastName}
Сайт/Портфолио: https://nikita-ursulenko.github.io/
Компания: ${companyName}, Вакансия: ${jobTitle}
Описание: ${jobDescription || 'Описание отсутствует, используй общие фразы'}
Тон: энергичный, профессиональный. Обязательно упомяни в конце, что подробнее с работами можно ознакомиться на моем сайте https://nikita-ursulenko.github.io/.
Сгенерируй ТОЛЬКО финальный текст письма, без вводных фраз вроде "Вот предложение:".`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7
    });

    const emailBody = completion.choices[0].message.content.trim();
    const subject = `Отклик на вакансию ${jobTitle} - ${cvData.firstName} ${cvData.lastName}`;

    saveEmail({
      email: targetEmail,
      company: companyName,
      jobTitle,
      subject,
      content: emailBody,
      cvPath: cvData.serverFilePath || cvData.filePath,
      mode: emailMode,
      status: 'pending'
    });

    console.log(`✉️ Письмо для HR ${companyName} (${targetEmail}) добавлено в очередь!`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка генерации письма:', error.message);
    return false;
  }
}
