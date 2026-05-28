import { z } from 'zod';

import { getPublicConfig, type PublicConfig } from './config.public';

/**
 * Central configuration service — the single source of truth for ALL
 * environment variables (public + server).
 *
 * Why this module has NO `import 'server-only'`:
 *   - `scripts/*.ts` (run via tsx) and `drizzle.config.ts` (run by the
 *     drizzle-kit CLI) execute OUTSIDE the Next.js runtime. Importing a
 *     `server-only` module from there poisons the build/CLI. They need a
 *     build-safe config, so they import THIS module directly.
 *
 * How the client/server-secret boundary is still enforced:
 *   - Client components must NEVER import `lib/config.ts` directly. They keep
 *     importing `lib/env.ts` (public slice only), which sources from the tiny
 *     `lib/config.public.ts` module — so the server schema / server
 *     `process.env` reads below are never pulled into a client bundle.
 *   - `lib/env.server.ts` re-exports the server slice and keeps its
 *     `import 'server-only'` guard, so Next.js still fails the build if a
 *     `"use client"` file pulls in server secrets.
 *
 * Both slices validate lazily on first access (see the getters on `config`).
 *
 * `NOTION_INTEGRATION_TOKEN` is intentionally optional (validated lazily at
 * sync time in `lib/notion/client.ts`) and `DATABASE_DIRECT_URL` is optional
 * (only used by migrations), so `pnpm build` succeeds without them.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Optional — only the migration path (scripts/migrate.ts, drizzle.config.ts)
  // prefers it over the pooled DATABASE_URL.
  DATABASE_DIRECT_URL: z.string().min(1).optional(),
  // Shared secret for the manual sync / cron endpoints.
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
  // External credential — NOT available at build time. Optional here and
  // validated LAZILY inside lib/notion/client.ts when a sync actually runs, so
  // `pnpm build` succeeds with an empty token.
  NOTION_INTEGRATION_TOKEN: z.string().optional(),
  // Notion webhook signing secret. Optional at boot — validated lazily inside
  // `/api/notion/webhook` (returns 503 when unset, so Notion stops retrying).
  // The 15-min cron remains the backstop on webhook outages.
  NOTION_WEBHOOK_SECRET: z.string().optional(),
});

export type ServerConfig = z.infer<typeof serverEnvSchema>;
export type { PublicConfig };

let serverCache: ServerConfig | undefined;

function getServerConfig(): ServerConfig {
  if (serverCache) return serverCache;
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_DIRECT_URL: process.env.DATABASE_DIRECT_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    NOTION_INTEGRATION_TOKEN: process.env.NOTION_INTEGRATION_TOKEN,
    NOTION_WEBHOOK_SECRET: process.env.NOTION_WEBHOOK_SECRET,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid server environment variables:\n${issues}\n\nCheck your .env.local file.`,
    );
  }
  serverCache = parsed.data;
  return serverCache;
}

/**
 * The configuration service. `config.public` and `config.server` are validated
 * on first access (lazily) so that reading public values never forces server
 * secrets to be present.
 */
export const config = {
  get public(): PublicConfig {
    return getPublicConfig();
  },
  get server(): ServerConfig {
    return getServerConfig();
  },
};
