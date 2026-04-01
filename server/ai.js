import fs from 'fs';
import { readPdfText, createGroqClient } from './utils.js';

/**
 * ГЕНЕРАЦИЯ ОБЩЕГО АНАЛИЗА CV
 */
export async function analyzeCVGeneralWithGroq(cvFilePath, apiKey, model) {
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

    const { data, response } = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Ты карьерный консультант. Отвечай только валидным JSON на русском языке.' },
        { role: 'user', content: prompt }
      ],
      model: model || 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: "json_object" }
    }).withResponse();

    // Извлекаем лимиты
    import('./storage.js').then(m => m.saveGroqStatusFromHeaders(response.headers));

    const resultText = data.choices[0]?.message?.content || '{}';
    return JSON.parse(resultText);
  } catch (error) {
    console.error('❌ Ошибка анализа CV:', error);
    // Если ошибка 429 - сохраняем статус паузы
    if (error.status === 429) {
      import('./storage.js').then(m => m.saveGroqStatus({ pausedUntil: Date.now() + 60000 }));
    }
    throw error;
  }
}

/**
 * ПОЛНЫЙ АНАЛИЗ CV ДЛЯ ИЗВЛЕЧЕНИЯ ДАННЫХ
 */
export async function analyzeCVWithGroq(cvFilePath, apiKey, model) {
  console.log('🤖 НАЧИНАЕМ АНАЛИЗ CV С ПОМОЩЬЮ GROQ AI...');
  console.log(`📄 Файл CV: ${cvFilePath}`);
  
  if (!fs.existsSync(cvFilePath)) {
    throw new Error(`❌ Файл CV не найден: ${cvFilePath}`);
  }
  
  try {
    // ШАГ 1: ЧИТАЕМ ТЕКСТ
    let cvText = '';
    if (cvFilePath.endsWith('.pdf')) {
      cvText = await readPdfText(cvFilePath);
    } else {
      cvText = fs.readFileSync(cvFilePath, 'utf-8');
    }
    
    // ШАГ 2: ОЧИСТКА ТЕКСТА
    let cleanedText = cvText
      .replace(/[^\x20-\x7E\u0400-\u04FF\n]/g, ' ') 
      .replace(/\s+/g, ' ') 
      .trim();
    
    // ШАГ 3: АНАЛИЗ
    const groq = createGroqClient(apiKey);
    const { data, response } = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Ты эксперт по анализу резюме. 
Извлеки из резюме ПОЛНУЮ информацию:
ОБЯЗАТЕЛЬНЫЕ ПОЛЯ:
1. firstName, 2. lastName, 3. position, 4. phone, 5. email
ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ:
6. skills (array), 7. experience (array), 8. education (string), 9. languages (array), 10. summary (string)
Отвечай ТОЛЬКО валидным JSON.`
        },
        {
          role: 'user',
          content: `Проанализируй это резюме:\n\n${cleanedText.substring(0, 10000)}`
        }
      ],
      model: model || 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 2000
    }).withResponse();
    
    // Извлекаем лимиты
    import('./storage.js').then(m => m.saveGroqStatusFromHeaders(response.headers));

    const responseText = data.choices[0]?.message?.content;
    if (!responseText) throw new Error('Groq не вернул ответ');
    
    let cleanText = responseText.trim().replace(/```json\s*|```/g, '');
    let cvData = JSON.parse(cleanText);
    
    // Валидация
    cvData.firstName = cvData.firstName || 'Не указано';
    cvData.lastName = cvData.lastName || 'Не указано';
    cvData.position = cvData.position || 'Specialist';
    
    return cvData;
  } catch (error) {
    console.error('❌ Ошибка анализа CV:', error.message);
    throw error;
  }
}
