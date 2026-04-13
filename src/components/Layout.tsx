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
import { EmailQueueNotification } from "./ai/EmailQueueNotification";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Сайты", path: "/sites", icon: Globe },
  { name: "CV", path: "/cv", icon: FileText },
  { name: "Письма", path: "/ai", icon: Mail },
  { name: "Настройки", path: "/settings", icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
          sidebarOpen 
            ? "w-64" 
            : cn(
                "-translate-x-full md:translate-x-0",
                isHovered ? "w-64 shadow-2xl" : "md:w-16"
              )
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-4 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 flex-shrink-0">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-full w-full drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
                >
                  <path
                    d="M22 2H8C6.89543 2 6 2.89543 6 4V28C6 29.1046 6.89543 30 8 30H24C25.1046 30 26 29.1046 26 28V10L18 2H22Z"
                    fill="url(#logo-gradient)"
                    fillOpacity="0.15"
                  />
                  <path
                    d="M26 10H18V2"
                    stroke="url(#logo-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M26 28V10L18 2H8C6.89543 2 6 2.89543 6 4V28C6 29.1046 6.89543 30 8 30H24C25.1046 30 26 29.1046 26 28Z"
                    stroke="url(#logo-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 13L13 19H17L13 25L19 19H15L19 13Z"
                    fill="url(#logo-gradient)"
                    stroke="url(#logo-gradient)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse"
                  />
                  <defs>
                    <linearGradient
                      id="logo-gradient"
                      x1="6"
                      y1="2"
                      x2="26"
                      y2="30"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#3b82f6" />
                      <stop offset="1" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className={cn(
                "text-lg font-bold text-foreground transition-all duration-300 whitespace-nowrap",
                (!isHovered && !sidebarOpen) ? "opacity-0 invisible w-0" : "opacity-100 visible w-auto"
              )}>
                CV Agent
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-xl p-2.5 text-sm font-medium transition-all group relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )
                }
              >
                <div className="flex items-center justify-center w-5 h-5 flex-shrink-0 mr-3">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  "transition-all duration-300 whitespace-nowrap overflow-hidden",
                  (!isHovered && !sidebarOpen) ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto"
                )}>
                  {item.name}
                </span>

                {/* Tooltip for collapsed state */}
                {!isHovered && !sidebarOpen && (
                  <div className="absolute left-14 rounded-md px-2 py-1 bg-popover text-popover-foreground text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border shadow-md pointer-events-none z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section (optional) */}
          <div className="p-3 border-t border-border mt-auto">
             <div className={cn(
               "flex items-center gap-2 text-xs text-muted-foreground transition-all duration-300",
               (!isHovered && !sidebarOpen) ? "opacity-0 w-0" : "opacity-100 w-auto"
             )}>
                <span className="whitespace-nowrap font-medium">v3.0 Premium</span>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          "md:ml-16" // content stays put while sidebar expands over it
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-3 md:px-6 shadow-sm">
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
              className="h-9 w-9 md:h-10 md:w-10 rounded-xl"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Moon className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
            <EmailQueueNotification />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 bg-background">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
