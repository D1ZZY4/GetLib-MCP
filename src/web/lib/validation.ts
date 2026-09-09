/**
 * Shared client-side form validation rules.
 *
 * These mirror the server-side credential contract (bootstrap account
 * email plus minimum password length) for instant form feedback. The
 * server remains the authoritative validator - client success here never
 * implies server acceptance.
 */

export function validateEmail(value: string): string | null {
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
    return "That email address doesn't look right";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) {
    return "Use at least 8 characters";
  }
  return null;
}

/**
 * Sign-in password rule. Sign-in accepts whatever password the server was
 * configured with (bootstrap credentials can be short, e.g. demo123), so it
 * only requires a non-empty value. Minimum-length policy applies to choosing
 * a new password (sign-up), not to entering an existing one. The server
 * remains the authoritative verifier.
 */
export function validateSigninPassword(value: string): string | null {
  if (value.length === 0) {
    return "Enter your password";
  }
  return null;
}
