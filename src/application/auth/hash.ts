import { createHash, timingSafeEqual } from "crypto";

/**
 * Single home for secret hashing and comparison in the application
 * layer. Passwords, API key material, and session signatures all flow
 * through here so timing-safe semantics cannot drift between the auth,
 * apikeys, and session boundaries. Non-secret identifiers (cache keys,
 * request ids, watermark nonces) intentionally stay out - they have
 * different ownership and weaker requirements.
 */

/** Raw SHA-256 digest of a secret value. */
export function sha256Bytes(value: string): Buffer {
  return createHash("sha256").update(value, "utf-8").digest();
}

/** Hex-encoded SHA-256 digest of a secret value, for hashed storage. */
export function sha256Hex(value: string): string {
  return sha256Bytes(value).toString("hex");
}

/**
 * Constant-time buffer comparison. Returns false on length mismatch
 * instead of throwing, so callers never branch on secret length.
 */
export function equalBytes(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Compares two secret strings without leaking either length through
 * timing: both sides hash to a fixed length first.
 */
export function secretsEqual(candidate: string, expected: string): boolean {
  return equalBytes(sha256Bytes(candidate), sha256Bytes(expected));
}
