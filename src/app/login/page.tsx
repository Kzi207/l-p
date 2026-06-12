import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginScreen } from "@/components/love-space/login-screen";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <LoginScreen />;
}
