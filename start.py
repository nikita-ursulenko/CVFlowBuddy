import subprocess
import os
import sys

# Находим путь к скрипту в папке desktop
current_dir = os.path.dirname(os.path.abspath(__file__))
manager_path = os.path.join(current_dir, "desktop", "manager.py")

if __name__ == "__main__":
    if os.path.exists(manager_path):
        # Запускаем оригинальный менеджер
        subprocess.run([sys.executable, manager_path])
    else:
        print(f"Ошибка: Не удалось найти {manager_path}")
        sys.exit(1)
