import 'server-only';
import { db } from './index';
import { contactSubmissions } from './schema';

export interface NewContactSubmission {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  ip_hash?: string | null;
}

export async function insertContactSubmission(input: NewContactSubmission) {
  const [row] = await db
    .insert(contactSubmissions)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      message: input.message,
      ip_hash: input.ip_hash ?? null,
    })
    .returning({ id: contactSubmissions.id });

  return row;
}
