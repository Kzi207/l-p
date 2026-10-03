"use client";

import { doc, ensureWorkspace, onSnapshot } from "@/lib/database";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { db } from "@/lib/firebase";
import type { CoupleInfo, UserDocument } from "@/types/firestore";

interface CoupleContextValue {
  profile: UserDocument | null;
  partner: UserDocument | null;
  couple: (CoupleInfo & { id: string }) | null;
  loading: boolean;
  error: string;
}

const CoupleContext = createContext<CoupleContextValue>({ profile: null, partner: null, couple: null, loading: true, error: "" });

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserDocument | null>(null);
  const [partner, setPartner] = useState<UserDocument | null>(null);
  const [couple, setCouple] = useState<(CoupleInfo & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const profileCoupleId = profile?.coupleId;

  useEffect(() => {
    if (!db || !user) {
      setProfile(null);
      setPartner(null);
      setCouple(null);
      setLoading(false);
      return;
    }

    setProfile(null);
    setPartner(null);
    setCouple(null);
    setLoading(true);
    setError("");
    const loadingTimeout = window.setTimeout(() => {
      setLoading(false);
      setError("Không thể tải không gian riêng lúc này. Hãy kiểm tra mạng rồi thử lại.");
    }, 8_000);
    const userRef = doc(db, "users", user.uid);
    let active = true;
    let initializing = false;
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (!active) return;
      const nextProfile = snapshot.exists() ? snapshot.data() as UserDocument : {
        displayName: user.displayName || user.email?.split("@")[0] || "B?n",
        email: user.email || "", photoURL: user.photoURL || "", coupleId: null,
      };
      if (!nextProfile.coupleId) {
        if (initializing) return;
        initializing = true;
        setLoading(true);
        try {
          const space = await ensureWorkspace({ displayName: nextProfile.displayName, email: nextProfile.email, photoURL: nextProfile.photoURL || "" });
          if (!active) return;
          setProfile({ ...nextProfile, coupleId: space.coupleId });
          setError("");
        } catch (caught) {
          if (!active) return;
          setLoading(false);
          setError(caught instanceof Error ? caught.message : "Ch?a th? m? kh?ng gian c? nh?n.");
        } finally { initializing = false; window.clearTimeout(loadingTimeout); }
        return;
      }
      window.clearTimeout(loadingTimeout);
      setProfile(nextProfile);
      setError("");
    }, (caught) => {
      window.clearTimeout(loadingTimeout);
      setLoading(false);
      setError(caught.message || `Không thể đọc hồ sơ (${caught.code}).`);
    });
    return () => {
      window.clearTimeout(loadingTimeout);
      active = false;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!db || !user || profileCoupleId === undefined) return;
    if (!profileCoupleId) {
      setCouple(null);
      setPartner(null);
      setLoading(false);
      return;
    }
    const database = db;
    const coupleId = profileCoupleId;
    setPartner(null);
    setLoading(true);
    const loadingTimeout = window.setTimeout(() => {
      setLoading(false);
      setError("Không thể tải thông tin ghép đôi lúc này. Hãy thử lại sau.");
    }, 8_000);
    let unsubscribePartner: () => void = () => {};
    const unsubscribeCouple = onSnapshot(doc(database, "couples", coupleId), (snapshot) => {
      window.clearTimeout(loadingTimeout);
      if (!snapshot.exists()) {
        setCouple(null);
        setLoading(false);
        setError("Không tìm thấy không gian ghép đôi.");
        return;
      }
      const nextCouple = { id: snapshot.id, ...snapshot.data() } as CoupleInfo & { id: string };
      setCouple(nextCouple);
      setLoading(false);
      setError("");
      const partnerId = nextCouple.memberIds.find((id) => id !== user.uid);
      unsubscribePartner();
      if (!partnerId) setPartner(null);
      if (partnerId) {
        unsubscribePartner = onSnapshot(doc(database, "users", partnerId), (partnerSnapshot) => {
          setPartner(partnerSnapshot.exists() ? partnerSnapshot.data() as UserDocument : null);
        });
      }
    }, (caught) => {
      window.clearTimeout(loadingTimeout);
      setLoading(false);
      setError(caught.message || `Không thể đọc thông tin cặp đôi (${caught.code}).`);
    });
    return () => {
      window.clearTimeout(loadingTimeout);
      unsubscribeCouple();
      unsubscribePartner();
    };
  }, [profileCoupleId, user]);

  const value = useMemo(() => ({ profile, partner, couple, loading, error }), [profile, partner, couple, loading, error]);
  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export function useCoupleSpace() {
  return useContext(CoupleContext);
}
