"use client";

import { useDashboard } from "@/hooks/useDashboard";
import { LoveCounterHero } from "@/components/dashboard/LoveCounterHero";
import { StatCard } from "@/components/dashboard/StatCard";
import { LatestMemories } from "@/components/dashboard/LatestMemories";
import { PinnedNoteCard } from "@/components/dashboard/PinnedNoteCard";
import { RecentJournals } from "@/components/dashboard/RecentJournals";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Image as ImageIcon, BookOpen, Calendar, StickyNote } from "lucide-react";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard();

  if (loading && (!data || data.loveDays === 0)) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        <div className="h-[260px] bg-secondary/35 rounded-[24px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Lỗi tải dữ liệu"
        description={error}
        onRetry={refresh}
      />
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 20 } }
  };

  // Safe mappings
  const loveDays = data?.loveDays ?? 0;
  const totalMemories = data?.totalMemories ?? 0;
  const totalJournals = data?.totalJournals ?? 0;
  const upcomingEvents = data?.upcomingEvents ?? 0;
  const latestMemories = data?.latestMemories ?? [];
  const recentJournals = data?.recentJournals ?? [];
  const pinnedNote = data?.pinnedNote ?? null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 select-none"
    >
      {/* Love counter hero section */}
      <motion.div variants={itemVariants}>
        <LoveCounterHero loveDays={loveDays} />
      </motion.div>

      {/* Main stats cards list */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ImageIcon}
          label="Khoảnh khắc"
          value={totalMemories}
          description="Bức hình lưu giữ kỉ niệm"
        />
        <StatCard
          icon={BookOpen}
          label="Nhật ký chung"
          value={totalJournals}
          description="Trang nhật ký viết chung"
        />
        <StatCard
          icon={Calendar}
          label="Sự kiện"
          value={upcomingEvents}
          description="Kế hoạch sắp tới"
        />
        <StatCard
          icon={StickyNote}
          label="Ghi chú ghim"
          value={pinnedNote ? 1 : 0}
          description="Ghi chú quan trọng được ghim"
        />
      </motion.div>

      {/* Main grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column - Memories & Journals */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <LatestMemories memories={latestMemories} />
          <RecentJournals journals={recentJournals} />
        </motion.div>

        {/* Right Column - Pinned Notes & Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-6">
          <PinnedNoteCard note={pinnedNote} />
          <QuickActions />
        </motion.div>
      </div>
    </motion.div>
  );
}
