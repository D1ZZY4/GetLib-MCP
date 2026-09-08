import type { MockSession } from "../../../types/library";

const SESSION_KEY = "getlib-session";

export function readSession(): MockSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "email" in parsed &&
      typeof (parsed as { email: unknown }).email === "string"
    ) {
      const session = parsed as MockSession;
      return { name: session.name || session.email, email: session.email };
    }
  } catch {
    // Corrupt storage means signed out.
  }
  return null;
}

export function writeSession(session: MockSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage is optional; the session still applies for this visit.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clean up.
  }
}
