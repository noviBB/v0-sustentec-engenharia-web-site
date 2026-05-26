import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from './index';
import { clients } from './schema';

export type Client = typeof clients.$inferSelect;

export type NewClient = Pick<
  typeof clients.$inferInsert,
  'name' | 'notion_cnpj_filter' | 'notion_database_id' | 'notion_integration_token'
>;

/**
 * Fetches a client by id, scoped to non-deleted rows.
 *
 * Application-layer scoping only — RLS enforcement is deferred to #18.
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  const rows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deleted_at)))
    .limit(1);

  return rows[0] ?? null;
}
