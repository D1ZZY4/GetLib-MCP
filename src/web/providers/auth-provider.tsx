"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { MockSession } from "@/web/types/library";
import { clearSession, readSession, writeSession } from "@/web/features/auth/services/session";

const GUEST_SESSION: MockSession = { name: "Guest", email: "guest@localhost" };

interface SessionContextValue {
  session: MockSession | null;
  authEnabled: boolean | null;
  signIn: (session: MockSession) => void;
  signInWithCredentials: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function fetchAuthEnabled(): Promise<boolean> {
  try {
    const response = await fetch("/api/management/auth/config");
    if (!response.ok) return false;
    const data = (await response.json()) as { enabled?: unknown };
    return data.enabled === true;
  } catch {
    // Fail open to the historical mock behavior when the config endpoint
    // is unreachable - the dashboard stays usable without server auth.
    return false;
  }
}

async function verifyWithServer(email: string, password: string): Promise<string | null> {
  try {
    const response = await fetch("/api/management/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (response.ok) return null;
    const data = (await response.json()) as { error?: { message?: unknown } };
    const message = data.error?.message;
    return typeof message === "string" && message.length > 0
      ? message
      : "Those credentials don't match. Try again.";
  } catch {
    return "We couldn't reach the server. Try again in a moment.";
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MockSession | null>(readSession);
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuthEnabled().then((enabled) => {
      if (!cancelled) setAuthEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((next: MockSession) => {
    writeSession(next);
    setSession(next);
  }, []);

  const signInWithCredentials = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const failure = await verifyWithServer(email, password);
      if (failure !== null) return failure;
      const name = email.split("@")[0] || "user";
      signIn({ name, email });
      return null;
    },
    [signIn],
  );

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    // Best-effort server sign-out: clears the HttpOnly session cookie.
    // Local state clears regardless so a failed request never traps the UI.
    void fetch("/api/management/auth/signout", { method: "POST" }).catch(() => {});
  }, []);

  // Guest session while server authentication is off: no sign-in wall and
  // no persisted session. Never written to storage.
  const effectiveSession = session ?? (authEnabled === false ? GUEST_SESSION : null);

  const value = useMemo(
    () => ({ session: effectiveSession, authEnabled, signIn, signInWithCredentials, signOut }),
    [effectiveSession, authEnabled, signIn, signInWithCredentials, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === null) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}
