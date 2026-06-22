import 'server-only';
import { getClientForUser, type Client } from '@/lib/db/tenants';
import { getProfileByUserId, type Profile } from '@/lib/db/profiles';
import type { SessionLike } from '@/lib/db';
import { authPort } from '@/lib/auth/port';
import type { AuthUser } from '@/lib/auth/port';

/**
 * Auth concern: bridges the auth identity (via the `AuthPort` seam) to the
 * application's tenant model. The actual tenant DB read lives in
 * `lib/db/tenants.ts`; this module adds the auth-aware `requireClient` helper.
 *
 * Layering: services/auth → repositories (`lib/db/*`) → `db`. Only the
 * repository touches `db`. See docs/conventions.md.
 *
 * This module no longer imports `@supabase/*` or `@/lib/supabase/server`
 * directly — all auth flows through `authPort` (the Supabase adapter), so the
 * provider is swappable / fakeable without editing call sites.
 */
export { getClientForUser, getProfileByUserId };
export type { Client, Profile };

export type RequireClientResult =
  | { ok: true; user: AuthUser; client: Client; session: SessionLike }
  | { ok: false; code: 'unauthorized' };

/**
 * Builds the JWT-claims object that `dbRls(session, ...)` propagates into
 * `request.jwt.claims`. Exported (now a thin alias over `authPort.toClaims`)
 * so callers that need a session for an RLS-scoped read but already have a
 * user in hand (e.g. portal RSCs) can build one without re-running
 * `getCurrentUser()`.
 *
 * Only the columns RLS policies look at are populated — `auth.uid()` reads
 * `sub`, `auth.role()` reads `role`. The role is hard-coded to
 * `authenticated` because that's the role we `SET LOCAL` to inside the
 * transaction; the JWT `role` field would override `auth.role()` if it
 * disagreed, so we keep them in sync.
 */
export function sessionForUser(user: AuthUser): SessionLike {
  return authPort.toClaims(user);
}

/**
 * Server-action helper: resolves the signed-in user and their tenant in
 * one shot. Returns `{ ok: false, code: 'unauthorized' }` on either a
 * missing auth user OR a missing tenant link — actions should map both
 * to the same toast since the difference isn't actionable to the user.
 *
 * Result includes a `session` object the caller passes through to RLS-aware
 * repository functions. The tenant read itself is delegated to the
 * `lib/db/tenants.ts` repository — this wrapper never touches `db` directly.
 */
export async function requireClient(): Promise<RequireClientResult> {
  const user = await authPort.getCurrentUser();
  if (!user) {
    return { ok: false, code: 'unauthorized' };
  }
  const session = authPort.toClaims(user);
  const client = await getClientForUser(session, user.id);
  if (!client) {
    return { ok: false, code: 'unauthorized' };
  }
  return { ok: true, user, client, session };
}
