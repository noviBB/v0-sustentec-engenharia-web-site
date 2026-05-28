import 'server-only';
import { eq } from 'drizzle-orm';
import { dbRls, type SessionLike } from './index';
import { clients, userClients } from './schema';

export type Client = typeof clients.$inferSelect;

/**
 * Resolves the client tenant for a given Supabase auth user.
 *
 * Joins `user_clients` -> `clients`. If a user is linked to multiple clients
 * (rare today, but the schema allows it), returns the first match. Returns
 * `null` when no link exists.
 *
 * Tenant isolation: runs under `dbRls(session, ...)` so the join is bounded
 * by the `user_clients` RLS policy (`user_id = auth.uid()`). The session is
 * also the authority over `userId` — we still pass `userId` explicitly so
 * tests/callers can resolve a target user without re-deriving it from the
 * claims, but the policy filter is the security boundary.
 *
 * This is the DATA-ACCESS half of tenant resolution; the auth-facing wrapper
 * (`requireClient`) lives in `lib/auth/` and delegates here.
 */
export async function getClientForUser(
  session: SessionLike,
  userId: string,
): Promise<Client | null> {
  return dbRls(session, async (tx) => {
    const rows = await tx
      .select({ client: clients })
      .from(userClients)
      .innerJoin(clients, eq(clients.id, userClients.client_id))
      .where(eq(userClients.user_id, userId))
      .limit(1);
    return rows[0]?.client ?? null;
  });
}
