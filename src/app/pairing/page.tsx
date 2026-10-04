"use client";
import Link from "next/link";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { LoginScreen } from "@/components/auth/login-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
export default function PairingPage() {
  const { user } = useAuth();
  const { couple } = useCoupleSpace();
  if (!user) return <LoginScreen />;
  if (couple && couple.memberIds.length > 1) return <main className="p-6 text-center"><p>Bạn đã ghép đôi.</p><Link className="primary-button mt-4" href="/profile">Về Cá nhân</Link></main>;
  return <><Link className="secondary-button m-4" href="/profile">Về Cá nhân</Link><PairingScreen user={user} openPersonalInitially initialTab="invite" /></>;
}
