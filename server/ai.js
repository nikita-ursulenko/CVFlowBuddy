import fs from 'fs';
import { readPdfText, createGroqClient, createGeminiClient } from './utils.js';

/**
 * УНИВЕРСАЛЬНЫЙ ВЫЗОВ AI С ПОДДЕРЖКОЙ РАЗНЫХ ПРОВАЙДЕРОВ
 */
export async function callAI({ provider, apiKey, model, messages, responseFormat, temperature = 0.7 }) {
  if (provider === 'gemini') {
    const genAI = createGeminiClient(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: model || "gemini-3-flash-preview" });
    
    // Преобразуем сообщения для Gemini
    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    
    const prompt = systemInstruction ? `${systemInstruction}\n\n${userMessage}` : userMessage;
    
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
        responseMimeType: responseFormat?.type === 'json_object' ? 'application/json' : 'text/plain',
      }
    });

    const response = await result.response;
    return { 
      content: response.text(),
      rawResponse: response
    };
  } else {
    // Default to Groq
    const groq = createGroqClient(apiKey);
    const { data, response } = await groq.chat.completions.create({
      messages,
      model: model || 'llama-3.3-70b-versatile',
      temperature,
      response_format: responseFormat
    }).withResponse();

    return {
      content: data.choices[0]?.message?.content || '',
      headers: response.headers,
      rawResponse: response
    };
  }
}

/**
 * ГЕНЕРАЦИЯ ОБЩЕГО АНАЛИЗА CV
 */
export async function analyzeCVGeneralWithGroq(cvFilePath, apiKey, model, provider = 'groq') {
  console.log(`🤖 ГЕНЕРАЦИЯ ОБЩЕГО АНАЛИЗА CV (${provider})...`);
  
  try {
    let cvText = '';
    if (cvFilePath.endsWith('.pdf')) {
      cvText = await readPdfText(cvFilePath);
    } else {
      cvText = fs.readFileSync(cvFilePath, 'utf-8');
    }

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
    ${cvText.substring(0, 15000)}`;

    const aiResult = await callAI({
      provider,
      apiKey,
      model,
      messages: [
        { role: 'system', content: 'Ты карьерный консультант. Отвечай только валидным JSON на русском языке.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      responseFormat: { type: "json_object" }
    });

    // Извлекаем лимиты если это Groq
    if (aiResult.headers) {
      import('./storage.js').then(m => m.saveGroqStatusFromHeaders(aiResult.headers));
    }

    return JSON.parse(aiResult.content || '{}');
  } catch (error) {
    console.error('❌ Ошибка анализа CV:', error);
    // Если ошибка 429 - сохраняем статус паузы (только для Groq)
    if (error.status === 429 && provider === 'groq') {
      import('./storage.js').then(m => m.saveGroqStatus({ pausedUntil: Date.now() + 60000 }));
    }
    throw error;
  }
}

/**
 * ПОЛНЫЙ АНАЛИЗ CV ДЛЯ ИЗВЛЕЧЕНИЯ ДАННЫХ
 */
export async function analyzeCVWithGroq(cvFilePath, apiKey, model, provider = 'groq') {
  console.log(`🤖 НАЧИНАЕМ АНАЛИЗ CV С ПОМОЩЬЮ ${provider.toUpperCase()} AI...`);
  
  if (!fs.existsSync(cvFilePath)) {
    throw new Error(`❌ Файл CV не найден: ${cvFilePath}`);
  }
  
  try {
    let cvText = '';
    if (cvFilePath.endsWith('.pdf')) {
      cvText = await readPdfText(cvFilePath);
    } else {
      cvText = fs.readFileSync(cvFilePath, 'utf-8');
    }
    
    let cleanedText = cvText
      .replace(/[^\x20-\x7E\u0400-\u04FF\n]/g, ' ') 
      .replace(/\s+/g, ' ') 
      .trim();
    
    const aiResult = await callAI({
      provider,
      apiKey,
      model,
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
          content: `Проанализируй это резюме:\n\n${cleanedText.substring(0, 15000)}`
        }
      ],
      temperature: 0.2,
      responseFormat: { type: "json_object" }
    });
    
    // Извлекаем лимиты если это Groq
    if (aiResult.headers) {
      import('./storage.js').then(m => m.saveGroqStatusFromHeaders(aiResult.headers));
    }

    const responseText = aiResult.content;
    if (!responseText) throw new Error(`${provider.toUpperCase()} не вернул ответ`);
    
    let cleanText = responseText.trim().replace(/```json\s*|```/g, '');
    let cvData = JSON.parse(cleanText);
    
    cvData.firstName = cvData.firstName || 'Не указано';
    cvData.lastName = cvData.lastName || 'Не указано';
    cvData.position = cvData.position || 'Specialist';
    
    return cvData;
  } catch (error) {
    console.error(`❌ Ошибка анализа CV (${provider}):`, error.message);
    throw error;
  }
}
