import 'server-only';
import { and, asc, eq, inArray, isNull, not, sql } from 'drizzle-orm';
import { dbRls, getDbService, type SessionLike } from '@/lib/db';
import { processes, processTasks } from '@/lib/db/schema';
import type { processTaskPriority, processTaskStatus } from '@/lib/db/enums';

/** Statuses that do NOT count as open pendências (mirrors the view's filter). */
const CLOSED_TASK_STATUSES = ['concluida', 'arquivada'] as const;

export type TaskRow = {
  id: string;
  process_id: string;
  title: string;
  summary: string | null;
  status: (typeof processTaskStatus.enumValues)[number];
  priority: (typeof processTaskPriority.enumValues)[number];
  due_date: string | null;
  created_at: Date;
};

/**
 * All non-deleted tasks (pendências) for a tenant's processes — joins through
 * `processes` since tasks don't carry `client_id`. Ordered by due date
 * (NULLS LAST) so the most urgent items surface first. One tenant-wide query,
 * grouped per-process client-side — same prefetch pattern as
 * `listPaymentsByClient`.
 *
 * RLS-scoped via `dbRls(session, ...)`; the explicit `client_id` filter stays
 * as a seatbelt.
 */
export async function listTasksForClient(
  session: SessionLike,
  clientId: string,
): Promise<TaskRow[]> {
  return dbRls(session, async (tx) =>
    tx
      .select({
        id: processTasks.id,
        process_id: processTasks.process_id,
        title: processTasks.title,
        summary: processTasks.summary,
        status: processTasks.status,
        priority: processTasks.priority,
        due_date: processTasks.due_date,
        created_at: processTasks.created_at,
      })
      .from(processTasks)
      .innerJoin(processes, eq(processes.id, processTasks.process_id))
      .where(
        and(eq(processes.client_id, clientId), isNull(processTasks.deleted_at)),
      )
      .orderBy(
        sql`${processTasks.due_date} ASC NULLS LAST`,
        asc(processTasks.created_at),
      ),
  );
}

/**
 * Ensures an open "payment overdue" pendência exists for the given
 * installment. Used by the daily `payment-overdue` cron alongside the email:
 * the deterministic title doubles as the idempotency key, so re-runs (or a
 * payment that stays overdue across days) never duplicate the task. Closing
 * or archiving the task releases the key — if the same installment somehow
 * goes overdue again, a fresh pendência is created.
 *
 * Rows created here have `notion_page_id = null`, which keeps them out of the
 * Notion sync's soft-delete sweep (it only touches Notion-tracked tasks) and
 * out of the export write-back (nothing to write to).
 *
 * Service mode: cron job, cross-tenant.
 */
export async function ensurePaymentOverdueTask(
  processId: string,
  installmentNo: number,
): Promise<{ created: boolean }> {
  const db = getDbService();
  const title = `Pagamento da parcela ${installmentNo} em atraso`;

  const existing = await db
    .select({ id: processTasks.id })
    .from(processTasks)
    .where(
      and(
        eq(processTasks.process_id, processId),
        eq(processTasks.title, title),
        not(inArray(processTasks.status, [...CLOSED_TASK_STATUSES])),
        isNull(processTasks.deleted_at),
      ),
    )
    .limit(1);
  if (existing.length > 0) return { created: false };

  await db.insert(processTasks).values({
    process_id: processId,
    title,
    summary: `Identificamos que a parcela ${installmentNo} está com o pagamento em atraso. Regularize para evitar a suspensão do andamento.`,
    status: 'aberta',
    priority: 'alta',
  });
  return { created: true };
}
