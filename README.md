# 🚀 CVFlow Buddy

<div align="center">
  <div style="display:flex; justify-content:center; gap:5px; flex-wrap:wrap; margin: 10px 0;">
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
    <a href="https://ui.shadcn.com/"><img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui"></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"></a>
    <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright"></a>
  </div>
</div>

**Автоматизированная система для отправки CV на вакансии**

CVFlow Buddy - это интеллектуальная система автоматизации, которая помогает автоматически отправлять ваше резюме на IT вакансии на сайте [lucru.md](https://lucru.md). Система использует AI для анализа резюме и автоматизирует весь процесс поиска и отправки CV на подходящие вакансии.

## ✨ Основные возможности

- 🤖 **AI-анализ резюме** - автоматический анализ CV с помощью Groq AI для извлечения ключевой информации
- 🔐 **Автоматическая авторизация** - вход в аккаунт lucru.md с сохранением сессии
- 📤 **Автоматическая отправка CV** - массовая отправка резюме на IT вакансии
- ⏰ **Планировщик задач** - настройка автоматической отправки по расписанию
- 📊 **Статистика отправок** - отслеживание успешных отправок и ошибок
- 🎯 **Умный подбор вакансий** - автоматический поиск и фильтрация подходящих вакансий
- 💼 **Синхронизация CV** - автоматическая загрузка и обновление CV на сайте

## 🛠️ Технологии

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, Playwright (автоматизация браузера)
- **AI**: Groq API (Llama 3.3 70B) для анализа резюме
- **Автоматизация**: Playwright для работы с браузером

## 📋 Требования

- Node.js v18+ и npm
- Playwright браузеры (устанавливаются автоматически)

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
npx playwright install
```

### 2. Запуск серверов

**Автоматический запуск (рекомендуется):**

```bash
bash START-SERVERS.sh
```

**Ручной запуск:**

1. **Backend сервер** (порт 5050):
```bash
node agent-server-simple.js
```

2. **Frontend сервер** (порт 8000):
```bash
npm run dev
```

### 3. Доступ к приложению

После запуска серверов откройте браузер:

- **Локально**: http://localhost:8000
- **По IP**: http://YOUR_IP:8000

### Получить IP-адрес

```bash
hostname -I | awk '{print $1}'  # Linux
ipconfig getifaddr en0          # macOS
```

## 📖 Использование

### 1. Загрузка CV

1. Перейдите в раздел **CV** → **Загрузить CV**
2. Выберите PDF файл с резюме
3. Дождитесь автоматического AI-анализа

### 2. Авторизация

1. Нажмите **"Войти в Lucru.md"**
2. Введите email и пароль
3. Система сохранит сессию для дальнейшей работы

### 3. Синхронизация CV

1. Перейдите в раздел **CV** → **Синхронизация**
2. Нажмите **"Синхронизировать CV"**
3. Система автоматически загрузит CV на сайт

### 4. Автоматическая отправка

1. Перейдите в раздел **Автоагенты** → **Настройки**
2. Настройте параметры:
   - Максимум CV в день (10/20/50)
   - Интервал проверки (1/2/3/6/12/24 часа)
   - Рабочие часы
3. Нажмите **"Запустить автоотправку"**

## 🔧 Настройка

### Порт Frontend

По умолчанию frontend запускается на порту **8000**. Чтобы изменить порт, отредактируйте `vite.config.ts`:

```typescript
server: {
  port: 8000, // Измените на нужный порт
}
```

### Порт Backend

Backend по умолчанию использует порт **5050**. Чтобы изменить, установите переменную окружения:

```bash
PORT=5050 node agent-server-simple.js
```

## 📁 Структура проекта

```
cvflow-buddy/
├── data/               # Персистентные данные (JSON)
│   ├── emails.json        # История отправленных писем
│   ├── stats.json         # Статистика отправок
│   └── lucru-cookies.json # Куки сессий
├── desktop/            # Standalone-приложение для macOS/Windows
│   ├── manager.py         # Панель управления (Python/Tkinter)
│   └── icon.icns          # Иконки и активы
├── scripts/            # Вспомогательные скрипты
├── server/             # Бэкенд (Node.js/Express)
├── src/                # Фронтенд (React/Vite)
├── uploads/            # Загруженные CV файлы
└── ...
```

## 🛑 Остановка серверов

```bash
pkill -f "node"
```

Или остановите процессы вручную через `Ctrl+C` в терминалах.

## ⚠️ Важно для ARM64 систем (Apple Silicon, Parallels ARM)

Если вы используете ARM64 архитектуру:

- ❌ **Google Chrome AMD64** не будет работать (несовместимая архитектура)
- ✅ **Chromium ARM64** автоматически установится через Playwright
- ✅ Все функции автоматизации работают идентично

### Проверка архитектуры

```bash
uname -m
# arm64 или aarch64 = ARM система
# x86_64 = AMD64/Intel система
```

### Установка браузеров Playwright

```bash
npx playwright install
```

Chromium будет установлен в: `~/.cache/ms-playwright/chromium-*/chrome-linux/chrome`

## 📚 Дополнительная документация

- [QUICK-START.md](./QUICK-START.md) - Быстрый старт автоотправки
- [AGENT-GUIDE.md](./AGENT-GUIDE.md) - Руководство по автоагенту
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Решение проблем
- [FAQ.md](./FAQ.md) - Частые вопросы
- [SETUP-24-7.md](./SETUP-24-7.md) - Настройка для работы 24/7

## 🔒 Безопасность

- Cookies и сессии хранятся локально
- Пароли не сохраняются, только сессионные cookies
- Все данные обрабатываются локально

## 📝 Лицензия

Private project

---

**Создано с ❤️ для автоматизации поиска работы**
