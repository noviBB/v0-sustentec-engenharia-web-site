import { z } from 'zod';

/**
 * Public configuration slice — the `NEXT_PUBLIC_*` env vars.
 *
 * This module is intentionally tiny and free of any server-secret references
 * so that client bundles which only need public config (via `lib/env.ts`)
 * never pull in the server schema / `process.env` server reads. The combined
 * configuration service lives in `lib/config.ts`, which re-exports this.
 *
 * NO `import 'server-only'` here — public config is safe on the client.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

export type PublicConfig = z.infer<typeof publicEnvSchema>;

let cache: PublicConfig | undefined;

export function getPublicConfig(): PublicConfig {
  if (cache) return cache;
  const parsed = publicEnvSchema.safeParse({
    // NEXT_PUBLIC_* are statically inlined by Next at build time; referencing
    // them by full name (not bracket access) is required for that inlining.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid public environment variables:\n${issues}\n\nCheck your .env.local file.`,
    );
  }
  cache = parsed.data;
  return cache;
}
