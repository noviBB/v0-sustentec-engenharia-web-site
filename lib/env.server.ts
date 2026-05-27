import 'server-only';

/**
 * Boundary-validated server-only environment variables.
 *
 * `import 'server-only'` ensures this module cannot be bundled into a client
 * component — Next.js will fail the build if a `"use client"` file imports
 * from here. This guard is the real enforcement of the client/secret boundary.
 *
 * The values themselves come from `lib/config.ts` (the central configuration
 * service). This module re-exports its server slice so existing importers
 * (`lib/supabase/*`, `app/api/notion/sync-now/route.ts`) don't need to change.
 *
 * `DATABASE_DIRECT_URL` is optional (only needed by Drizzle migrations) and
 * `NOTION_INTEGRATION_TOKEN` is validated lazily in `lib/notion/client.ts`.
 */
import { config } from './config';

export const serverEnv = config.server;
