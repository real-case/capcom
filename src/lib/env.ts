import { z } from "zod";

/**
 * Public environment — client-safe configuration only (ADR 0018).
 *
 * Conventions (ADR 0017, 0018):
 * - Only `NEXT_PUBLIC_*` variables live here; anything secret belongs in
 *   `env.server.ts` behind the `server-only` fence.
 * - Types are derived with `z.infer` — never hand-written next to a schema.
 * - Validation messages carry the `[env]` origin marker, so a failure read in
 *   build output or a log names its boundary without a stack trace.
 * - Application code imports typed `env` from here; raw `process.env` access
 *   anywhere else in `src/` fails lint.
 */
export const publicEnvSchema = z.object({
  /**
   * Absolute origin the app is served from — consumed by `metadataBase` now
   * and by canonical/hreflang URLs when SEO lands (ADR 0031). The localhost
   * default keeps local and preview builds working until per-environment
   * values are provisioned in Vercel (ADR 0009, 0018).
   */
  NEXT_PUBLIC_SITE_URL: z
    .url({
      // WHATWG-valid alone is too loose (`mailto:`, `javascript:` pass) —
      // a site origin must be http(s), or canonical URLs break silently.
      protocol: /^https?$/,
      error: "[env] NEXT_PUBLIC_SITE_URL must be an absolute http(s) URL",
    })
    .default("http://localhost:3000"),

  /**
   * Supabase API origin (ADR 0013). Defaults to the local stack so builds,
   * tests, and previews work before per-environment values are provisioned in
   * Vercel (ADR 0009); the cloud URL is set per environment there.
   */
  NEXT_PUBLIC_SUPABASE_URL: z
    .url({
      protocol: /^https?$/,
      error: "[env] NEXT_PUBLIC_SUPABASE_URL must be an absolute http(s) URL",
    })
    .default("http://127.0.0.1:54321"),

  /**
   * Supabase publishable key (ADR 0013). Public by design — it ships to the
   * browser and all access is RLS-gated, so it is not a secret. Defaults to
   * the universal local-dev key (the stack's shared default, identical on
   * every local install); the real per-environment key is set in Vercel.
   * Allowlisted in `.gitleaks.toml` as a known public value.
   */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "[env] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required")
    .default("sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Validate env input against a schema, failing fast with an `[env]`-marked,
 * human-readable error (ADR 0017 origin marker; ADR 0018 fail-fast). Shared
 * by both env modules: throwing at module scope turns a misconfiguration into
 * a build/boot failure instead of a mid-request surprise.
 */
export function parseEnv<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `[env] Invalid environment:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

// NEXT_PUBLIC_* values reach client bundles only where the literal expression
// `process.env.NEXT_PUBLIC_X` appears at build time — hence the explicit
// per-key object instead of handing over `process.env` wholesale.
export const env = parseEnv(publicEnvSchema, {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
