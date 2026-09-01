"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    // Không để giao diện chờ vô hạn nếu Firebase bị chặn bởi mạng/trình duyệt.
    const timeout = window.setTimeout(() => setLoading(false), 10_000);
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        window.clearTimeout(timeout);
        setUser(nextUser);
        setLoading(false);
      },
      () => {
        window.clearTimeout(timeout);
        setLoading(false);
      },
    );
    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{loading ? <AppLoading /> : children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
