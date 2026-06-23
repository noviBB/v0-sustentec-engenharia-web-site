import 'server-only';
import { dbAnon } from '@/lib/db';
import { contactSubmissions } from '@/lib/db/schema';

export type NewContactSubmission = Pick<
  typeof contactSubmissions.$inferInsert,
  'name' | 'email' | 'phone' | 'message' | 'ip_hash' | 'source' | 'user_agent'
>;

/**
 * Inserts a marketing-form submission. Runs under `dbAnon` — the
 * `contact_submissions` RLS policy lets any role INSERT (`WITH CHECK
 * (true)`) but only staff SELECT, so a leaked anon connection cannot read
 * historical submissions back.
 */
export async function insertContactSubmission(
  input: NewContactSubmission,
): Promise<void> {
  await dbAnon(async (tx) => {
    // No RETURNING: `anon` is write-only on contact_submissions (INSERT grant,
    // no SELECT). RETURNING needs SELECT and would fail with "permission
    // denied"; the inserted id is not used downstream.
    await tx.insert(contactSubmissions).values({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      message: input.message,
      ip_hash: input.ip_hash ?? null,
      source: input.source ?? 'marketing_site',
      user_agent: input.user_agent ?? null,
    });
  });
}
