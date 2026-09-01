"use client";

import { AnimatePresence, motion } from "framer-motion";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { CalendarDays, Filter, Grid2X2, Heart, ImagePlus, List, Plus, RefreshCw, X } from "lucide-react";
import Masonry from "react-masonry-css";
import { useMemo, useState, useEffect } from "react";
import { LoginScreen } from "@/components/auth/login-screen";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { MemoryDetailModal } from "@/components/timeline/memory-detail-modal";
import { MemoryForm } from "@/components/timeline/memory-form";
import { db } from "@/lib/firebase";
import type { MemoryDocument } from "@/types/firestore";

type Memory = MemoryDocument & { id: string };
type ViewMode = "timeline" | "grid";

function formatDate(memory: Memory) {
  return memory.date.toDate().toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });
}

function TimelineCard({ memory, index, onOpen }: { memory: Memory; index: number; onOpen: () => void }) {
  return (
    <motion.article className="relative pl-12 sm:pl-16" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: Math.min(index * 0.04, 0.2) }}>
      <span className="absolute left-[1.05rem] top-8 z-10 grid size-8 place-items-center rounded-full border-4 border-[#fff8f0] bg-blush text-white shadow-sm sm:left-[1.55rem]"><Heart className="size-3.5 fill-white" /></span>
      <button className="soft-card group w-full overflow-hidden text-left transition hover:-translate-y-1" type="button" onClick={onOpen}>
        <div className="aspect-[16/10] overflow-hidden bg-[#eadbd0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={memory.imageUrl} alt={memory.title} className="size-full object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#a16f78]"><CalendarDays className="size-4" />{formatDate(memory)}</p>
          <h2 className="mt-2 font-display text-2xl font-bold leading-tight">{memory.title}</h2>
          {memory.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#756158]">{memory.description}</p>}
          {memory.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{memory.tags.map((tag) => <span className="rounded-full bg-blush/20 px-2.5 py-1 text-[11px] font-semibold text-[#8b5963]" key={tag}>#{tag}</span>)}</div>}
        </div>
      </button>
    </motion.article>
  );
}

function GridCard({ memory, onOpen }: { memory: Memory; onOpen: () => void }) {
  return (
    <motion.button className="group block w-full overflow-hidden rounded-[1.5rem] bg-white/55 text-left shadow-soft" type="button" onClick={onOpen} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={memory.imageUrl} alt={memory.title} className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      <span className="block p-4">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#a16f78]">{formatDate(memory)}</span>
        <span className="mt-1 block font-display text-lg font-bold leading-tight">{memory.title}</span>
      </span>
    </motion.button>
  );
}

export function TimelineScreen() {
  const { user } = useAuth();
  const { couple, profile, loading: coupleLoading } = useCoupleSpace();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [view, setView] = useState<ViewMode>("timeline");
  const [activeTag, setActiveTag] = useState("all");
  const [activeMonth, setActiveMonth] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!db || !user || !couple) return;
    const memoriesQuery = query(collection(db, "couples", couple.id, "memories"), orderBy("date", "desc"));
    return onSnapshot(memoriesQuery, (snapshot) => {
      setMemories(snapshot.docs.map((memory) => ({ id: memory.id, ...memory.data() }) as Memory));
      setLoading(false);
      setError("");
    }, (caught) => {
      setLoading(false);
      setError(caught.code === "permission-denied" ? "Firestore Rules chưa cho phép collection memories. Hãy deploy rules mới." : `Không thể tải Timeline (${caught.code}).`);
    });
  }, [couple, user]);

  const allTags = useMemo(() => Array.from(new Set(memories.flatMap((memory) => memory.tags))).sort((a, b) => a.localeCompare(b, "vi")), [memories]);
  const allMonths = useMemo(() => Array.from(new Set(memories.map((memory) => {
    const date = memory.date.toDate();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }))).sort().reverse(), [memories]);
  const filtered = useMemo(() => memories.filter((memory) => {
    const date = memory.date.toDate();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return (activeTag === "all" || memory.tags.includes(activeTag)) && (activeMonth === "all" || monthKey === activeMonth);
  }), [activeMonth, activeTag, memories]);

  if (!user) return <LoginScreen />;
  if (coupleLoading) return <main className="grid min-h-dvh place-items-center"><Heart className="size-9 animate-pulse fill-blush text-blush" /></main>;
  if (!couple) return <PairingScreen user={user} />;

  return (
    <main className="min-h-dvh px-4 pb-32 pt-6 sm:px-6 sm:pt-9">
      <div className="app-frame">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-handwritten text-xl text-[#a56f78] sm:text-2xl">Những điều mình đã đi qua</p>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Timeline kỷ niệm</h1>
            <p className="mt-1 text-sm text-[#8b756a]">{memories.length} mảnh ghép của chúng mình</p>
          </div>
          <button className="primary-button shrink-0 px-4" type="button" onClick={() => setFormOpen(true)}><Plus className="size-5" /><span className="hidden sm:inline">Thêm kỷ niệm</span></button>
        </header>

        <section className="soft-card mt-6 p-3 sm:p-4" aria-label="Công cụ Timeline">
          <div className="flex items-center justify-between gap-3">
            <div className="flex rounded-2xl bg-[#f3e6dc] p-1 shadow-insetSoft">
              <button className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${view === "timeline" ? "bg-white text-cocoa shadow-sm" : "text-[#917b71]"}`} type="button" onClick={() => setView("timeline")}><List className="size-4" />Timeline</button>
              <button className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${view === "grid" ? "bg-white text-cocoa shadow-sm" : "text-[#917b71]"}`} type="button" onClick={() => setView("grid")}><Grid2X2 className="size-4" />Lưới ảnh</button>
            </div>
            <button className={`secondary-button px-3 ${filtersOpen || activeTag !== "all" || activeMonth !== "all" ? "bg-blush/35" : ""}`} type="button" onClick={() => setFiltersOpen((current) => !current)}><Filter className="size-4" />Lọc</button>
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div className="mt-4 border-t border-[#e8d9cf] pt-4" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="flex items-end gap-3">
                  <label className="min-w-0 flex-1 text-xs font-bold">Tháng
                    <select className="soft-input mt-2 py-2.5 text-sm" value={activeMonth} onChange={(event) => setActiveMonth(event.target.value)}>
                      <option value="all">Tất cả thời gian</option>
                      {allMonths.map((month) => <option key={month} value={month}>Tháng {month.slice(5)}/{month.slice(0, 4)}</option>)}
                    </select>
                  </label>
                  {(activeTag !== "all" || activeMonth !== "all") && <button className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/65 shadow-soft" type="button" onClick={() => { setActiveTag("all"); setActiveMonth("all"); }} aria-label="Xóa bộ lọc"><X className="size-4" /></button>}
                </div>
                {allTags.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pb-2"><button className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${activeTag === "all" ? "bg-blush" : "bg-white/65"}`} type="button" onClick={() => setActiveTag("all")}>Tất cả tag</button>{allTags.map((tag) => <button className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${activeTag === tag ? "bg-blush" : "bg-white/65"}`} type="button" key={tag} onClick={() => setActiveTag(tag)}>#{tag}</button>)}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {loading ? (
          <div className="py-24 text-center"><Heart className="mx-auto size-10 animate-pulse fill-blush text-blush" /><p className="mt-3 font-handwritten text-xl text-[#a56f78]">Đang lật từng trang kỷ niệm...</p></div>
        ) : error ? (
          <div className="soft-card mt-8 p-8 text-center"><p className="text-sm text-red-700">{error}</p><button className="secondary-button mt-4" type="button" onClick={() => window.location.reload()}><RefreshCw className="size-4" />Thử lại</button></div>
        ) : filtered.length === 0 ? (
          <div className="soft-card mt-8 flex min-h-80 flex-col items-center justify-center px-7 text-center"><ImagePlus className="size-12 text-[#d48a96]" /><h2 className="mt-4 font-display text-2xl font-bold">{memories.length === 0 ? "Kỷ niệm đầu tiên đang chờ" : "Không có kỷ niệm phù hợp"}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#806e65]">{memories.length === 0 ? "Thêm một bức ảnh và câu chuyện để bắt đầu Timeline của hai bạn." : "Hãy thử đổi tag hoặc khoảng thời gian đang lọc."}</p>{memories.length === 0 && <button className="primary-button mt-5" type="button" onClick={() => setFormOpen(true)}><Plus className="size-5" />Thêm kỷ niệm</button>}</div>
        ) : view === "timeline" ? (
          <div className="relative mt-8 space-y-7 before:absolute before:bottom-0 before:left-8 before:top-0 before:w-0.5 before:bg-gradient-to-b before:from-blush before:via-[#edc6b9] before:to-transparent sm:before:left-10">
            {filtered.map((memory, index) => <TimelineCard key={memory.id} memory={memory} index={index} onOpen={() => setSelected(memory)} />)}
          </div>
        ) : (
          <Masonry breakpointCols={{ default: 3, 820: 2, 520: 1 }} className="memory-masonry-grid mt-8" columnClassName="memory-masonry-column">
            {filtered.map((memory) => <GridCard key={memory.id} memory={memory} onOpen={() => setSelected(memory)} />)}
          </Masonry>
        )}
      </div>

      <BottomNav />
      <MemoryForm coupleId={couple.id} open={formOpen} user={user} profile={profile} onClose={() => setFormOpen(false)} />
      <MemoryDetailModal memory={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
