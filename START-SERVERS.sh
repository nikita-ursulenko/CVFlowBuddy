#!/bin/bash

# Скрипт для запуска серверов CVFlow Buddy с логикой перезапуска
# Использование: bash START-SERVERS.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Перезапуск серверов CVFlow Buddy                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Переходим в директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

BACKEND_PID_FILE=".backend.pid"
FRONTEND_PID_FILE=".frontend.pid"

# Функция для остановки процесса
stop_process() {
    local pid_file=$1
    local name=$2
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null; then
            echo "🛑 Остановка $name (PID: $pid)..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
        fi
        rm "$pid_file"
    fi
    # На всякий случай убиваем по имени, если PID не совпал
    if [ "$name" == "Backend" ]; then
        pkill -f "node server/index.js" 2>/dev/null
    else
        pkill -f "vite" 2>/dev/null
    fi
}

echo "🧹 Очистка старых процессов..."
stop_process "$BACKEND_PID_FILE" "Backend"
stop_process "$FRONTEND_PID_FILE" "Frontend"
sleep 1

# Проверяем зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

# Запускаем Backend сервер (Agent Server)
echo "🚀 Запуск Agent Server (npm run agent:server)..."
npm run agent:server > server.log 2>&1 &
echo $! > "$BACKEND_PID_FILE"
echo "   Agent Server запущен (PID: $(cat $BACKEND_PID_FILE))"

# Запускаем Frontend сервер
echo "🚀 Запуск Frontend сервера (порт 8000)..."
npm run dev -- --port 8000 > frontend.log 2>&1 &
echo $! > "$FRONTEND_PID_FILE"
echo "   Frontend запущен (PID: $(cat $FRONTEND_PID_FILE))"

echo ""
echo "✅ СЕРВЕРЫ ПЕРЕЗАПУЩЕНЫ"
echo "🌐 Локальный адрес: http://localhost:8000"
echo "📝 Логи: server.log, frontend.log"
echo ""
echo "💡 Используйте этот скрипт для быстрого обновления серверов."
