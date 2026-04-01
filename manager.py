import tkinter as tk
from tkinter import ttk, messagebox
from typing import Any, Callable, List
import subprocess
import os
import time

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_CMD = ["npm", "run", "agent:server"]
FRONTEND_CMD = ["npm", "run", "dev", "--", "--port", "8000"]
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
            parent, bg=PANEL_COLOR, cursor="hand2",
            highlightbackground=BORDER_COLOR, highlightthickness=1, bd=0, **kwargs
        )
        self.command = command
        self.normal_bg = PANEL_COLOR
        self.hover_bg = HOVER_COLOR
        
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
            self.config(cursor="arrow")
        else:
            self.bind_events()
            self.config(bg=self.normal_bg, highlightbackground=BORDER_COLOR)
            self.label.config(bg=self.normal_bg, fg=TEXT_COLOR)
            self.config(cursor="hand2")

    def on_enter(self, e: Any):
        self.config(bg=self.hover_bg)
        self.label.config(bg=self.hover_bg)
        
    def on_leave(self, e: Any):
        self.config(bg=self.normal_bg)
        self.label.config(bg=self.normal_bg)
        
    def on_press(self, e: Any):
        self.config(bg="#000000") 
        self.label.config(bg="#000000")
        
    def on_release(self, e: Any):
        self.on_enter(e)
        self.winfo_toplevel().after(50, lambda: self.command()) # pyre-ignore[6]


class ProjectManager:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("CVFlow Buddy Manager")
        self.root.geometry("450x520")
        self.root.configure(bg=BG_COLOR)
        self.root.resizable(False, False)

        # Центрирование
        self._center_window()
        
        # Переменные (для защиты от ворнингов Pyre2)
        self.logs_window: Any = None
        self.notebook: Any = None
        self.backend_text: Any = None
        self.frontend_text: Any = None
        self.status_label: Any = None
        self.loading_label: Any = None
        self.btn_logs: Any = None
        
        self.buttons: List[ElegantButton] = []
        self.is_loading = False
        self.loading_text = ""
        self.loading_ticks = 0

        self._build_ui()

    def _center_window(self):
        self.root.update_idletasks()
        w = 450
        h = 520
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

        self.status_label = tk.Label(
            self.root, text="● Система остановлена", font=("Helvetica", 11),
            bg=BG_COLOR, fg=MUTED_TEXT
        )
        self.status_label.pack(pady=(5, 25))

        btn_start = ElegantButton(self.root, "ЗАПУСТИТЬ ОНЛАЙН", self.cmd_start)
        btn_start.pack(fill="x", padx=45, pady=6)
        self.buttons.append(btn_start)

        btn_restart = ElegantButton(self.root, "ПЕРЕЗАГРУЗИТЬ", self.cmd_restart)
        btn_restart.pack(fill="x", padx=45, pady=6)
        self.buttons.append(btn_restart)

        btn_stop = ElegantButton(self.root, "ЗАВЕРШИТЬ", self.cmd_stop)
        btn_stop.pack(fill="x", padx=45, pady=6)
        self.buttons.append(btn_stop)

        btn_logs = ElegantButton(self.root, "ПРОСМОТР ЛОГОВ", self.open_logs_window)
        btn_logs.pack(fill="x", padx=45, pady=6)
        # Логи не блокируются при рестарте
        self.btn_logs = btn_logs

        self.loading_label = tk.Label(
            self.root, text="", font=("Helvetica", 10, "italic"),
            bg=BG_COLOR, fg=ACCENT_BLUE
        )
        
        tk.Label(
            self.root, text="v2.2 Strictly Animated", font=("Helvetica", 9),
            bg=BG_COLOR, fg="#52525B"
        ).pack(side="bottom", pady=20)

    # --- Анимации и управление UI ---
    
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
        dots = "." * (self.loading_ticks % 4)
        self.loading_label.config(text=f"{self.loading_text}{dots}")
        self.root.after(350, lambda: self._animate_loading()) # pyre-ignore[6]

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
        subprocess.Popen(BACKEND_CMD, cwd=PROJECT_DIR, stdout=b_log, stderr=subprocess.STDOUT)
        subprocess.Popen(FRONTEND_CMD, cwd=PROJECT_DIR, stdout=f_log, stderr=subprocess.STDOUT)

    # --- Публичные Команды ---

    def cmd_start(self):
        self.set_loading(True, "Запуск серверов")
        self.status_label.config(text="● Инициализация запуска...", fg=ACCENT_BLUE)
        self.root.after(300, lambda: self._start_step_1()) # pyre-ignore[6]

    def _start_step_1(self):
        self._stop_logic() 
        self._start_logic()
        self.root.after(800, lambda: self._start_step_end()) # pyre-ignore[6]
        
    def _start_step_end(self):
        self.status_label.config(text="● Серверы запущены (5050, 8000)", fg=ACCENT_GREEN)
        self.set_loading(False)

    def cmd_stop(self):
        self.set_loading(True, "Завершение процессов")
        self.status_label.config(text="● Мягкая остановка...", fg=ACCENT_RED)
        self.root.after(500, lambda: self._stop_step_1()) # pyre-ignore[6]

    def _stop_step_1(self):
        self._stop_logic()
        self.root.after(500, lambda: self._stop_step_end()) # pyre-ignore[6]

    def _stop_step_end(self):
        self.status_label.config(text="● Система остановлена", fg=MUTED_TEXT)
        self.set_loading(False)

    def cmd_restart(self):
        self.set_loading(True, "Инициализация рестарта")
        self.status_label.config(text="● Остановка старых процессов...", fg=ACCENT_RED)
        self.root.after(500, lambda: self._restart_step_1()) # pyre-ignore[6]

    def _restart_step_1(self):
        self._stop_logic()
        self.status_label.config(text="● Подготовка к запуску...", fg=MUTED_TEXT)
        self.root.after(1200, lambda: self._restart_step_2()) # pyre-ignore[6]

    def _restart_step_2(self):
        self.status_label.config(text="● Развертывание серверов...", fg=ACCENT_BLUE)
        self._start_logic()
        self.root.after(1000, lambda: self._restart_step_end()) # pyre-ignore[6]

    def _restart_step_end(self):
        self.status_label.config(text="● Серверы онлайн (5050, 8000)", fg=ACCENT_GREEN)
        self.set_loading(False)

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
