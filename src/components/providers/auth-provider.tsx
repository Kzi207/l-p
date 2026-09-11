"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppLoading } from "@/components/shared/app-states";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const continueIntoApp = useCallback(() => setLoading(false), []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    // Không để giao diện chờ vô hạn nếu Firebase bị chặn bởi mạng/trình duyệt.
    const firebaseAuth = auth;
    let unsubscribe = () => {};
    let settled = false;
    const finish = (nextUser: User | null = firebaseAuth.currentUser) => {
      settled = true;
      setUser(nextUser);
      setLoading(false);
    };
    // Khi Firebase đã khôi phục user từ IndexedDB trước lúc effect chạy, vào app
    // ngay thay vì tiếp tục đợi callback mạng.
    if (firebaseAuth.currentUser) finish(firebaseAuth.currentUser);
    // Một WebView/PWA vừa thức dậy đôi lúc không phát auth callback. Không khóa
    // toàn bộ giao diện vì sự cố đó; listener vẫn hoạt động và cập nhật về sau.
    const timeout = window.setTimeout(() => {
      if (!settled) finish(firebaseAuth.currentUser);
    }, 4_000);
    const resume = () => {
      if (!settled && (document.visibilityState === "visible" || firebaseAuth.currentUser)) finish(firebaseAuth.currentUser);
    };
    window.addEventListener("pageshow", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    try {
      unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (nextUser) => {
        window.clearTimeout(timeout);
        finish(nextUser);
      },
      () => {
        window.clearTimeout(timeout);
        finish();
      },
    );
    } catch {
      window.clearTimeout(timeout);
      finish();
    }
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{loading ? <AppLoading onContinue={continueIntoApp} /> : children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
