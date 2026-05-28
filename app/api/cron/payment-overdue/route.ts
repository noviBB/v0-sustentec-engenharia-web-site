import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';

import { CronRouteError, requireCronAuth } from '@/app/api/cron/_shared/auth';
import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { insertAuditLog } from '@/lib/db/auditLog';
import { getClientById } from '@/lib/db/clients';
import { db } from '@/lib/db';
import { markOverdue } from '@/lib/db/payments';
import { processes } from '@/lib/db/schema';
import { sendPaymentOverdueEmail } from '@/lib/email/payment-overdue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel cron entry point — wired in `vercel.json` at `0 9 * * *`.
 *
 *   GET /api/cron/payment-overdue
 *   Authorization: Bearer $CRON_SECRET
 *
 * Sweeps any `pending` payment past its `due_date` to `overdue`, groups the
 * resulting rows by tenant, and fans out a notification email per client. One
 * failing email does NOT abort the run — failures are logged via the email
 * helper and the loop moves on.
 *
 * Response shape: `{ ok: true, updated: N, emailed: M }`.
 */
export async function GET(request: Request): Promise<Response> {
  const fail = requireCronAuth(request);
  if (fail) return fail;

  try {
    const flipped = await markOverdue();

    if (flipped.length === 0) {
      await insertAuditLog({
        action: AuditAction.PaymentOverdueCronRun,
        entity_type: 'cron',
        after: { updated: 0, emailed: 0 },
      });
      return NextResponse.json({ ok: true, updated: 0, emailed: 0 });
    }

    // Resolve process_id -> client_id in one query.
    const processIds = Array.from(new Set(flipped.map((p) => p.process_id)));
    const procRows = await db
      .select({ id: processes.id, client_id: processes.client_id })
      .from(processes)
      .where(inArray(processes.id, processIds));
    const processToClient = new Map<string, string>(
      procRows.map((r) => [r.id, r.client_id]),
    );

    // Bucket flipped payments by client.
    const byClient = new Map<string, typeof flipped>();
    for (const row of flipped) {
      const clientId = processToClient.get(row.process_id);
      if (!clientId) continue;
      const list = byClient.get(clientId) ?? [];
      list.push(row);
      byClient.set(clientId, list);
    }

    let emailed = 0;
    for (const [clientId, paymentsForClient] of byClient) {
      try {
        const client = await getClientById(clientId);
        if (!client) continue;
        const sent = await sendPaymentOverdueEmail({
          client,
          payments: paymentsForClient,
        });
        if (sent) emailed += 1;
      } catch (e) {
        // The email helper already audit-logged the failure — just log here
        // and keep going so one bad email doesn't abort the cron.
        const message = e instanceof Error ? e.message : String(e);
        console.error(
          JSON.stringify({
            event: AuditEvent.PaymentOverdueEmailFailed,
            client_id: clientId,
            error: message,
          }),
        );
      }
    }

    await insertAuditLog({
      action: AuditAction.PaymentOverdueCronRun,
      entity_type: 'cron',
      after: { updated: flipped.length, emailed },
    });

    return NextResponse.json({
      ok: true,
      updated: flipped.length,
      emailed,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        event: AuditEvent.PaymentOverdueCronFailed,
        error: message,
      }),
    );
    return NextResponse.json(
      { error: CronRouteError.ServerError, message },
      { status: 500 },
    );
  }
}
