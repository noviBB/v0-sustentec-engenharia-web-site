import 'server-only';
import { sql } from 'drizzle-orm';
import { dbRls, type SessionLike } from '@/lib/db';
import {
  pendenciaSeen,
  processes,
  processPendenciaSeen,
  processTasks,
} from '@/lib/db/schema';
import { ProcessTaskStatus } from '@/lib/db/enums';

// Open pendência = a non-deleted task not in a terminal status. Shared by both
// unseen-count queries below and mirrored by v_processes_with_progress's
// pendencias_count (drizzle/custom/0003_views.sql) — keep the three in sync.
const openTaskPredicate = sql`${processTasks.deleted_at} IS NULL
  AND ${processTasks.status} NOT IN (${ProcessTaskStatus.Concluida}, ${ProcessTaskStatus.Arquivada})`;

export async function markPendenciasSeen(
  session: SessionLike,
  clientId: string,
): Promise<void> {
  await dbRls(session, async (tx) =>
    tx
      .insert(pendenciaSeen)
      .values({
        user_id: sql`auth.uid()`,
        client_id: clientId,
        seen_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [pendenciaSeen.user_id, pendenciaSeen.client_id],
        set: { seen_at: sql`now()`, updated_at: sql`now()` },
      }),
  );
}

// Open pendências (status not concluida/arquivada, not deleted) created after
// the user last opened the bell. A null cursor counts everything.
export async function countUnseenPendencias(
  session: SessionLike,
  clientId: string,
): Promise<number> {
  return dbRls(session, async (tx) => {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(processTasks)
      .innerJoin(processes, sql`${processes.id} = ${processTasks.process_id}`)
      .where(
        sql`${processes.client_id} = ${clientId}
          AND ${openTaskPredicate}
          AND (
            (SELECT seen_at FROM pendencia_seen WHERE user_id = auth.uid() AND client_id = ${clientId}) IS NULL
            OR ${processTasks.created_at} > (SELECT seen_at FROM pendencia_seen WHERE user_id = auth.uid() AND client_id = ${clientId})
          )`,
      );
    return Number(row?.count ?? 0);
  });
}

export async function markProcessPendenciasSeen(
  session: SessionLike,
  processId: string,
): Promise<void> {
  await dbRls(session, async (tx) =>
    tx
      .insert(processPendenciaSeen)
      .values({
        user_id: sql`auth.uid()`,
        process_id: processId,
        seen_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [
          processPendenciaSeen.user_id,
          processPendenciaSeen.process_id,
        ],
        set: { seen_at: sql`now()`, updated_at: sql`now()` },
      }),
  );
}

// Per-process open pendência counts, with a PER-PROCESS seen cursor. Same
// open-task predicate as countUnseenPendencias (deleted_at IS NULL, status not
// concluida/arquivada), scoped to the client's processes. A process with no
// seen row counts ALL its open tasks. Returns one row per process that has at
// least one unseen open task.
export async function countUnseenPendenciasByProcess(
  session: SessionLike,
  clientId: string,
): Promise<{ process_id: string; count: number }[]> {
  return dbRls(session, async (tx) => {
    const rows = await tx
      .select({
        process_id: sql<string>`${processTasks.process_id}`,
        count: sql<number>`count(*)::int`,
      })
      .from(processTasks)
      .innerJoin(processes, sql`${processes.id} = ${processTasks.process_id}`)
      .where(
        sql`${processes.client_id} = ${clientId}
          AND ${openTaskPredicate}
          AND (
            (SELECT seen_at FROM process_pendencia_seen WHERE user_id = auth.uid() AND process_id = ${processTasks.process_id}) IS NULL
            OR ${processTasks.created_at} > (SELECT seen_at FROM process_pendencia_seen WHERE user_id = auth.uid() AND process_id = ${processTasks.process_id})
          )`,
      )
      .groupBy(processTasks.process_id);
    return rows.map((r) => ({
      process_id: String(r.process_id),
      count: Number(r.count),
    }));
  });
}
