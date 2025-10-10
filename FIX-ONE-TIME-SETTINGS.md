# 🔧 Исправление: Разовая отправка теперь использует настройки агента

## Проблема

**Разовая отправка** и **Автозапуск** использовали разные источники для количества CV:

```typescript
// Разовая отправка (БЫЛО НЕПРАВИЛЬНО):
const maxJobs = config?.settings?.maxCVDaily || settings.maxCVDaily || 20;
//              ⬆️ Приоритет 1: config (20 по умолчанию)
//                               ⬆️ Приоритет 2: settings (100 от пользователя)

// Автозапуск (УЖЕ ПРАВИЛЬНО):
maxJobs: settings.maxCVDaily  // Используем настройки агента
```

**Результат:** Разовая отправка всегда использовала 20 CV, игнорируя настройки пользователя.

## Решение

Изменён приоритет для разовой отправки:

```typescript
// Разовая отправка (ТЕПЕРЬ ПРАВИЛЬНО):
const maxJobs = settings.maxCVDaily || config?.settings?.maxCVDaily || 20;
//              ⬆️ Приоритет 1: settings (100 от пользователя) ✅
//                               ⬆️ Приоритет 2: config (fallback)
```

## Изменённые файлы

### `src/components/agents/AgentControl.tsx`

**Строка 313 (было):**
```typescript
const maxJobs = config?.settings?.maxCVDaily || settings.maxCVDaily || 20;
```

**Строка 313 (стало):**
```typescript
// Приоритет: 1) settings из AgentState, 2) config, 3) 20 по умолчанию
const maxJobs = settings.maxCVDaily || config?.settings?.maxCVDaily || 20;
console.log('📊 Разовая отправка: maxJobs =', maxJobs, '(из settings.maxCVDaily =', settings.maxCVDaily, ')');
```

**Строка 395 (было):**
```typescript
headless: config?.settings?.headless ?? settings.headless ?? true
```

**Строка 395 (стало):**
```typescript
headless: settings.headless ?? config?.settings?.headless ?? true
```

## Теперь работает одинаково

### Разовая отправка ⚡
```typescript
handleAutoApply() {
  const maxJobs = settings.maxCVDaily;  // ✅ Из настроек агента
  await agentServerAPI.autoApplyToJobs(sessionId, cvData, { 
    maxJobs: maxJobs,
    headless: settings.headless
  });
}
```

### Автозапуск 🤖
```typescript
runAgentTask() {
  const maxJobs = settings.maxCVDaily;  // ✅ Из настроек агента
  await agentServerAPI.autoApplyToJobs(sessionId, cvData, { 
    maxJobs: maxJobs,
    headless: settings.headless,
    isScheduled: true
  });
}
```

## Источник настроек

Оба режима теперь используют `settings` из `useAgentState()`:

```typescript
const { 
  settings,     // ← Настройки агента (maxCVDaily, intervalHours, headless)
  // ...
} = useAgentState();

// settings содержит:
// {
//   maxCVDaily: 100,      // Из UI настроек
//   intervalHours: 4,
//   headless: true
// }
```

## Проверка

### В консоли браузера (F12):
```javascript
// После нажатия "Разовая отправка" увидите:
📊 Разовая отправка: maxJobs = 100 (из settings.maxCVDaily = 100)
🤖 Запуск автоотправки на 100 вакансий...
```

### В консоли сервера:
```
🚀 Запуск автоматической отправки CV на IT вакансии...
   👤 Кандидат: Никита Урсуленко
   📊 Параметры: max=100, minMatch=70%
======================================================================
📋 Параметры:
   • Максимум вакансий: 100  ← Теперь правильное значение!
```

## Где устанавливаются настройки

### 1. UI Настройки (приоритет 1)
```
Раздел "Агент" → Иконка ⚙️ → 
"Максимум CV за один запуск" → Выбрать 100
```

### 2. Конфигурация по умолчанию (приоритет 2)
```typescript
// src/lib/config/lucru-config.ts
settings: {
  maxCVDaily: 20,  // Только если нет настроек из UI
  intervalHours: 4,
  headless: true
}
```

### 3. Хардкод fallback (приоритет 3)
```typescript
const maxJobs = settings.maxCVDaily || config?.settings?.maxCVDaily || 20;
//                                                                      ⬆️
//                                                  Только если всё остальное undefined
```

## Логика работы

```
┌─────────────────────────────────┐
│  Пользователь нажал кнопку      │
│  "Разовая отправка" ⚡           │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Получить maxJobs               │
│  1. settings.maxCVDaily (100)   │ ✅
│  2. config.settings (20)        │
│  3. Fallback (20)               │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Отправить на 100 вакансий      │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Мониторинг прогресса           │
│  Каждые 15 сек                  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Завершено! 100/100             │
└─────────────────────────────────┘
```

## Результат

✅ **Разовая отправка** теперь работает точно как **Автозапуск**  
✅ Оба используют настройки из `settings` (AgentState)  
✅ Если установить 100 CV → отправит 100 CV  
✅ Добавлено логирование для отладки  
✅ Одинаковый приоритет для `maxJobs` и `headless`  

---

**Дата исправления:** 2025-10-09  
**Vite HMR:** ✅ Изменения применены автоматически  
**Готово к использованию:** ✅  

Перезагрузите страницу в браузере для гарантированного применения изменений!

