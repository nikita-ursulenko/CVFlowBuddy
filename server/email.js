import nodemailer from 'nodemailer';
import path from 'path';
import { exec } from 'child_process';

/**
 * Функция для отправки Email с вложением (резюме)
 */
export async function sendEmailWithAttachment(smtpConfig, to, subject, html, attachmentPath) {
  console.log(`📧 Попытка отправки письма на ${to}...`);
  
  if (!smtpConfig || !smtpConfig.host || !smtpConfig.auth?.user) {
    console.error('❌ Ошибка: SMTP настройки не заданы');
    return { success: false, error: 'SMTP настройки не заданы' };
  }

  try {
    const transporter = nodemailer.createTransport(smtpConfig);

    const attachments = [];
    if (attachmentPath && typeof attachmentPath === 'string') {
      attachments.push({
        filename: path.basename(attachmentPath),
        path: attachmentPath
      });
    }

    const info = await transporter.sendMail({
      from: `"${smtpConfig.name || 'CV Flow Buddy'}" <${smtpConfig.auth.user}>`,
      to,
      subject,
      html,
      attachments
    });

    console.log(`✅ Письмо успешно отправлено: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Ошибка отправки Email:', error);
    return { success: false, error: error.message };
  }
}

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
