import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const execPromise = promisify(exec);

/**
 * Функция для создания экземпляра Groq с API ключом
 */
export function createGroqClient(apiKey) {
  if (!apiKey) {
    throw new Error('Groq API ключ не указан');
  }
  return new Groq({ apiKey });
}

/**
 * Функция для создания экземпляра Gemini с API ключом
 */
export function createGeminiClient(apiKey) {
  if (!apiKey) {
    throw new Error('Gemini API ключ не указан');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Функция для правильного чтения PDF через pdf-parse
 */
export async function readPdfText(pdfPath) {
  try {
    console.log('📖 Читаем PDF через pdf-parse v1.1.1...');
    
    // Читаем файл как buffer
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Парсим PDF
    const data = await pdfParse(dataBuffer);
    
    console.log(`✅ PDF успешно прочитан!`);
    console.log(`   📄 Страниц: ${data.numpages}`);
    console.log(`   📝 Символов текста: ${data.text.length}`);
    
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
