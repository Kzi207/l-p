"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCouple } from "@/hooks/useCouple";
import { CoupleGate } from "@/components/love-space/couple-gate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { couple, loading } = useCouple();

  // Do not wrap with layout on login screen
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAFA] select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Đang tải không gian...</p>
        </div>
      </div>
    );
  }

  if (!couple) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA] p-4 md:p-8 select-none">
        <CoupleGate />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-[#18181B] overflow-hidden selection:bg-primary/10">
      {/* Fixed Sidebar for Desktop */}
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar for Desktop and Mobile */}
        <Topbar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-6 md:p-8 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="h-full flex flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav />
      </div>
    </div>
  );
}
