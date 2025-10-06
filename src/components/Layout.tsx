import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Globe, 
  FileText, 
  Sparkles, 
  ScrollText, 
  Settings, 
  Bell,
  Play,
  Pause,
  RefreshCw,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Сайты", path: "/sites", icon: Globe },
  { name: "CV", path: "/cv", icon: FileText },
  { name: "AI", path: "/ai", icon: Sparkles },
  { name: "Логи", path: "/logs", icon: ScrollText },
  { name: "Настройки", path: "/settings", icon: Settings },
];

export default function Layout() {
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 md:w-16"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            {sidebarOpen && (
              <div className="flex items-center gap-2 animate-fade-in">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
                <span className="text-lg font-semibold text-foreground">CV Agent</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    "hover:bg-secondary hover:text-secondary-foreground",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant={isAgentRunning ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsAgentRunning(!isAgentRunning)}
                className="gap-2"
              >
                {isAgentRunning ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Остановить агента
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Запустить агента
                  </>
                )}
              </Button>
              
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Обновить
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
              <span className="hidden text-sm font-medium md:block">Администратор</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
