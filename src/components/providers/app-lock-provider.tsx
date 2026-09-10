"use client";

import { Fingerprint, Heart, KeyRound, LoaderCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { base64UrlToBytes, getLockConfig, hashPin } from "@/lib/app-lock";

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const [locked, setLocked] = useState(false); const [pin, setPin] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const refresh = useCallback(() => setLocked(Boolean(user && getLockConfig().enabled)), [user]);
  useEffect(() => { refresh(); window.addEventListener("love-days-lock-change", refresh); return () => window.removeEventListener("love-days-lock-change", refresh); }, [refresh]);
  useEffect(() => { if (!user) setLocked(false); }, [user]);
  async function unlockPin(event: FormEvent) { event.preventDefault(); const config = getLockConfig(); if (!config.pinHash) return; setBusy(true); const valid = await hashPin(pin) === config.pinHash; setBusy(false); if (valid) { setLocked(false); setPin(""); setError(""); } else setError("Mã PIN chưa đúng."); }
  async function unlockBiometric() { const config = getLockConfig(); if (!config.credentialId || !navigator.credentials) return; setBusy(true); setError(""); try { const result = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ id: base64UrlToBytes(config.credentialId), type: "public-key" }], userVerification: "required", timeout: 60000 } }); if (result) setLocked(false); } catch { setError("Không thể xác nhận Face ID/vân tay. Bạn có thể dùng PIN."); } finally { setBusy(false); } }
  if (!locked) return children;
  const config = getLockConfig();
  return <main className="fixed inset-0 z-[100] grid place-items-center bg-[#fff8f0] p-5"><section className="soft-card w-full max-w-sm p-6 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-blush/40"><Heart className="size-8 fill-[#d96578] text-[#d96578]" /></span><h1 className="mt-4 font-display text-2xl font-extrabold">Không gian riêng đã khóa</h1><p className="mt-1 text-sm text-[#806e65]">Xác nhận để mở kỷ niệm của hai bạn.</p>{config.credentialId && <button className="primary-button mt-5 w-full" disabled={busy} onClick={unlockBiometric}><Fingerprint className="size-5" />Face ID / vân tay</button>}{config.pinHash && <form className="mt-3" onSubmit={unlockPin}><input className="soft-input text-center text-xl tracking-[.4em]" inputMode="numeric" type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Mã PIN" /><button className="secondary-button mt-3 w-full" disabled={busy || pin.length < 4}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}Mở khóa</button></form>}{error && <p className="mt-3 text-sm text-red-700">{error}</p>}</section></main>;
}
