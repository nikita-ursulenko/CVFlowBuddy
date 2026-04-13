#!/bin/bash

# Скрипт для открытия портов 5004 и 5050 в firewall
# Запустите: sudo bash open-ports.sh

echo "🔓 Открываем порты для доступа с телефона..."
echo ""

# Проверяем статус UFW
echo "1️⃣ Проверяем firewall UFW..."
UFW_STATUS=$(ufw status 2>/dev/null | grep -i "Status:" | awk '{print $2}')

if [ "$UFW_STATUS" == "active" ]; then
    echo "   ✅ UFW активен"
    
    # Открываем порт 5004 (Frontend)
    echo ""
    echo "2️⃣ Открываем порт 5004 (Frontend)..."
    ufw allow 5004/tcp
    echo "   ✅ Порт 5004 открыт"
    
    # Открываем порт 5050 (Backend)
    echo ""
    echo "3️⃣ Открываем порт 5050 (Backend)..."
    ufw allow 5050/tcp
    echo "   ✅ Порт 5050 открыт"
    
    # Перезагружаем правила
    echo ""
    echo "4️⃣ Применяем правила..."
    ufw reload
    echo "   ✅ Правила применены"
    
    echo ""
    echo "📋 Текущие правила UFW:"
    ufw status numbered | grep -E "5004|5050"
    
elif [ "$UFW_STATUS" == "inactive" ]; then
    echo "   ℹ️  UFW неактивен - порты открыты по умолчанию"
else
    echo "   ℹ️  UFW не установлен - порты открыты по умолчанию"
fi

# Проверяем iptables
echo ""
echo "5️⃣ Проверяем iptables..."
if command -v iptables &> /dev/null; then
    # Разрешаем входящие соединения на порты 5004 и 5050
    iptables -I INPUT -p tcp --dport 5004 -j ACCEPT 2>/dev/null
    iptables -I INPUT -p tcp --dport 5050 -j ACCEPT 2>/dev/null
    echo "   ✅ Правила iptables добавлены"
else
    echo "   ℹ️  iptables не установлен"
fi

echo ""
echo "✅ Порты открыты!"
echo ""
echo "📱 Для подключения с телефона используйте:"
echo ""
IP_ADDR=$(hostname -I | awk '{print $1}')
echo "   🌐 Frontend: http://$IP_ADDR:5004"
echo "   🔧 Backend:  http://$IP_ADDR:5050"
echo ""
echo "💡 Убедитесь что телефон подключен к той же WiFi сети!"
echo ""

