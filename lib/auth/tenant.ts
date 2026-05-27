import 'server-only';
import type { User } from '@supabase/supabase-js';
import { getClientForUser, type Client } from '@/lib/db/tenants';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

/**
 * Auth concern: bridges Supabase auth identity to the application's tenant
 * model. The actual tenant DB read lives in the `lib/db/tenants.ts`
 * repository; this module only re-exports it (so existing importers keep
 * working) and adds the auth-aware `requireClient` helper.
 *
 * Layering: services/auth → repositories (`lib/db/*`) → `db`. Only the
 * repository touches `db`. See docs/conventions.md.
 */
export { getClientForUser };
export type { Client };

export type RequireClientResult =
  | { ok: true; user: User; client: Client }
  | { ok: false; code: 'unauthorized' };

/**
 * Server-action helper: resolves the signed-in user and their tenant in
 * one shot. Returns `{ ok: false, code: 'unauthorized' }` on either a
 * missing auth user OR a missing tenant link — actions should map both
 * to the same toast since the difference isn't actionable to the user.
 *
 * The tenant read is delegated to the `lib/db/tenants.ts` repository — this
 * wrapper never touches `db` directly.
 */
export async function requireClient(): Promise<RequireClientResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: 'unauthorized' };
  }
  const client = await getClientForUser(user.id);
  if (!client) {
    return { ok: false, code: 'unauthorized' };
  }
  return { ok: true, user, client };
}
