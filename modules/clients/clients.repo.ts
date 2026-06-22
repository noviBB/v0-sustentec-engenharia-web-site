import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { dbRls, getDbService, type SessionLike } from '@/lib/db';
import { clients } from '@/lib/db/schema';

export type Client = typeof clients.$inferSelect;

export type NewClient = Pick<
  typeof clients.$inferInsert,
  'name' | 'notion_cnpj_filter' | 'notion_database_id' | 'notion_integration_token'
>;

/**
 * Subset of `clients` columns that the portal "Dados Cadastrais" form is
 * allowed to mutate. Notion-sync fields, soft-delete timestamps, and tenant
 * identity (`id`, `name`) stay off-limits and are intentionally excluded.
 */
export type ClientCadastralUpdate = Partial<
  Pick<
    typeof clients.$inferInsert,
    | 'contact_name'
    | 'contact_role'
    | 'contact_email'
    | 'contact_phone'
    | 'address_street'
    | 'address_city'
    | 'address_state'
    | 'address_postal_code'
  >
>;

/**
 * Service-mode fetch of a client by id — used by the Notion adapter and
 * cron handlers that operate across tenants. Bypasses RLS.
 *
 * Kept on the bare `getClientById` name (signature unchanged from pre-#22)
 * because the system callers (Notion, cron, scripts) outnumber the portal
 * callers and live in files this slice doesn't touch. Portal callers use
 * `getClientByIdRls` below.
 */
export async function getClientById(
  clientId: string,
): Promise<Client | null> {
  const db = getDbService();
  const rows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deleted_at)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Portal-facing: fetches a client by id under RLS. The session-bound role
 * `authenticated` combined with the `clients` RLS policy means a user can
 * only see rows reachable through their `user_clients` link. The `WHERE
 * clients.id = ?` filter stays as a belt-and-braces seatbelt above the
 * policy.
 */
export async function getClientByIdRls(
  session: SessionLike,
  clientId: string,
): Promise<Client | null> {
  return dbRls(session, async (tx) => {
    const rows = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deleted_at)))
      .limit(1);
    return rows[0] ?? null;
  });
}

/**
 * Patches a client row with the cadastral fields. Touches `updated_at` so
 * downstream consumers (audit log, future cache invalidators) can rely on a
 * monotonically advancing timestamp. Returns the updated row, or `null` if
 * the row was missing / soft-deleted / outside the caller's tenant scope.
 */
export async function updateClient(
  session: SessionLike,
  clientId: string,
  partial: ClientCadastralUpdate,
): Promise<Client | null> {
  return dbRls(session, async (tx) => {
    const updated = await tx
      .update(clients)
      .set({ ...partial, updated_at: sql`now()` })
      .where(and(eq(clients.id, clientId), isNull(clients.deleted_at)))
      .returning();
    return updated[0] ?? null;
  });
}
