import path from 'path';
import { exec } from 'child_process';

/**
 * Функция для открытия почтового клиента (Mail.app на Mac)
 */
export async function openMailClient(to, subject, body) {
  console.log(`🖥️  ОТКРЫВАЕМ MAIL.APP ДЛЯ: ${to}`);
  try {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailto = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    
    // В MacOS используем команду open mailto:...
    exec(`open "${mailto}"`);
    
    console.log(`   ✅ Команда open выполнена успешно`);
    return { success: true };
  } catch (error) {
    console.error('   ❌ Ошибка открытия почтового клиента:', error);
    return { success: false, error: error.message };
  }
}
