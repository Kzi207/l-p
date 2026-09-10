"use client";

import { useEffect, type ReactNode } from "react";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { collectCoupleData } from "@/lib/couple-backup";

export function AutoBackupProvider({ children }: { children: ReactNode }) {
  const { couple } = useCoupleSpace();
  useEffect(() => {
    if (!couple) return;
    const timeKey = `love-days-backup-time:${couple.id}`;
    const last = Number(localStorage.getItem(timeKey) || 0);
    if (Date.now() - last < 86400000) return;
    void collectCoupleData(couple.id).then((data) => {
      localStorage.setItem(`love-days-backup:${couple.id}`, JSON.stringify(data));
      localStorage.setItem(timeKey, String(Date.now()));
    }).catch(() => undefined);
  }, [couple]);
  return children;
}
