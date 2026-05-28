import 'server-only';
import { eq } from 'drizzle-orm';
import { dbRls, type SessionLike } from './index';
import { profiles } from './schema';

export type Profile = typeof profiles.$inferSelect;

/**
 * Fetches a profile row for the given auth user id, or `null` if no row exists.
 *
 * Tenant isolation: runs under `dbRls(session, ...)`. The `profiles` RLS
 * policy lets a user read their own row and staff read all — so callers
 * who pass another user's id only succeed when the caller is staff.
 */
export async function getProfileByUserId(
  session: SessionLike,
  userId: string,
): Promise<Profile | null> {
  return dbRls(session, async (tx) => {
    const rows = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    return rows[0] ?? null;
  });
}
