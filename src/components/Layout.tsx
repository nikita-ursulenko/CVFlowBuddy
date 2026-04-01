import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Globe, 
  FileText, 
  Sparkles, 
  Settings, 
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Сайты", path: "/sites", icon: Globe },
  { name: "CV", path: "/cv", icon: FileText },
  { name: "Письма", path: "/ai", icon: Mail },
  { name: "Настройки", path: "/settings", icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "-translate-x-full md:translate-x-0 md:w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
              <span className="text-lg font-semibold text-foreground">CV Agent</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
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
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          "md:ml-64"
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-3 md:px-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Moon className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-10 md:w-10">
              <Bell className="h-4 w-4 md:h-5 md:w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive md:right-1.5 md:top-1.5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
