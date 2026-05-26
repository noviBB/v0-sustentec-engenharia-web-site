import 'server-only';
import { z } from 'zod';

/**
 * Boundary-validated server-only environment variables.
 *
 * `import 'server-only'` ensures this module cannot be bundled into a client
 * component — Next.js will fail the build if a `"use client"` file imports
 * from here. Use it for anything secret: service-role keys, DB URLs, etc.
 *
 * `DATABASE_DIRECT_URL` is optional because it's only needed by Drizzle
 * migrations (which run from `scripts/`), not the runtime.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_DIRECT_URL: z.string().min(1).optional(),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_DIRECT_URL: process.env.DATABASE_DIRECT_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Invalid server environment variables:\n${issues}\n\nCheck your .env.local file.`,
  );
}

export const serverEnv = parsed.data;
