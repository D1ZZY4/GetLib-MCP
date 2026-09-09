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
