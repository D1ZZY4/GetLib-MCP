import { z } from "zod";

/**
 * Centralized validation for untrusted external payloads.
 *
 * Every fetch boundary (npm, PyPI, crates.io, GitHub, MDN, DDG, SearXNG,
 * version checks, cache envelopes) parses through these schemas so a
 * malformed upstream body can never slip into domain models via an
 * unchecked cast. Callers get typed data or null, never a half-trusted
 * object.
 *
 * All helpers are pure and side-effect free. On validation failure they
 * return null so callers can apply their existing fallback policy.
 */

const npmPackageSchema = z.object({
  name: z.string().min(1).max(214),
  description: z.string().max(5000).optional(),
  homepage: z.string().max(2000).optional(),
  repository: z
    .union([z.string().max(2000), z.object({ url: z.string().max(2000).optional() })])
    .optional(),
});

const pypiPackageSchema = z.object({
  info: z.object({
    name: z.string().min(1).max(214),
    summary: z.string().max(5000).optional(),
    home_page: z.string().max(2000).optional().nullable(),
    project_urls: z.record(z.string(), z.string().max(2000)).optional().nullable(),
  }),
});

const cratesPackageSchema = z.object({
  crate: z.object({
    name: z.string().min(1).max(214),
    description: z.string().max(5000).optional(),
    homepage: z.string().max(2000).optional().nullable(),
    repository: z.string().max(2000).optional().nullable(),
    documentation: z.string().max(2000).optional().nullable(),
    max_stable_version: z.string().max(100).optional(),
  }),
});

const npmSearchSchema = z.object({
  objects: z
    .array(
      z.object({
        package: z.object({
          name: z.string().min(1).max(214),
          description: z.string().max(5000).optional(),
          links: z
            .object({
              homepage: z.string().max(2000).optional(),
              repository: z.string().max(2000).optional(),
              npm: z.string().max(2000).optional(),
            })
            .optional(),
        }),
      }),
    )
    .optional(),
});

const githubSearchSchema = z.object({
  items: z
    .array(
      z.object({
        full_name: z.string().min(1).max(300),
        description: z.string().max(5000).optional().nullable(),
        homepage: z.string().max(2000).optional().nullable(),
        html_url: z.string().min(1).max(2000),
      }),
    )
    .optional(),
});

const githubReleasesSchema = z.array(
  z.object({
    tag_name: z.string().max(200).optional(),
    name: z.string().max(200).optional().nullable(),
    body: z.string().max(100000).optional().nullable(),
    published_at: z.string().max(100).optional(),
    prerelease: z.boolean().optional(),
    draft: z.boolean().optional(),
  }),
);

const githubCodeSearchSchema = z.object({
  total_count: z.number().int().min(0).max(1000000),
  items: z.array(z.unknown()).optional(),
});

const mdnSearchSchema = z.object({
  documents: z
    .array(
      z.object({
        mdn_url: z.string().max(2000).optional(),
        title: z.string().max(500).optional(),
      }),
    )
    .optional(),
});

const ddgInstantSchema = z.object({
  AbstractURL: z.string().max(2000).optional(),
  Results: z.array(z.object({ FirstURL: z.string().max(2000).optional() })).optional(),
  RelatedTopics: z.array(z.object({ FirstURL: z.string().max(2000).optional() })).optional(),
});

const searxngSchema = z.object({
  results: z
    .array(z.object({ url: z.string().max(2000).optional(), title: z.string().max(500).optional() }))
    .optional(),
});

const versionCheckSchema = z.object({
  version: z.string().max(100).optional(),
});

const cacheEnvelopeSchema = z.object({
  text: z.string().max(500000).optional(),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
});

const mdnDocSchema = z.object({
  doc: z
    .object({
      pageTitle: z.string().max(500).optional(),
      summary: z.string().max(20000).optional(),
      browserCompat: z.array(z.string().max(300)).optional(),
      baseline: z.unknown().optional(),
    })
    .optional(),
});

/** Parse unknown data against a schema. Returns typed data or null. */
export function parseExternal<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Parse a JSON string against a schema. Returns typed data or null. */
export function parseJsonExternal<T>(schema: z.ZodType<T>, text: string): T | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  return parseExternal(schema, raw);
}

/** Safe JSON parse that never throws. Returns unknown or null. */
export function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export const externalSchemas = {
  npmPackage: npmPackageSchema,
  pypiPackage: pypiPackageSchema,
  cratesPackage: cratesPackageSchema,
  npmSearch: npmSearchSchema,
  githubSearch: githubSearchSchema,
  githubReleases: githubReleasesSchema,
  githubCodeSearch: githubCodeSearchSchema,
  mdnSearch: mdnSearchSchema,
  ddgInstant: ddgInstantSchema,
  searxng: searxngSchema,
  versionCheck: versionCheckSchema,
  cacheEnvelope: cacheEnvelopeSchema,
  mdnDoc: mdnDocSchema,
};

export interface CacheEnvelopeHit {
  text: string;
  structuredContent?: Record<string, unknown>;
}

/**
 * Parse an already-parsed value as a cache envelope. Separated from
 * readCacheEnvelope so callers that already hold the parsed payload
 * (e.g. compat's legacy plain-text branch) do not parse twice.
 */
export function parseCacheEnvelopeRaw(raw: unknown): CacheEnvelopeHit | null {
  const envelope = raw ? parseExternal(externalSchemas.cacheEnvelope, raw) : null;
  if (!envelope?.text) return null;
  return {
    text: envelope.text,
    ...(envelope.structuredContent ? { structuredContent: envelope.structuredContent } : {}),
  };
}

/**
 * Single cache-envelope reader shared by every use case that persists a
 * `{ text, structuredContent }` envelope (changelog, compat). Parses and
 * validates once; each caller keeps its own hit policy (changelog
 * refetches envelope-less hits, compat additionally honors legacy plain
 * entries) so storage evolution never silently degrades a response.
 */
export function readCacheEnvelope(cached: string): CacheEnvelopeHit | null {
  return parseCacheEnvelopeRaw(safeJsonParse(cached));
}

/**
 * Normalize em dashes in application-controlled output.
 *
 * External providers may return U+2014. The no-em-dash rule forbids that
 * character in controlled content, so the transformation boundary folds
 * it to a hyphen. Semantics are preserved for technical docs.
 */
export function normalizeEmDash(text: string): string {
  // Removal-only fold: the code point below is matched so it can be
  // replaced, never emitted. Controlled output therefore cannot contain
  // an em dash, which is exactly what the no-em-dash rule requires of
  // the transformation boundary.
  return text.split(String.fromCharCode(0x2014)).join("-");
}
