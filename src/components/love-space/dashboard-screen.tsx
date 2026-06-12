"use client";

import { motion } from "framer-motion";

import { useCouple } from "@/hooks/useCouple";
import { useDashboard } from "@/hooks/useDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoupleGate } from "@/components/love-space/couple-gate";
import { SectionHeader } from "@/components/love-space/section-header";

export function DashboardScreen() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data, loading } = useDashboard();

  if (!coupleLoading && !couple) {
    return <CoupleGate />;
  }

  const stats = [
    { label: "Love days", value: data.loveDays },
    { label: "Memories", value: data.totalMemories },
    { label: "Journals", value: data.totalJournals },
    { label: "Upcoming events", value: data.upcomingEvents },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Dashboard"
        title="A calmer daily view for both of you"
        description="Real data from PostgreSQL now drives the summary, recent memories, journals, notes, and event counts."
        action={<Button variant="secondary">Live data {loading ? "..." : "ready"}</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden bg-[linear-gradient(145deg,#141414,#20232b_52%,#2a2230_100%)] text-white xl:col-span-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <Badge tone="rose">Dashboard summary</Badge>
              <h3 className="mt-5 text-4xl font-semibold tracking-[-0.08em]">
                {data.loveDays} days together
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
                This count updates from your couple start date, and every card below now reads from the real API routes in this project.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {stats.map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[24px] border border-white/10 bg-white/6 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Pinned note</p>
              <div className="mt-4 rounded-[24px] bg-white/8 p-5">
                <p className="text-lg leading-8">
                  {data.pinnedNote?.content ?? "No pinned note yet. Pin one from the Notes page."}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
            Couple profile
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
            Pair code: {couple?.code ?? "—"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Share this code with your partner to complete the workspace.
          </p>
          <div className="mt-6 space-y-3">
            {couple?.users.map((member) => (
              <div key={member.id} className="rounded-[22px] border border-black/6 bg-white/70 p-4">
                <p className="font-semibold">{member.name}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{member.email}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Latest memories
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
                Recent uploads from your real gallery
              </h3>
            </div>
          </div>
          <div className="mt-6 grid auto-rows-[160px] gap-4 md:grid-cols-3">
            {data.latestMemories.length > 0 ? (
              data.latestMemories.map((memory) => (
                <div
                  key={memory.id}
                  className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#20232b,#ff9db6)] p-4 text-white"
                >
                  <div className="absolute inset-0 bg-black/15" />
                  <div className="relative flex h-full flex-col justify-between">
                    <p className="text-sm font-semibold">{memory.caption}</p>
                    <div className="text-xs text-white/75">
                      {memory.author.name} · {new Date(memory.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-[24px] border border-dashed border-black/10 p-6 text-sm text-[var(--color-muted)]">
                No memories yet. Upload the first one on the Memories page.
              </div>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
            Recent journals
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">Latest shared writing</h3>
          <div className="mt-6 space-y-3">
            {data.recentJournals.length > 0 ? (
              data.recentJournals.map((journal) => (
                <div key={journal.id} className="rounded-[24px] border border-black/6 bg-white/75 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">{journal.title}</p>
                    <Badge tone="zinc">{journal.author.name}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-muted)]">
                    {journal.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No journals yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
