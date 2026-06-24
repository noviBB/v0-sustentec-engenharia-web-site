import 'server-only';
import { sql } from 'drizzle-orm';
import { dbRls, type SessionLike } from '@/lib/db';
import { pendenciaSeen, processes, processTasks } from '@/lib/db/schema';
import { ProcessTaskStatus } from '@/lib/db/enums';

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
          AND ${processTasks.deleted_at} IS NULL
          AND ${processTasks.status} NOT IN (${ProcessTaskStatus.Concluida}, ${ProcessTaskStatus.Arquivada})
          AND (
            (SELECT seen_at FROM pendencia_seen WHERE user_id = auth.uid() AND client_id = ${clientId}) IS NULL
            OR ${processTasks.created_at} > (SELECT seen_at FROM pendencia_seen WHERE user_id = auth.uid() AND client_id = ${clientId})
          )`,
      );
    return Number(row?.count ?? 0);
  });
}
