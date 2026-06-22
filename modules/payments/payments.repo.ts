import 'server-only';
import { and, asc, eq, lt, sql } from 'drizzle-orm';
import { dbRls, getDbService, type SessionLike } from '@/lib/db';
import { payments, processes } from '@/lib/db/schema';

export type PaymentRow = typeof payments.$inferSelect;

/**
 * A payment plus the bare minimum of its parent process so the portal can
 * render lists without a second query. Kept tight on purpose — callers
 * that need more process columns should add them explicitly.
 */
export type PaymentWithProcess = PaymentRow & {
  process: {
    id: string;
    client_id: string;
    code: string | null;
    name: string | null;
  };
};

/**
 * All payments belonging to a given tenant — joins through `processes` since
 * payments themselves don't carry `client_id`. Ordered by due date so the
 * dashboard's "next due" surfaces naturally.
 *
 * RLS-scoped via `dbRls(session, ...)`. The `payments` RLS policy joins
 * through `processes`/`user_clients`; the application-layer `WHERE
 * processes.client_id = ?` filter stays as a seatbelt.
 */
export async function listPaymentsByClient(
  session: SessionLike,
  clientId: string,
): Promise<PaymentWithProcess[]> {
  return dbRls(session, async (tx) => {
    const rows = await tx
      .select({
        payment: payments,
        process: {
          id: processes.id,
          client_id: processes.client_id,
          code: processes.code,
          name: processes.name,
        },
      })
      .from(payments)
      .innerJoin(processes, eq(processes.id, payments.process_id))
      .where(eq(processes.client_id, clientId))
      .orderBy(asc(payments.due_date), asc(payments.installment_no));

    return rows.map((r) => ({ ...r.payment, process: r.process }));
  });
}

/**
 * Per-process payment ladder, ordered by installment number.
 */
export async function listPaymentsByProcess(
  session: SessionLike,
  processId: string,
): Promise<PaymentRow[]> {
  return dbRls(session, async (tx) =>
    tx
      .select()
      .from(payments)
      .where(eq(payments.process_id, processId))
      .orderBy(asc(payments.installment_no)),
  );
}

/**
 * Marks a single payment as paid. Sets `paid_at = now()` and flips the status
 * to `'paid'` regardless of the previous state — useful for both the manual
 * "mark as paid" action and an admin override on an `overdue` row.
 */
export async function markPaymentPaid(
  session: SessionLike,
  paymentId: string,
): Promise<PaymentRow | null> {
  return dbRls(session, async (tx) => {
    const updated = await tx
      .update(payments)
      .set({
        paid_at: sql`now()`,
        status: 'paid',
        updated_at: sql`now()`,
      })
      .where(eq(payments.id, paymentId))
      .returning();
    return updated[0] ?? null;
  });
}

/**
 * Sweeps `pending` payments whose due date has passed and flips them to
 * `'overdue'`. Used by the daily `payment-overdue` cron — returns the rows
 * that flipped so the cron can fan out notification emails.
 *
 * Service mode: this is a bulk cross-tenant update driven by a system job,
 * not by an authenticated user.
 */
export async function markOverdue(): Promise<PaymentRow[]> {
  const db = getDbService();
  return db
    .update(payments)
    .set({ status: 'overdue', updated_at: sql`now()` })
    .where(
      and(
        eq(payments.status, 'pending'),
        lt(payments.due_date, sql`current_date`),
      ),
    )
    .returning();
}
