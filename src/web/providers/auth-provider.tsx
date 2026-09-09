"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { MockSession } from "@/web/types/library";
import { fetchJson, postJson } from "@/web/lib/api-client";
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
    const data = await fetchJson<{ enabled?: unknown }>("/api/management/auth/config");
    return data.enabled === true;
  } catch {
    // Fail open to the historical mock behavior when the config endpoint
    // is unreachable - the dashboard stays usable without server auth.
    return false;
  }
}

async function verifyWithServer(email: string, password: string): Promise<string | null> {
  try {
    await postJson<{ ok: boolean }>("/api/management/auth/signin", { email, password });
    return null;
  } catch (error) {
    // Network-level failure: fetch itself throws a TypeError, distinct
    // from the server error envelope that fetchJson raises as Error.
    if (error instanceof TypeError) return "We couldn't reach the server. Try again in a moment.";
    if (error instanceof Error && error.message.length > 0) return error.message;
    return "Those credentials don't match. Try again.";
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
    void fetchJson<{ ok: boolean }>("/api/management/auth/signout", { method: "POST" }).catch(
      () => {},
    );
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
