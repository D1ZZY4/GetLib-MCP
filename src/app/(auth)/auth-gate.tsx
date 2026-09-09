"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { AuthForm, type AuthMode } from "@/web/features/auth/components/auth-form";
import { AuthLayout } from "@/web/features/auth/components/auth-layout";
import { GateLoader } from "@/web/components/feedback/gate-loader";
import { useSession } from "@/web/providers/auth-provider";

export function AuthGate({ mode }: { mode: AuthMode }) {
  const { session, authEnabled, signIn, signInWithCredentials } = useSession();
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

  if (!mounted || authEnabled === null) {
    // Must match the server render (no session server-side). Also waits
    // for the auth-mode probe so a loading flash never shows a form that
    // does not apply to the resolved mode.
    return <GateLoader label="Loading" />;
  }

  if (session !== null) {
    return <GateLoader label="Opening dashboard" />;
  }

  // Authentication is disabled: no login wall. One explicit action enters
  // the dashboard with the anonymous context (rules #66).
  if (authEnabled === false) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md">
          <Card.Header>
            <Card.Title>Authentication is disabled</Card.Title>
            <Card.Description>
              This server does not require sign-in. Continue to the dashboard as a guest.
            </Card.Description>
          </Card.Header>
          <Card.Footer>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Continue to dashboard
            </Link>
          </Card.Footer>
        </Card>
      </AuthLayout>
    );
  }

  // Server authentication is on: accounts are verified server-side, so
  // self-service sign-up is unavailable and social buttons are hidden.
  if (authEnabled === true && mode === "sign-up") {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md">
          <Card.Header>
            <Card.Title>Sign-up is unavailable</Card.Title>
            <Card.Description>
              This server verifies accounts, so new accounts can&apos;t be created here. Sign
              in with the configured account instead.
            </Card.Description>
          </Card.Header>
          <Card.Footer>
            <Link
              href="/signin"
              className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Go to sign in
            </Link>
          </Card.Footer>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthForm
        mode={mode}
        onAuthenticated={signIn}
        verifyCredentials={authEnabled === true ? signInWithCredentials : undefined}
      />
    </AuthLayout>
  );
}
