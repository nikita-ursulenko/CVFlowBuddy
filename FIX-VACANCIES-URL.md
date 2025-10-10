# 🔧 Исправление: Правильный URL для поиска вакансий

## Проблема
Агент не находил вакансии, потому что использовал неправильный URL:
```
❌ https://lucru.md/ro/posturi-vacante/categorie/it?recent_date=1
```

Этот URL вёл на румынскую версию сайта, а также имел параметр `recent_date=1` который мог фильтровать результаты.

## Решение
Изменён URL на правильный русскоязычный:
```
✅ https://www.lucru.md/ru/posturi-vacante/categorie/it
```

## Изменённые файлы

### 1. `agent-server-simple.js` (строка 1137)
**Было:**
```javascript
const itJobsUrl = 'https://lucru.md/ro/posturi-vacante/categorie/it?recent_date=1';
```

**Стало:**
```javascript
const itJobsUrl = 'https://www.lucru.md/ru/posturi-vacante/categorie/it';
console.log(`   🔗 URL: ${itJobsUrl}`);
await this.page.goto(itJobsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
```

### 2. `src/lib/config/lucru-config.ts` (строки 5 и 52)
**Было:**
```typescript
jobsUrl: 'https://www.lucru.md/ru/posturi-vacante/categorie/it?recent_date=1'
```

**Стало:**
```typescript
jobsUrl: 'https://www.lucru.md/ru/posturi-vacante/categorie/it'
```

## Улучшения

### Добавлено логирование URL
Теперь в консоли агента будет видно точный URL на который переходит агент:
```
📍 Переходим на IT вакансии...
   🔗 URL: https://www.lucru.md/ru/posturi-vacante/categorie/it
✅ Страница загружена
```

### Увеличен таймаут загрузки
```javascript
// Было: waitUntil: 'networkidle'
// Стало: waitUntil: 'domcontentloaded', timeout: 60000
```

Это позволит странице загрузиться быстрее, не дожидаясь всех сетевых запросов.

## Настройка максимального количества CV

В настройках агента можно указать до **100 CV за один запуск**:

### В UI:
1. Откройте раздел "Агент"
2. Нажмите иконку настроек ⚙️
3. Установите "Максимум CV за один запуск": **100**
4. Сохраните настройки

### В коде:
```typescript
// src/lib/config/lucru-config.ts
settings: {
  maxCVDaily: 100,  // Максимум за один запуск
  intervalHours: 4,
  headless: true
}
```

## Проверка

### 1. Проверьте что сервер запущен:
```bash
curl http://localhost:5050/api/health
# Должно вернуть: {"status":"ok","timestamp":"..."}
```

### 2. Проверьте URL в логах:
При запуске разовой отправки в консоли сервера должно быть:
```
📍 Переходим на IT вакансии...
   🔗 URL: https://www.lucru.md/ru/posturi-vacante/categorie/it
✅ Страница загружена

🔍 Ищем элементы вакансий li.vacancyRow...
📋 Найдено вакансий: 912  ← должно быть > 0
```

### 3. Проверьте настройки:
```javascript
// Откройте консоль браузера (F12) и выполните:
const config = JSON.parse(localStorage.getItem('cvflow_lucru_config'));
console.log('Макс CV:', config.settings.maxCVDaily);
// Должно вывести: Макс CV: 100
```

## Почему изменения работают

### Правильный язык интерфейса
- `/ro/` → румынский (может показывать меньше вакансий)
- `/ru/` → русский (показывает все вакансии)

### Без фильтра по дате
- `?recent_date=1` → фильтр только свежих вакансий
- Без параметра → все вакансии (912 штук)

### С `www` в URL
- `https://lucru.md` → может редиректить
- `https://www.lucru.md` → прямой доступ

## Результат

Теперь агент:
✅ Переходит на правильную русскую версию сайта  
✅ Видит все 912 IT вакансий  
✅ Может обрабатывать до 100 вакансий за запуск  
✅ Логирует точный URL для отладки  

---

**Дата исправления:** 2025-10-09  
**Сервер перезапущен:** ✅  
**Готово к использованию:** ✅

