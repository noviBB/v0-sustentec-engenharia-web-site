import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clients, userClients } from '@/lib/db/schema';

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
