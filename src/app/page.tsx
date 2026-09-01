"use client";

import { LoginScreen } from "@/components/auth/login-screen";
import { HomeScreen } from "@/components/home/home-screen";
import { ConfigurationMissing } from "@/components/shared/app-states";
import { useAuth } from "@/components/providers/auth-provider";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (!isFirebaseConfigured) return <ConfigurationMissing />;
  if (loading) return null;
  if (!user) return <LoginScreen />;
  return <HomeScreen user={user} />;
}
