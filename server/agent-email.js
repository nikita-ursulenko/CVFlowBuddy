import { readPdfText } from './utils.js';
import { callAI } from './ai.js';
import { 
  saveEmail, 
  isDuplicateEmail, 
  saveGroqStatus,
  getAIStatus, 
  saveAIStatus,
  incrementEmailsFound,
  incrementEmailsSent,
  getSettings
} from './storage.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Извлекает email HR-а со страницы вакансии.
 * Стратегия (4 уровня):
 *   1. mailto: ссылка
 *   2. текстовый блок "E-mail:" / "Email:"
 *   3. Regex по всему тексту страницы
 *   4. Groq AI (если ключ передан и ничего не нашли)
 */
export async function extractEmailFromJobPage(browser, jobUrl, apiKey = null, model = null, provider = 'groq') {
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
          const m = block.textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\b/);
          if (m && isValid(m[0])) { email = m[0].trim(); break; }
        }
      }

      // 3. regex по всей странице
      if (!email) {
        const matches = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\b/g) || [];
        email = matches.find(isValid)?.trim() || null;
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

    // 4. AI fallback
    if (!data.email && apiKey) {
      const status = getAIStatus();
      if (status.pausedUntil && Date.now() < status.pausedUntil) {
        const remaining = Math.round((status.pausedUntil - Date.now()) / 1000);
        console.log(`⏳ ИИ на паузе (лимиты). Ждем еще ${remaining}с. Пропускаем экстракцию.`);
        return { email: null, jobDescription: data.desc, companyName: data.companyName };
      }

      console.log(`🤖 DOM email не найден, спрашиваем ${provider.toUpperCase()} AI...`);
      try {
        const aiResp = await callAI({
          provider,
          apiKey,
          model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash'),
          messages: [{
            role: 'user',
            content: `Find the HR contact email address in the following job page text. Reply ONLY with the email address, nothing else. If there is no email, reply "none".\n\n${data.desc.substring(0, 2000)}`
          }],
          temperature: 0
        });

        const aiEmail = aiResp.content.trim().toLowerCase();
        if (aiEmail !== 'none' && aiEmail.includes('@')) {
          data.email = aiEmail;
          console.log(`🤖 ${provider.toUpperCase()} AI нашёл email: ${aiEmail}`);
        } else {
          console.log(`🤖 ${provider.toUpperCase()} AI: email не найден`);
        }
        
        // Лимиты Groq
        if (aiResp.headers) {
          saveGroqStatus({
            remainingTokens: aiResp.headers.get('x-ratelimit-remaining-tokens'),
            limitTokens: aiResp.headers.get('x-ratelimit-limit-tokens'),
            resetTokens: aiResp.headers.get('x-ratelimit-reset-tokens'),
            remainingRequests: aiResp.headers.get('x-ratelimit-remaining-requests'),
            limitRequests: aiResp.headers.get('x-ratelimit-limit-requests'),
            resetRequests: aiResp.headers.get('x-ratelimit-reset-requests'),
            pausedUntil: null
          });
        }
      } catch (aiErr) {
        if (provider === 'groq' && (aiErr.status === 429 || aiErr.message?.includes('429'))) {
          console.error(`🛑 Groq API Limit: 429 Too Many Requests`);
          saveGroqStatus({ pausedUntil: Date.now() + 60000 });
        } else {
          console.warn(`⚠️ ${provider.toUpperCase()} AI ошибка при поиске email:`, aiErr.message);
          if (aiErr.status === 429 || aiErr.message?.includes('429')) {
             saveAIStatus({ pausedUntil: Date.now() + 60000 });
          }
        }
      }
    }

    if (data.email) {
      incrementEmailsFound(data.companyName, data.email);
    }

    return { email: data.email, jobDescription: data.desc, companyName: data.companyName };
  } catch (error) {
    console.error(`❌ Ошибка извлечения email: ${error.message}`);
    return { email: null, jobDescription: '', companyName: '' };
  } finally {
    await newPage.close();
  }
}

export async function generateAndQueueEmail({ companyName, jobTitles, jobDescription, cvData, apiKey, model, provider = 'groq', targetEmail }) {
  if (!apiKey) return false;
  
  const titles = Array.isArray(jobTitles) ? jobTitles.join(' и ') : jobTitles;
  if (isDuplicateEmail(targetEmail, companyName)) {
    console.log(`⏩ Пропуск: Письмо для ${companyName} (${targetEmail}) уже существует в базе.`);
    return true; 
  }

  const maxRetries = 3;
  let attempt = 0;

  // ОПТИМИЗАЦИЯ: Используем уже проанализированные данные вместо чтения всего PDF
  const name = `${cvData.firstName} ${cvData.lastName}`;
  const skills = Array.isArray(cvData.skills) ? cvData.skills.slice(0, 8).join(', ') : '';
  const experience = Array.isArray(cvData.experience) ? cvData.experience.slice(0, 3).join('; ') : '';
  
  // Короткое описание вакансии (1000 симв)
  const shortJobDesc = jobDescription ? jobDescription.substring(0, 1000) : 'No description provided';

  const settings = getSettings();
  
  // Подготовка данных для промпта
  const promptData = {
    companyName,
    titles,
    name,
    position: cvData.position,
    skills,
    experience,
    shortJobDesc
  };

  // Заменяем плейсхолдеры в пользовательском промпте
  let prompt = settings.emailPrompt || "";
  Object.keys(promptData).forEach(key => {
    const value = promptData[key] || "";
    const regex = new RegExp(`{${key}}`, "g");
    prompt = prompt.replace(regex, value);
  });

  while (attempt < maxRetries) {
    try {
      const aiResult = await callAI({
        provider,
        apiKey,
        model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      });

      // Сохраняем лимиты если это Groq
      if (aiResult.headers) {
        const headers = aiResult.headers;
        saveGroqStatus({
          remainingTokens: headers.get('x-ratelimit-remaining-tokens'),
          limitTokens: headers.get('x-ratelimit-limit-tokens'),
          resetTokens: headers.get('x-ratelimit-reset-tokens'),
          remainingRequests: headers.get('x-ratelimit-remaining-requests'),
          limitRequests: headers.get('x-ratelimit-limit-requests'),
          resetRequests: headers.get('x-ratelimit-reset-requests'),
          pausedUntil: null
        });
      }

      let content = aiResult.content.trim();
      const portfolioLink = settings.portfolioLink || "https://nikita-ursulenko.github.io/";
      const linkDomain = new URL(portfolioLink).hostname;
      
      const mandatorySign = `\n\n${portfolioLink}`;
      if (!content.includes(linkDomain)) {
        content += mandatorySign;
      }
      
      const subject = `Apply: ${titles}`;

      saveEmail({
        email: targetEmail,
        company: companyName,
        jobTitle: titles,
        subject,
        content: content,
        cvPath: cvData.serverFilePath || cvData.filePath,
        mode: 'manual',
        status: 'pending'
      });

      incrementEmailsSent();
      console.log(`✉️ Письмо для HR ${companyName} (${targetEmail}) успешно сгенерировано с учетом CV!`);
      return true;

    } catch (error) {
      attempt++;
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('rate_limit')) {
        if (attempt >= maxRetries) {
          console.error(`🛑 Достигнут лимит API ${provider.toUpperCase()} после ${maxRetries} попыток. Пауза 10 минут.`);
          saveAIStatus({ pausedUntil: Date.now() + 10 * 60000 });
          return false;
        }
        const waitTime = attempt * 10000; 
        console.warn(`⏳ Лимит API ${provider.toUpperCase()} (429). Попытка ${attempt}/${maxRetries}. Ждем ${waitTime/1000}сек...`);
        await new Promise(r => setTimeout(r, waitTime));
      } else {
        console.error('❌ Ошибка генерации письма:', error.message);
        return false;
      }
    }
  }

  console.error(`❌ Не удалось сгенерировать письмо после ${maxRetries} попыток из-за лимитов API.`);
  return false;
}
