import 'server-only';
import { db } from './index';
import { contactSubmissions } from './schema';

export type NewContactSubmission = Pick<
  typeof contactSubmissions.$inferInsert,
  'name' | 'email' | 'phone' | 'message' | 'ip_hash' | 'source' | 'user_agent'
>;

export async function insertContactSubmission(input: NewContactSubmission) {
  const [row] = await db
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
}
