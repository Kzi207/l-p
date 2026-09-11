"use client";

import { Download, FileText, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { LoginScreen } from "@/components/auth/login-screen";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { collectCoupleData } from "@/lib/couple-backup";

function escapeHtml(value: string) { return value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character] || character); }

export function DataScreen() {
  const { user } = useAuth(); const { couple, loading } = useCoupleSpace(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  if (!user) return <LoginScreen />;
  if (loading) return <main className="grid min-h-dvh place-items-center"><LoaderCircle className="size-8 animate-spin text-[#d17485]" /></main>;
  if (!couple) return <PairingScreen user={user} />;
  async function load() { setBusy(true); setError(""); try { return await collectCoupleData(couple!.id); } catch (caught) { setError(caught instanceof Error ? caught.message : "Chưa thể đọc dữ liệu."); throw caught; } finally { setBusy(false); } }
  async function downloadJson() { try { const data = await load(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `love-days-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); setMessage("Đã tạo bản xuất dữ liệu."); } catch {} }
  async function printPdf() { try { const data = await load(); const printable = window.open("", "_blank"); if (!printable) throw new Error("Trình duyệt đang chặn cửa sổ in."); const sections = Object.entries(data.data).map(([name, values]) => `<h2>${name} (${values.length})</h2><pre>${escapeHtml(JSON.stringify(values, null, 2))}</pre>`).join(""); printable.document.write(`<title>Love Days</title><style>body{font:14px sans-serif;padding:24px}pre{white-space:pre-wrap;background:#faf5f2;padding:12px}h2{page-break-after:avoid}</style><h1>Love Days — ${new Date().toLocaleDateString("vi-VN")}</h1>${sections}`); printable.document.close(); printable.print(); setMessage("Chọn “Lưu thành PDF” trong cửa sổ in."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Chưa thể tạo PDF."); } }
  return <main className="min-h-dvh px-4 pb-32 pt-7"><section className="app-frame"><header><p className="font-handwritten text-xl text-[#a56f78]">Dữ liệu thuộc về hai bạn</p><h1 className="font-display text-3xl font-extrabold">Xuất dữ liệu</h1><p className="mt-2 text-sm text-[#806e65]">Tải một bản sao nội dung đang lưu trong Love Days bất cứ lúc nào.</p></header><section className="soft-card mt-6 p-5"><h2 className="font-display text-xl font-bold">Mang kỷ niệm theo bạn</h2><p className="mt-1 text-sm text-[#806e65]">Bản xuất gồm nội dung, ngày tháng và đường dẫn ảnh/video. File media gốc vẫn nằm trên Cloudinary.</p><button className="primary-button mt-5 w-full" disabled={busy} onClick={downloadJson}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}Tải bản sao JSON</button><button className="secondary-button mt-3 w-full" disabled={busy} onClick={printPdf}><FileText className="size-4" />In hoặc lưu PDF</button></section>{message && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}{error && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</section><BottomNav /></main>;
}
