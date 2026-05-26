import { z } from 'zod';

/**
 * Boundary-validated public environment variables.
 *
 * Safe to import from client OR server code. Only `NEXT_PUBLIC_*` keys live
 * here — anything sensitive (service role key, DB URL) belongs in
 * `lib/env.server.ts`, which is gated by `import 'server-only'`.
 *
 * Validation runs once at module load. A missing or malformed value throws
 * immediately with a clear message so we fail at boot rather than at the
 * first request that tries to hit Supabase.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

const parsed = publicEnvSchema.safeParse({
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

export const env = parsed.data;
