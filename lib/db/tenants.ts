import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { clients, userClients } from './schema';

export type Client = typeof clients.$inferSelect;

/**
 * Resolves the client tenant for a given Supabase auth user.
 *
 * Joins `user_clients` -> `clients`. If a user is linked to multiple clients
 * (rare today, but the schema allows it), returns the first match. Returns
 * `null` when no link exists.
 *
 * This is the DATA-ACCESS half of tenant resolution and is the only place
 * that touches `db` for this join. The auth-facing wrapper (`requireClient`)
 * lives in `lib/auth/` and delegates its read here. See the "Repository
 * architecture" section in docs/conventions.md.
 *
 * Per-tenant scoping (the `db('rls', session)` factory) is deferred. For now
 * we use the single Drizzle instance from `lib/db/index.ts` and lean on RLS at
 * the database layer.
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
