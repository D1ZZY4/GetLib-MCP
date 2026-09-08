"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthPage } from "@/web/features/auth/components/auth-page";
import { GateLoader } from "@/web/components/feedback/gate-loader";
import { useSession } from "@/web/providers/auth-provider";

export function SignInGate() {
  const { session, signIn } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && session !== null) {
      router.replace("/");
    }
  }, [mounted, session, router]);

  if (!mounted) {
    // Must match the server render (no session server-side).
    return <AuthPage onAuthenticated={signIn} />;
  }

  if (session !== null) {
    return <GateLoader label="Opening dashboard" />;
  }

  return <AuthPage onAuthenticated={signIn} />;
}
