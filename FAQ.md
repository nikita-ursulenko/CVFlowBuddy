# FAQ - Часто задаваемые вопросы

## ❓ Почему не устанавливается Google Chrome AMD64?

**Ответ:** Ваша система работает на архитектуре ARM64 (Apple Silicon, Parallels ARM). Google Chrome AMD64 предназначен только для процессоров Intel/AMD (x86_64).

**Решение:** Используйте Chromium ARM64, который автоматически устанавливается через Playwright:

```bash
npx playwright install
```

## ❓ Как проверить архитектуру системы?

```bash
uname -m
```

Результат:
- `arm64` или `aarch64` = ARM система
- `x86_64` = AMD64/Intel система

## ❓ Где находится установленный браузер?

Chromium устанавливается в:
```
~/.cache/ms-playwright/chromium-1194/chrome-linux/chrome
```

Проверить версию:
```bash
~/.cache/ms-playwright/chromium-1194/chrome-linux/chrome --version
```

## ❓ Как запустить серверы?

**Быстрый запуск:**
```bash
bash START-SERVERS.sh
```

**Ручной запуск:**
```bash
# Терминал 1 - Backend
node agent-server-simple.js

# Терминал 2 - Frontend
npm run dev
```

## ❓ Как получить IP-адрес для доступа по сети?

```bash
hostname -I | awk '{print $1}'
```

## ❓ Как остановить серверы?

```bash
pkill -f "node"
```

## ❓ Playwright не находит браузер

**Ошибка:** `Executable doesn't exist at .../chrome-linux/chrome`

**Решение:**
```bash
cd /home/parallels/GitHub/cvflow-buddy
npx playwright install
```

## ❓ Нет доступа к серверу по IP

1. Проверьте firewall:
```bash
sudo ufw status
```

2. Проверьте что серверы слушают на всех интерфейсах:
```bash
ss -tuln | grep -E ':(5004|5050)'
```

3. Проверьте IP-адрес:
```bash
hostname -I
```

## ❓ Ошибка "Missing dependencies to run browsers"

Установите системные зависимости:
```bash
sudo npx playwright install-deps
```

Если есть конфликты:
```bash
sudo apt --fix-broken install
```

## ❓ Node.js версия не подходит

Проект требует Node.js v18+. Проверить версию:
```bash
node --version
```

Если версия меньше 18, установите через NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 📞 Контакты

Если проблема не решена, создайте issue в GitHub репозитории проекта.


