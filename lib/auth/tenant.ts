import 'server-only';
import { eq } from 'drizzle-orm';
import type { User } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { clients, userClients } from '@/lib/db/schema';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

export type Client = typeof clients.$inferSelect;

/**
 * Resolves the client tenant for a given Supabase auth user.
 *
 * Joins `user_clients` -> `clients`. If a user is linked to multiple clients
 * (rare today, but the schema allows it), returns the first match. Returns
 * `null` when no link exists.
 *
 * Per-tenant scoping (the `db('rls', session)` factory in the issue body) is
 * deferred to #7. For now we use the single Drizzle instance from
 * `lib/db/index.ts` and lean on RLS at the database layer.
 *
 * Lives in `lib/auth/` (not `lib/db/`) because it bridges Supabase auth
 * identity to the application's tenant model — it is consumed by the portal
 * layout's auth gate, not by generic DB code.
 */
export async function getClientForUser(
  userId: string,
): Promise<Client | null> {
  const rows = await db
    .select({ client: clients })
    .from(userClients)
    .innerJoin(clients, eq(clients.id, userClients.client_id))
    .where(eq(userClients.user_id, userId))
    .limit(1);

  return rows[0]?.client ?? null;
}

export type RequireClientResult =
  | { ok: true; user: User; client: Client }
  | { ok: false; code: 'unauthorized' };

/**
 * Server-action helper: resolves the signed-in user and their tenant in
 * one shot. Returns `{ ok: false, code: 'unauthorized' }` on either a
 * missing auth user OR a missing tenant link — actions should map both
 * to the same toast since the difference isn't actionable to the user.
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
