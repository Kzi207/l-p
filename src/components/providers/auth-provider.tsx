"use client";

import { onIdTokenChanged, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppLoading } from "@/components/shared/app-states";
import { clearDatabaseCache } from "@/lib/database";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}
const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const retry = useCallback(() => window.location.reload(), []);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const firebaseAuth = auth;
    let active = true;
    let previousUid: string | null | undefined;
    const finish = (nextUser: User | null) => {
      if (!active) return;
      if (!nextUser || (previousUid !== undefined && previousUid !== nextUser.uid)) clearDatabaseCache();
      previousUid = nextUser?.uid ?? null;
      setUser(nextUser);
      setLoading(false);
    };
    // Firebase owns persistent credentials and refreshes expired JWTs. Never
    // reconstruct a User or grant access from a locally decoded token.
    const unsubscribe = onIdTokenChanged(firebaseAuth, finish, () => finish(null));
    void firebaseAuth.authStateReady().then(() => finish(firebaseAuth.currentUser)).catch(() => finish(null));
    return () => { active = false; unsubscribe(); };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{loading ? <AppLoading onContinue={retry} /> : children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
