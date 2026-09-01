"use client";

import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { CalendarHeart, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { db } from "@/lib/firebase";

export function CoupleSetup() {
  const { couple, profile, partner } = useCoupleSpace();
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !couple) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "couples", couple.id), {
        startDate: Timestamp.fromDate(new Date(`${startDate}T00:00:00`)),
      });
    } catch {
      setError("Chưa thể lưu ngày bắt đầu. Hãy thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <section className="soft-card w-full max-w-lg p-6 sm:p-9">
        <CalendarHeart className="mx-auto size-12 text-[#dc8796]" />
        <p className="mt-3 text-center font-handwritten text-2xl text-[#a56f78]">{profile?.nickname || profile?.displayName} &amp; {partner?.nickname || partner?.displayName}</p>
        <h1 className="text-center font-display text-3xl font-bold">Ngày câu chuyện bắt đầu</h1>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold">Ngày bắt đầu yêu<input className="soft-input mt-2" type="date" max={new Date().toISOString().slice(0, 10)} required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="primary-button w-full" disabled={saving} type="submit">{saving && <LoaderCircle className="size-5 animate-spin" />}{saving ? "Đang lưu..." : "Bắt đầu đếm ngày yêu"}</button>
        </form>
      </section>
    </main>
  );
}
