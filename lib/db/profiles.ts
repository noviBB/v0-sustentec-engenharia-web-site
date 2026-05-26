import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { profiles } from './schema';

export type Profile = typeof profiles.$inferSelect;

/**
 * Fetches a profile row for the given auth user id, or `null` if no row exists.
 *
 * Note: per-tenant scoping (the `db('rls', session)` factory in the issue body)
 * is deferred to #7. For now we use the single Drizzle instance from
 * `lib/db/index.ts` and rely on row-level security at the database layer to
 * isolate tenants.
 */
export async function getProfileByUserId(
  userId: string,
): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return rows[0] ?? null;
}
