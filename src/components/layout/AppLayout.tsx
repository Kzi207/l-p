"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Image as ImageIcon, BookOpen, Calendar, StickyNote, Settings, LogOut } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Memories", href: "/memories", icon: ImageIcon },
  { name: "Journal", href: "/journal", icon: BookOpen },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If we are on the login page, don't show layout
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-[280px] border-r border-border bg-card">
        <div className="p-6 h-[72px] flex items-center border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="size-8 rounded-[10px] bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              L
            </div>
            <span className="font-semibold text-lg tracking-tight">LoveSpace</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm font-medium z-10",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}>
                  <Icon className={cn("size-[18px]", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/50">
          <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="size-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="h-[72px] flex-shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 z-20 sticky top-0">
          <div className="font-semibold tracking-tight text-xl capitalize flex items-center gap-2">
             {pathname.split('/')[1] || 'Dashboard'}
          </div>
          <div className="flex items-center gap-4">
             {/* Couple Avatar Display */}
             <div className="flex items-center bg-card border border-border/60 rounded-full py-1 px-1.5 shadow-sm">
                <div className="flex -space-x-2 mr-2">
                  <img className="size-7 rounded-full border-2 border-card z-10" src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Alex" />
                  <img className="size-7 rounded-full border-2 border-card z-0" src="https://i.pravatar.cc/150?u=a04258a2462d826712d" alt="Sam" />
                </div>
                <span className="text-xs font-medium pr-2 text-muted-foreground">Alex & Sam</span>
             </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-[1600px] mx-auto p-4 md:p-8 w-full h-full">
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                key={pathname}
             >
               {children}
             </motion.div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden flex-shrink-0 border-t border-border bg-card/90 backdrop-blur-lg px-2 py-2 flex justify-around items-center safe-area-pb z-20">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                   <motion.div 
                     layoutId="mobile-nav-indicator"
                     className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                   />
                )}
                <Icon className="size-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
