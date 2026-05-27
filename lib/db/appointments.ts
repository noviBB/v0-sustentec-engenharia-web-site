import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, lt, ne } from 'drizzle-orm';
import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { db } from './index';
import { appointments } from './schema';

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
  | { ok: false; code: ResultCode.ServerError; ref: string };

export async function listAppointmentsForClient(
  clientId: string,
): Promise<Appointment[]> {
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.client_id, clientId))
    .orderBy(asc(appointments.starts_at));
}

/**
 * Lists a tech's non-cancelled appointments inside the inclusive date
 * range — used by the scheduling UI to grey out taken slots.
 */
export async function listAppointmentsForTech(
  techId: string,
  dateFromIsoDate: string,
  dateToIsoDate: string,
): Promise<Appointment[]> {
  const from = new Date(`${dateFromIsoDate}T00:00:00.000Z`);
  const toExclusive = new Date(`${dateToIsoDate}T00:00:00.000Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  return db
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
    .orderBy(asc(appointments.starts_at));
}

/**
 * Inserts a new appointment. Catches Postgres unique-violation (23505) from
 * `appointments_tech_slot_uniq` and surfaces it as a typed `double_booked`
 * code — the action layer maps that to a 409-style toast.
 */
export async function createAppointment(
  clientId: string,
  payload: NewAppointment,
): Promise<CreateAppointmentResult> {
  try {
    const [row] = await db
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
    return { ok: true, id: row.id };
  } catch (err) {
    // postgres-js surfaces Postgres errors with a `code` property.
    const code = (err as { code?: string } | null)?.code;
    if (code === '23505') {
      return { ok: false, code: ResultCode.DoubleBooked };
    }
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: AuditEvent.AppointmentCreateFailed,
        ref,
        clientId,
        techId: payload.responsible_tech_id,
        startsAt:
          payload.starts_at instanceof Date
            ? payload.starts_at.toISOString()
            : String(payload.starts_at),
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, code: ResultCode.ServerError, ref };
  }
}
