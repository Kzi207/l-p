"use client";

import { doc, onSnapshot, setDoc } from "firebase/firestore";
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

  useEffect(() => {
    if (!db || !user) {
      setProfile(null);
      setPartner(null);
      setCouple(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, "users", user.uid);
    return onSnapshot(userRef, async (snapshot) => {
      if (!snapshot.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName || user.email?.split("@")[0] || "Người thương",
          email: user.email || "",
          nickname: "",
          birthday: "",
          bio: "",
          photoURL: user.photoURL || "",
          coupleId: null,
        });
        return;
      }
      setProfile(snapshot.data() as UserDocument);
      setLoading(false);
      setError("");
    }, (caught) => {
      setLoading(false);
      setError(`Không thể đọc hồ sơ (${caught.code}).`);
    });
  }, [user]);

  useEffect(() => {
    if (!db || !user || !profile?.coupleId) {
      setCouple(null);
      setPartner(null);
      return;
    }
    const database = db;
    const coupleId = profile.coupleId;
    let unsubscribePartner: () => void = () => {};
    const unsubscribeCouple = onSnapshot(doc(database, "couples", coupleId), (snapshot) => {
      if (!snapshot.exists()) {
        setCouple(null);
        setError("Không tìm thấy không gian ghép đôi.");
        return;
      }
      const nextCouple = { id: snapshot.id, ...snapshot.data() } as CoupleInfo & { id: string };
      setCouple(nextCouple);
      const partnerId = nextCouple.memberIds.find((id) => id !== user.uid);
      unsubscribePartner();
      if (partnerId) {
        unsubscribePartner = onSnapshot(doc(database, "users", partnerId), (partnerSnapshot) => {
          setPartner(partnerSnapshot.exists() ? partnerSnapshot.data() as UserDocument : null);
        });
      }
    }, (caught) => setError(`Không thể đọc thông tin cặp đôi (${caught.code}).`));
    return () => {
      unsubscribeCouple();
      unsubscribePartner();
    };
  }, [profile?.coupleId, user]);

  const value = useMemo(() => ({ profile, partner, couple, loading, error }), [profile, partner, couple, loading, error]);
  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export function useCoupleSpace() {
  return useContext(CoupleContext);
}
