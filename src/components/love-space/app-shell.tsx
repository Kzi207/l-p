"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";

import { navigation } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,147,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(17,24,39,0.08),transparent_22%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex h-[78px] items-center justify-between rounded-[32px] border border-white/60 bg-white/60 px-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
              LoveSpace
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
              Private couple workspace
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-black/8 bg-white/70 px-4 py-2 text-sm text-zinc-600 md:block">
              {data?.user?.name ?? "Authenticated user"}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 lg:flex-row">
          <aside className="w-full shrink-0 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,19,19,0.98),rgba(19,19,19,0.94))] p-4 text-white shadow-[var(--shadow-panel)] lg:w-[280px]">
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Workspace</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                Calm, modern, useful every day
              </p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Count love days, keep memories, write together, and stay on the same page.
              </p>
            </div>

            <nav className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {navigation.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group rounded-[24px] border px-4 py-3 transition duration-200 hover:-translate-y-0.5",
                      active
                        ? "border-white/10 bg-[linear-gradient(135deg,rgba(255,107,147,0.22),rgba(255,255,255,0.08))] text-white shadow-lg shadow-black/20"
                        : "border-transparent text-white/55 hover:border-white/8 hover:bg-white/6 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                          active
                            ? "bg-white text-[var(--color-primary)]"
                            : "bg-white/8 text-white/60 group-hover:bg-white/12 group-hover:text-white",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 rounded-[34px] border border-white/50 bg-white/35 p-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
