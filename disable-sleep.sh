#!/bin/bash

# Скрипт для отключения спящего режима в Ubuntu
# Запустите: sudo bash disable-sleep.sh

echo "🔧 Отключаем спящий режим в Ubuntu..."
echo ""

# Отключаем все режимы сна через systemd
echo "1️⃣ Отключаем sleep/suspend/hibernate через systemd..."
systemctl mask sleep.target
systemctl mask suspend.target
systemctl mask hibernate.target
systemctl mask hybrid-sleep.target

echo ""
echo "2️⃣ Настраиваем параметры питания..."

# Отключаем автоматическое отключение через GNOME/systemd
if command -v gsettings &> /dev/null; then
    echo "   Настраиваем GNOME settings..."
    # Отключаем автоматический suspend
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-timeout 0
    
    # Отключаем затемнение экрана
    gsettings set org.gnome.desktop.session idle-delay 0
    
    echo "   ✅ GNOME настройки обновлены"
fi

# Настройка через systemd-logind
if [ -f /etc/systemd/logind.conf ]; then
    echo "   Настраиваем systemd-logind..."
    
    # Создаём backup
    cp /etc/systemd/logind.conf /etc/systemd/logind.conf.backup
    
    # Обновляем настройки
    cat > /etc/systemd/logind.conf.d/nosleep.conf << 'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
IdleAction=ignore
EOF
    
    # Перезапускаем сервис
    systemctl restart systemd-logind
    
    echo "   ✅ systemd-logind настроен"
fi

echo ""
echo "✅ Спящий режим отключен!"
echo ""
echo "📋 Выполненные действия:"
echo "   • Отключены sleep.target, suspend.target, hibernate.target"
echo "   • Отключен автоматический suspend"
echo "   • Отключено затемнение экрана"
echo "   • Система будет работать 24/7"
echo ""
echo "💡 Для проверки статуса выполните:"
echo "   systemctl status sleep.target"
echo ""


