/**
 * Boundary-validated public environment variables.
 *
 * Safe to import from client OR server code. Only `NEXT_PUBLIC_*` keys are
 * exposed here — anything sensitive (service role key, DB URL) lives in
 * `lib/env.server.ts`, which is gated by `import 'server-only'`.
 *
 * The source of truth is the central configuration service. This module
 * re-exports the PUBLIC slice (`lib/config.public.ts`) directly — NOT the
 * combined `lib/config.ts` — so client bundles never pull in the server schema
 * or server-side env reads. Existing importers (`lib/supabase/*`) keep
 * importing `env` from here unchanged. Validation throws with a clear message
 * if a value is missing/malformed.
 */
import { getPublicConfig } from './config.public';

export const env = getPublicConfig();
