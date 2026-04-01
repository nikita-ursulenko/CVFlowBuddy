#!/bin/bash

# Скрипт для запуска серверов CVFlow Buddy
# Использование: bash START-SERVERS.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Запуск серверов CVFlow Buddy                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Переходим в директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Получаем IP-адрес
IP_ADDR=$(hostname -I | awk '{print $1}')

echo "📍 IP-адрес: $IP_ADDR"
echo ""

# Проверяем установлен ли Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"
echo ""

# Проверяем установлены ли зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
    echo ""
fi

# Проверяем установлены ли Playwright браузеры
if [ ! -d "$HOME/.cache/ms-playwright/chromium-1194" ]; then
    echo "🌐 Установка Playwright браузеров..."
    npx playwright install
    echo ""
fi

# Запускаем Backend сервер
echo "🚀 Запуск Backend сервера (порт 5050)..."
node server/index.js &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 2

# Запускаем Frontend сервер
echo "🚀 Запуск Frontend сервера (порт 5004)..."
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
sleep 5

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ СЕРВЕРЫ УСПЕШНО ЗАПУЩЕНЫ                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Откройте браузер:"
echo "   http://localhost:8000"
echo ""
echo "💡 Для остановки нажмите Ctrl+C или выполните:"
echo "   pkill -f 'node'"
echo ""

# Ждем сигнала остановки
wait

