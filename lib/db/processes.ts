import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from './index';
import { vProcessesWithProgress } from './views';

/**
 * Row shape of `v_processes_with_progress`. Drizzle 0.36.x exposes
 * `$inferSelect` on `pgView().existing()` declarations, so we lift the
 * shape from the view definition instead of re-typing every column.
 */
export type ProcessRow = typeof vProcessesWithProgress.$inferSelect;

/**
 * Per-tenant list of processes, joined to the `v_processes_with_progress`
 * view so callers receive `progress_percent` + `pendencias_count` without
 * a second roundtrip.
 *
 * Application-layer scoping — `WHERE client_id = $clientId` is the
 * isolation boundary until RLS lands in #18. Defaults to `LIMIT 200` so a
 * runaway list doesn't blow up the RSC payload; callers can paginate later
 * via `{ limit, offset }`.
 */
export async function listProcessesForClient(
  clientId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<ProcessRow[]> {
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  return db
    .select()
    .from(vProcessesWithProgress)
    .where(
      and(
        eq(vProcessesWithProgress.client_id, clientId),
        isNull(vProcessesWithProgress.deleted_at),
      ),
    )
    .orderBy(desc(vProcessesWithProgress.created_at))
    .limit(limit)
    .offset(offset);
}

export async function getProcessById(
  clientId: string,
  processId: string,
): Promise<ProcessRow | null> {
  const rows = await db
    .select()
    .from(vProcessesWithProgress)
    .where(
      and(
        eq(vProcessesWithProgress.client_id, clientId),
        eq(vProcessesWithProgress.id, processId),
        isNull(vProcessesWithProgress.deleted_at),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export type ProcessBuckets = {
  andamento: ProcessRow[];
  acompanhamento: ProcessRow[];
  finalizado: ProcessRow[];
};

/**
 * Groups a client's processes into the three portal buckets in JS,
 * keeping the DB query to a single trip. Rows with status `arquivado`
 * are dropped — they're not surfaced to the portal.
 */
export async function listBuckets(clientId: string): Promise<ProcessBuckets> {
  const rows = await listProcessesForClient(clientId);
  const buckets: ProcessBuckets = {
    andamento: [],
    acompanhamento: [],
    finalizado: [],
  };
  for (const row of rows) {
    if (
      row.status === 'andamento' ||
      row.status === 'acompanhamento' ||
      row.status === 'finalizado'
    ) {
      buckets[row.status].push(row);
    }
  }
  return buckets;
}
