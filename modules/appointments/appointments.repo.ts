import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, lt, ne } from 'drizzle-orm';
import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { insertAuditLog } from '@/lib/db/auditLog';
import { dbRls, type SessionLike } from '@/lib/db';
import { appointments } from '@/lib/db/schema';

export type Appointment = typeof appointments.$inferSelect;

export type NewAppointment = Pick<
  typeof appointments.$inferInsert,
  | 'responsible_tech_id'
  | 'process_id'
  | 'title'
  | 'description'
  | 'starts_at'
  | 'ends_at'
>;

export type CreateAppointmentResult =
  | { ok: true; id: string }
  | { ok: false; code: ResultCode.DoubleBooked }
  | { ok: false; code: ResultCode.Unauthorized }
  | { ok: false; code: ResultCode.ServerError; ref: string };

export async function listAppointmentsForClient(
  session: SessionLike,
  clientId: string,
): Promise<Appointment[]> {
  return dbRls(session, async (tx) =>
    tx
      .select()
      .from(appointments)
      .where(eq(appointments.client_id, clientId))
      .orderBy(asc(appointments.starts_at)),
  );
}

/**
 * Lists a tech's non-cancelled appointments inside the inclusive date
 * range — used by the scheduling UI to grey out taken slots.
 *
 * RLS-scoped: the `appointments` policy will return only rows the caller's
 * tenants can see. Since this powers the "is the tech free?" check, that
 * means a user only sees collisions inside their own tenant — for now an
 * acceptable trade-off (staff have a separate booking UI; nothing else
 * needs cross-tenant visibility).
 */
export async function listAppointmentsForTech(
  session: SessionLike,
  techId: string,
  dateFromIsoDate: string,
  dateToIsoDate: string,
): Promise<Appointment[]> {
  const from = new Date(`${dateFromIsoDate}T00:00:00.000Z`);
  const toExclusive = new Date(`${dateToIsoDate}T00:00:00.000Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  return dbRls(session, async (tx) =>
    tx
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.responsible_tech_id, techId),
          ne(appointments.status, 'cancelada'),
          gte(appointments.starts_at, from),
          lt(appointments.starts_at, toExclusive),
        ),
      )
      .orderBy(asc(appointments.starts_at)),
  );
}

/**
 * Inserts a new appointment. Catches Postgres unique-violation (23505) from
 * `appointments_tech_slot_uniq` and surfaces it as a typed `double_booked`
 * code — the action layer maps that to a 409-style toast.
 */
export async function createAppointment(
  session: SessionLike,
  clientId: string,
  payload: NewAppointment,
): Promise<CreateAppointmentResult> {
  const startsAtIso =
    payload.starts_at instanceof Date
      ? payload.starts_at.toISOString()
      : String(payload.starts_at);
  try {
    const id = await dbRls(session, async (tx) => {
      const [row] = await tx
        .insert(appointments)
        .values({
          client_id: clientId,
          responsible_tech_id: payload.responsible_tech_id ?? null,
          process_id: payload.process_id ?? null,
          title: payload.title ?? null,
          description: payload.description ?? null,
          starts_at: payload.starts_at,
          ends_at: payload.ends_at ?? null,
        })
        .returning({ id: appointments.id });
      // Same transaction: the audit row commits with the INSERT or rolls
      // back with it.
      await insertAuditLog(
        {
          action: AuditAction.AppointmentCreated,
          entity_type: 'appointment',
          entity_id: row.id,
          after: {
            client_id: clientId,
            responsible_tech_id: payload.responsible_tech_id ?? null,
            process_id: payload.process_id ?? null,
            starts_at: startsAtIso,
          },
        },
        { mode: 'tx', tx },
      );
      return row.id;
    });
    return { ok: true, id };
  } catch (err) {
    // postgres-js surfaces Postgres errors with a `code` property.
    const pgCode = (err as { code?: string } | null)?.code;
    const ref = randomUUID().slice(0, 8);
    // Audit the failure on a fresh service-mode connection — the
    // transaction that wrapped the failed INSERT has already rolled back,
    // so we can't reuse `tx` here. `service` mode bypasses RLS, which is
    // fine for an internal audit row.
    try {
      await insertAuditLog({
        action: AuditAction.AppointmentCreateFailed,
        entity_type: 'appointment',
        after: {
          ref,
          reason: pgCode ?? 'unknown',
          client_id: clientId,
          responsible_tech_id: payload.responsible_tech_id ?? null,
          process_id: payload.process_id ?? null,
          starts_at: startsAtIso,
        },
      });
    } catch (auditErr) {
      // Don't let an audit-log failure mask the original error — log and
      // press on so the caller still sees the real result.
      console.error(
        JSON.stringify({
          event: AuditEvent.AppointmentCreateFailed,
          ref,
          stage: 'audit_log_insert',
          error:
            auditErr instanceof Error ? auditErr.message : String(auditErr),
        }),
      );
    }
    if (pgCode === '23505') {
      return { ok: false, code: ResultCode.DoubleBooked };
    }
    // 42501 = insufficient_privilege: the RLS policy rejected the INSERT
    // (e.g. a stale session whose user_clients link is gone). Surfacing it
    // as `unauthorized` gives the user the "session expired" toast instead
    // of a generic server error (pront 1905 "red window" hardening).
    if (pgCode === '42501') {
      return { ok: false, code: ResultCode.Unauthorized };
    }
    console.error(
      JSON.stringify({
        event: AuditEvent.AppointmentCreateFailed,
        ref,
        clientId,
        techId: payload.responsible_tech_id,
        startsAt: startsAtIso,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, code: ResultCode.ServerError, ref };
  }
}
