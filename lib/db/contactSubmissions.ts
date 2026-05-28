import 'server-only';
import { dbAnon } from './index';
import { contactSubmissions } from './schema';

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
export async function insertContactSubmission(input: NewContactSubmission) {
  return dbAnon(async (tx) => {
    const [row] = await tx
      .insert(contactSubmissions)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        message: input.message,
        ip_hash: input.ip_hash ?? null,
        source: input.source ?? 'marketing_site',
        user_agent: input.user_agent ?? null,
      })
      .returning({ id: contactSubmissions.id });
    return row;
  });
}
