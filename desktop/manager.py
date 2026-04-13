import tkinter as tk
from tkinter import ttk, messagebox
from typing import Any, Callable, List
import subprocess
import os
import time
import webbrowser
import shutil

# Пути: теперь скрипт лежит в папке desktop/, поэтому корень проекта на уровень выше
DESKTOP_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(DESKTOP_DIR)

def get_env_with_node():
    """Создает копию окружения с добавленными путями к node/npm для macOS"""
    env = os.environ.copy()
    common_paths = [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin"
    ]
    # Добавляем пути в начало PATH
    current_path = env.get("PATH", "")
    env["PATH"] = ":".join(common_paths) + (":" + current_path if current_path else "")
    return env

APP_ENV = get_env_with_node()

def get_npm_path():
    """Находит путь к npm, учитывая специфику macOS/Windows и упаковку в .app"""
    # Проверяем в дополненном окружении
    npm = shutil.which("npm", path=APP_ENV["PATH"])
    if npm: return npm
    return "npm"

NPM_PATH = get_npm_path()
BACKEND_CMD = [NPM_PATH, "run", "agent:server"]
FRONTEND_CMD = [NPM_PATH, "run", "dev", "--", "--port", "8080"]
BACKEND_LOG = "server.log"
FRONTEND_LOG = "frontend.log"

# Строгая премиум палитра (в стиле Shadcn UI / Zinc)
BG_COLOR = "#09090B"
PANEL_COLOR = "#18181B"
HOVER_COLOR = "#27272A"
TEXT_COLOR = "#FAFAFA"
MUTED_TEXT = "#A1A1AA"
ACCENT_GREEN = "#10B981"
ACCENT_RED = "#EF4444"
ACCENT_BLUE = "#3B82F6"
BORDER_COLOR = "#27272A"

class ElegantButton(tk.Frame):
    def __init__(self, parent: Any, text: str, command: Callable, **kwargs: Any):
        super().__init__(
            parent, bg=PANEL_COLOR,
            highlightbackground=BORDER_COLOR, highlightthickness=1, bd=0, **kwargs
        )
        self.command = command
        self.normal_bg = PANEL_COLOR
        self.hover_bg = HOVER_COLOR
        self._anim_job: Any = None
        
        self.label = tk.Label(
            self, text=text, bg=PANEL_COLOR, fg=TEXT_COLOR, 
            font=("Helvetica", 12, "bold"), pady=12
        )
        self.label.pack(expand=True, fill="both")
        
        self.bind_events()
        
    def bind_events(self):
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)
        self.bind("<Button-1>", self.on_press)
        self.bind("<ButtonRelease-1>", self.on_release)
        self.label.bind("<Enter>", self.on_enter)
        self.label.bind("<Leave>", self.on_leave)
        self.label.bind("<Button-1>", self.on_press)
        self.label.bind("<ButtonRelease-1>", self.on_release)

    def unbind_events(self):
        self.unbind("<Enter>")
        self.unbind("<Leave>")
        self.unbind("<Button-1>")
        self.unbind("<ButtonRelease-1>")
        self.label.unbind("<Enter>")
        self.label.unbind("<Leave>")
        self.label.unbind("<Button-1>")
        self.label.unbind("<ButtonRelease-1>")

    def set_state(self, state: str):
        if state == "disabled":
            self.unbind_events()
            self.config(bg=BG_COLOR, highlightbackground=BG_COLOR)
            self.label.config(bg=BG_COLOR, fg="#3F3F46")
        else:
            self.bind_events()
            self.config(bg=self.normal_bg, highlightbackground=BORDER_COLOR)
            self.label.config(bg=self.normal_bg, fg=TEXT_COLOR)

    def _hex_to_rgb(self, h: str) -> tuple[int, ...]: # pyre-ignore[24]
        h = h.lstrip('#')
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        
    def _rgb_to_hex(self, rgb: tuple[int, ...]) -> str: # pyre-ignore[24]
        return '#%02x%02x%02x' % rgb

    def _animate_color(self, target_hex: str, step: int = 0):
        if step > 5:
            return
        
        current_hex = self.cget("bg")
        c_rgb = self._hex_to_rgb(current_hex)
        t_rgb = self._hex_to_rgb(target_hex)
        
        r = int(c_rgb[0] + (t_rgb[0] - c_rgb[0]) * 0.4)
        g = int(c_rgb[1] + (t_rgb[1] - c_rgb[1]) * 0.4)
        b = int(c_rgb[2] + (t_rgb[2] - c_rgb[2]) * 0.4)
        
        new_hex = self._rgb_to_hex((r, g, b))
        self.config(bg=new_hex)
        self.label.config(bg=new_hex)
        
        self._anim_job = self.after(16, lambda: self._animate_color(target_hex, step + 1)) # pyre-ignore[6]

    def on_enter(self, e: Any):
        if self._anim_job: self.after_cancel(self._anim_job)
        self._animate_color(self.hover_bg)
        
    def on_leave(self, e: Any):
        if self._anim_job: self.after_cancel(self._anim_job)
        self._animate_color(self.normal_bg)
        
    def on_press(self, e: Any):
        if self._anim_job: self.after_cancel(self._anim_job)
        self.config(bg="#000000") 
        self.label.config(bg="#000000")
        
    def on_release(self, e: Any):
        self.on_enter(e)
        self.winfo_toplevel().after(150, lambda: self.command()) # pyre-ignore[6]


class ProjectManager:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("CVFlow Buddy Manager")
        self.root.geometry("450x420")
        self.root.configure(bg=BG_COLOR)
        self.root.resizable(False, False)
        
        # Эффект стекла MacOS
        self.root.attributes('-alpha', 0.96)

        # Центрирование
        self._center_window()
        
        # Переменные (для защиты от ворнингов Pyre2)
        self.logs_window: Any = None
        self.notebook: Any = None
        self.backend_text: Any = None
        self.frontend_text: Any = None
        self.status_label: Any = None
        self.led_canvas: Any = None
        self.led_item: Any = None
        self.led_anim_job: Any = None
        
        self.loading_label: Any = None
        self.btn_logs: Any = None
        
        self.buttons: List[ElegantButton] = []
        self.is_loading = False
        self.loading_text = ""
        self.loading_ticks = 0

        self._build_bg_grid()
        self._build_ui()
        
        # Проверка наличия npm
        if NPM_PATH == "npm" and not shutil.which("npm"):
            messagebox.showwarning(
                "Зависимости не найдены", 
                "Не удалось найти Node.js / npm. \nПожалуйста, убедитесь, что Node.js установлен."
            )

    def _build_bg_grid(self):
        self.bg_canvas = tk.Canvas(self.root, width=450, height=420, bg=BG_COLOR, bd=0, highlightthickness=0)
        self.bg_canvas.place(x=0, y=0)
        
        grid_color = "#121215"
        for i in range(0, 450, 30):
            self.bg_canvas.create_line(i, 0, i, 420, fill=grid_color)
        for i in range(0, 420, 30):
            self.bg_canvas.create_line(0, i, 450, i, fill=grid_color)

    def _center_window(self):
        self.root.update_idletasks()
        w = 450
        h = 420
        x = (self.root.winfo_screenwidth() // 2) - (w // 2)
        y = (self.root.winfo_screenheight() // 2) - (h // 2)
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    def _build_ui(self):
        header_frame = tk.Frame(self.root, bg=BG_COLOR)
        header_frame.pack(fill="x", pady=(35, 10))
        
        tk.Label(
            header_frame, text="CVFLOW BUDDY", font=("Helvetica", 22, "bold"),
            bg=BG_COLOR, fg=TEXT_COLOR
        ).pack(side="top")
        tk.Label(
            header_frame, text="S Y S T E M   M A N A G E R", font=("Helvetica", 9, "bold"),
            bg=BG_COLOR, fg=ACCENT_BLUE
        ).pack(side="top", pady=(2, 0))

        status_frame = tk.Frame(self.root, bg=BG_COLOR)
        status_frame.pack(pady=(5, 30))

        self.led_canvas = tk.Canvas(status_frame, width=16, height=16, bg=BG_COLOR, bd=0, highlightthickness=0)
        self.led_canvas.pack(side="left", padx=(0, 6))
        self.led_item = self.led_canvas.create_oval(3, 3, 13, 13, fill=MUTED_TEXT, outline="")

        self.status_label = tk.Label(
            status_frame, text="Система остановлена", font=("Helvetica", 11),
            bg=BG_COLOR, fg=MUTED_TEXT
        )
        self.status_label.pack(side="left")

        # Grid layout for buttons
        buttons_frame = tk.Frame(self.root, bg=BG_COLOR)
        buttons_frame.pack(fill="x", padx=25, pady=0)
        buttons_frame.columnconfigure(0, weight=1)
        buttons_frame.columnconfigure(1, weight=1)

        btn_start = ElegantButton(buttons_frame, "🚀 ЗАПУСТИТЬ САЙТ", self.cmd_start)
        btn_start.grid(row=0, column=0, sticky="ew", padx=6, pady=6)
        self.buttons.append(btn_start)

        btn_restart = ElegantButton(buttons_frame, "🔄 РЕСТАРТ", self.cmd_restart)
        btn_restart.grid(row=0, column=1, sticky="ew", padx=6, pady=6)
        self.buttons.append(btn_restart)

        btn_site = ElegantButton(buttons_frame, "🌐 САЙТ", self.cmd_open_site)
        btn_site.grid(row=1, column=0, sticky="ew", padx=6, pady=6)
        self.buttons.append(btn_site)

        btn_logs = ElegantButton(buttons_frame, "📝 ЛОГИ", self.open_logs_window)
        btn_logs.grid(row=1, column=1, sticky="ew", padx=6, pady=6)
        self.btn_logs = btn_logs

        btn_stop = ElegantButton(buttons_frame, "🛑 ЗАВЕРШИТЬ", self.cmd_stop)
        btn_stop.grid(row=2, column=0, sticky="ew", padx=6, pady=6)
        self.buttons.append(btn_stop)

        btn_kill = ElegantButton(buttons_frame, "💀 УБИТЬ ОКНА", self.cmd_kill_browsers)
        btn_kill.grid(row=2, column=1, sticky="ew", padx=6, pady=6)
        self.buttons.append(btn_kill)

        self.loading_label = tk.Label(
            self.root, text="", font=("Helvetica", 10, "italic"),
            bg=BG_COLOR, fg=ACCENT_BLUE
        )
        
        tk.Label(
            self.root, text="v3.0 Premium UI", font=("Helvetica", 9),
            bg=BG_COLOR, fg="#52525B"
        ).place(relx=0.5, rely=0.96, anchor="center")

    # --- Анимации и управление UI ---
    
    def _pulse_led(self, size: float = 3.0, expanding: bool = True, target_color: str = "#A1A1AA"):
        if self.led_anim_job:
            self.root.after_cancel(self.led_anim_job)
            
        self.led_canvas.itemconfig(self.led_item, fill=target_color)
        
        # Легкая пульсация радиуса
        if expanding:
            size += 0.2
            if size >= 4.5: expanding = False
        else:
            size -= 0.2
            if size <= 2.5: expanding = True
            
        self.led_canvas.coords(self.led_item, 8 - size, 8 - size, 8 + size, 8 + size)
        
        # Только если работает или загружается
        if self.is_loading or target_color in [ACCENT_BLUE, ACCENT_GREEN]:
            self.led_anim_job = self.root.after(50, lambda: self._pulse_led(size, expanding, target_color)) # pyre-ignore[6]
        else:
            self.led_canvas.coords(self.led_item, 3, 3, 13, 13)

    def set_status(self, text: str, color: str):
        self.status_label.config(text=text, fg=color)
        self._pulse_led(target_color=color)

    def set_loading(self, state: bool, text: str = "Выполнение"):
        self.is_loading = state
        self.loading_text = text
        if state:
            self.loading_ticks = 0
            self.loading_label.place(relx=0.5, rely=0.88, anchor="center")
            
            for btn in self.buttons:
                btn.set_state("disabled")
            
            self._animate_loading()
        else:
            self.loading_label.place_forget()
            for btn in self.buttons:
                btn.set_state("normal")

    def _animate_loading(self):
        if not self.is_loading:
            return
        self.loading_ticks += 1
        spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        spinner = spinners[self.loading_ticks % len(spinners)]
        self.loading_label.config(text=f"{spinner}  {self.loading_text}")
        self.root.after(80, lambda: self._animate_loading()) # pyre-ignore[6]

    # --- Логика Управления Процессами ---

    def _stop_logic(self):
        subprocess.run(["pkill", "-f", "node server/index.js"], stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-f", "vite"], stderr=subprocess.DEVNULL)
        for f in [".backend.pid", ".frontend.pid"]:
            p = os.path.join(PROJECT_DIR, f)
            if os.path.exists(p): os.remove(p)

    def _start_logic(self):
        b_log = open(os.path.join(PROJECT_DIR, BACKEND_LOG), "w")
        f_log = open(os.path.join(PROJECT_DIR, FRONTEND_LOG), "w")
        subprocess.Popen(BACKEND_CMD, cwd=PROJECT_DIR, stdout=b_log, stderr=subprocess.STDOUT, env=APP_ENV)
        subprocess.Popen(FRONTEND_CMD, cwd=PROJECT_DIR, stdout=f_log, stderr=subprocess.STDOUT, env=APP_ENV)

    # --- Публичные Команды ---

    def cmd_start(self):
        self.set_loading(True, "Запуск серверов")
        self.set_status("Инициализация запуска...", ACCENT_BLUE)
        self.root.after(300, lambda: self._start_step_1()) # pyre-ignore[6]

    def _start_step_1(self):
        self._stop_logic() 
        self._start_logic()
        self.root.after(800, lambda: self._start_step_end()) # pyre-ignore[6]
        
    def _start_step_end(self):
        self.set_status("Серверы запущены (5050, 8080)", ACCENT_GREEN)
        self.set_loading(False)

    def cmd_stop(self):
        self.set_loading(True, "Завершение процессов")
        self.set_status("Мягкая остановка...", ACCENT_RED)
        self.root.after(500, lambda: self._stop_step_1()) # pyre-ignore[6]

    def _stop_step_1(self):
        self._stop_logic()
        self.root.after(500, lambda: self._stop_step_end()) # pyre-ignore[6]

    def _stop_step_end(self):
        self.set_status("Система остановлена", MUTED_TEXT)
        self.set_loading(False)

    def cmd_restart(self):
        self.set_loading(True, "Инициализация рестарта")
        self.set_status("Остановка старых процессов...", ACCENT_RED)
        self.root.after(500, lambda: self._restart_step_1()) # pyre-ignore[6]

    def _restart_step_1(self):
        self._stop_logic()
        self.set_status("Подготовка к запуску...", MUTED_TEXT)
        self.root.after(1200, lambda: self._restart_step_2()) # pyre-ignore[6]

    def _restart_step_2(self):
        self.set_status("Развертывание серверов...", ACCENT_BLUE)
        self._start_logic()
        self.root.after(1000, lambda: self._restart_step_end()) # pyre-ignore[6]

    def _restart_step_end(self):
        self.set_status("Серверы онлайн (5050, 8080)", ACCENT_GREEN)
        self.set_loading(False)

    def cmd_kill_browsers(self):
        self.set_loading(True, "Закрытие окон...")
        self.set_status("Уничтожение Chromium...", ACCENT_RED)
        self.root.after(300, lambda: self._kill_browsers_logic()) # pyre-ignore[6]

    def _kill_browsers_logic(self):
        subprocess.run(["pkill", "-f", "Chromium"], stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-f", "playwright"], stderr=subprocess.DEVNULL)
        self.set_status("Окна агентов закрыты", ACCENT_GREEN)
        self.set_loading(False)

    def cmd_open_site(self):
        self.set_status("Открытие сайта (Порт 8080)...", ACCENT_BLUE)
        webbrowser.open("http://localhost:8080")

    # --- Просмотр Логов ---

    def open_logs_window(self):
        if self.logs_window and self.logs_window.winfo_exists():
            self.logs_window.focus()
            return
            
        self.logs_window = tk.Toplevel(self.root)
        self.logs_window.title("Консоль Серверов")
        self.logs_window.geometry("850x650")
        self.logs_window.configure(bg=BG_COLOR)
        
        style = ttk.Style()
        style.theme_use('default')
        style.configure("TNotebook", background=BG_COLOR, borderwidth=0)
        style.configure("TNotebook.Tab", padding=[15, 8], font=('Helvetica', 11, 'bold'), background=PANEL_COLOR, foreground=MUTED_TEXT, borderwidth=0)
        style.map("TNotebook.Tab", background=[("selected", HOVER_COLOR)], foreground=[("selected", TEXT_COLOR)])

        self.notebook = ttk.Notebook(self.logs_window)
        self.notebook.pack(expand=True, fill="both", padx=15, pady=15)
        
        frame_bg = tk.Frame(self.notebook, bg=BG_COLOR)
        frame_front = tk.Frame(self.notebook, bg=BG_COLOR)
        self.notebook.add(frame_bg, text="  BACKEND LOGS  ")
        self.notebook.add(frame_front, text="  FRONTEND LOGS  ")
        
        self.backend_text = tk.Text(frame_bg, bg="#000000", fg=ACCENT_GREEN, font=("Consolas", 11), wrap="word", bd=0, highlightthickness=0, padx=10, pady=10)
        self.backend_text.pack(expand=True, fill="both")
        
        self.frontend_text = tk.Text(frame_front, bg="#000000", fg=ACCENT_GREEN, font=("Consolas", 11), wrap="word", bd=0, highlightthickness=0, padx=10, pady=10)
        self.frontend_text.pack(expand=True, fill="both")
        
        self.update_logs()

    def update_logs(self):
        if not self.logs_window or not self.logs_window.winfo_exists():
            return
            
        def read_tail(filepath: str) -> str:
            if not os.path.exists(filepath): return "> Файл логов пуст или не создан."
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                    last_lines = lines[-150:] if len(lines) > 150 else lines # pyre-ignore[6]
                    return "".join(last_lines)
            except:
                return "> Ошибка чтения логов."
                
        if self.backend_text:
            self.backend_text.delete(1.0, tk.END)
            self.backend_text.insert(tk.END, read_tail(os.path.join(PROJECT_DIR, BACKEND_LOG)))
            self.backend_text.see(tk.END)
            
        if self.frontend_text:
            self.frontend_text.delete(1.0, tk.END)
            self.frontend_text.insert(tk.END, read_tail(os.path.join(PROJECT_DIR, FRONTEND_LOG)))
            self.frontend_text.see(tk.END)
            
        self.logs_window.after(2000, lambda: self.update_logs()) # pyre-ignore[6]

if __name__ == "__main__":
    root = tk.Tk()
    app = ProjectManager(root)
    root.mainloop()
