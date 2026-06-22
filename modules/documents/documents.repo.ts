import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { dbRls, type SessionLike } from '@/lib/db';
import { processDocuments, processes } from '@/lib/db/schema';

export type DocumentRow = {
  id: string;
  process_id: string;
  name: string;
  url: string;
  created_at: Date;
};

/**
 * All non-deleted documents for a tenant's processes — joins through
 * `processes` since documents don't carry `client_id`. The portal is
 * download-only: rows are written by seed/staff tooling, never by clients
 * (enforced by the staff-only write policy in 0006).
 *
 * RLS-scoped via `dbRls(session, ...)`; the explicit `client_id` filter stays
 * as a seatbelt.
 */
export async function listDocumentsForClient(
  session: SessionLike,
  clientId: string,
): Promise<DocumentRow[]> {
  return dbRls(session, async (tx) =>
    tx
      .select({
        id: processDocuments.id,
        process_id: processDocuments.process_id,
        name: processDocuments.name,
        url: processDocuments.url,
        created_at: processDocuments.created_at,
      })
      .from(processDocuments)
      .innerJoin(processes, eq(processes.id, processDocuments.process_id))
      .where(
        and(
          eq(processes.client_id, clientId),
          isNull(processDocuments.deleted_at),
        ),
      )
      .orderBy(desc(processDocuments.created_at)),
  );
}
