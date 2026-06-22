import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { findStructuredLog } from '@/modules/_test-support/console-log';

/**
 * Unit test for the appointments service `createAppointment`. The service
 * imports the appointments repo, responsible-techs repo, and the email helper
 * directly; we substitute all three with hand-written fakes (no DB, no SMTP)
 * via `vi.mock`.
 *
 * Per the SPEC §"Test guidance (service)":
 *   - repo ok            → email sent with mapped fields, returns {kind:'ok',id}
 *   - repo DoubleBooked  → {kind:'double_booked'}, email NOT sent
 *   - repo Unauthorized  → {kind:'unauthorized'}, email NOT sent
 *   - repo ServerError   → {kind:'error', ref}, email NOT sent
 *   - email throws       → still {kind:'ok'}; failure logged (swallowed)
 */
const fakeApptRepo = vi.hoisted(() => ({ createAppointment: vi.fn() }));
const fakeTechRepo = vi.hoisted(() => ({
  getResponsibleTechName: vi.fn(),
  getResponsibleTechEmail: vi.fn(),
}));
const fakeEmail = vi.hoisted(() => ({ sendAppointmentCreatedEmail: vi.fn() }));

vi.mock('@/modules/appointments/appointments.repo', () => fakeApptRepo);
vi.mock('@/modules/appointments/responsible-techs.repo', () => fakeTechRepo);
vi.mock('@/lib/email/appointment-created', () => fakeEmail);

import { createAppointment } from '@/modules/appointments/appointments.service';

const deps = {
  session: { sub: 'auth-uid-1' } as never,
  clientId: 'client-1',
  clientName: 'Tenant One',
};

const input = {
  techId: 'tech-1',
  scheduled_for: '2026-07-01T13:00:00.000Z',
  subject: 'Reunião de licenciamento',
  notes: 'Trazer documentos',
} as never;

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

describe('createAppointment (service)', () => {
  it('on repo ok: returns {kind:"ok",id} and sends the notification email', async () => {
    fakeApptRepo.createAppointment.mockResolvedValue({ ok: true, id: 'appt-1' });
    fakeTechRepo.getResponsibleTechName.mockResolvedValue('Eng. Ana');
    fakeTechRepo.getResponsibleTechEmail.mockResolvedValue('ana@sustentec.com');
    fakeEmail.sendAppointmentCreatedEmail.mockResolvedValue(undefined);

    const result = await createAppointment(deps, input);
    expect(result).toEqual({ kind: 'ok', id: 'appt-1' });

    expect(fakeEmail.sendAppointmentCreatedEmail).toHaveBeenCalledTimes(1);
    const params = fakeEmail.sendAppointmentCreatedEmail.mock.calls[0]![0];
    expect(params).toMatchObject({
      clientName: 'Tenant One',
      techName: 'Eng. Ana',
      techEmail: 'ana@sustentec.com',
      startsAtIso: '2026-07-01T13:00:00.000Z',
      subject: 'Reunião de licenciamento',
      notes: 'Trazer documentos',
    });
  });

  it('on repo DoubleBooked: maps to {kind:"double_booked"} and sends no email', async () => {
    fakeApptRepo.createAppointment.mockResolvedValue({
      ok: false,
      code: ResultCode.DoubleBooked,
    });
    const result = await createAppointment(deps, input);
    expect(result).toEqual({ kind: 'double_booked' });
    expect(fakeEmail.sendAppointmentCreatedEmail).not.toHaveBeenCalled();
  });

  it('on repo Unauthorized: maps to {kind:"unauthorized"} and sends no email', async () => {
    fakeApptRepo.createAppointment.mockResolvedValue({
      ok: false,
      code: ResultCode.Unauthorized,
    });
    const result = await createAppointment(deps, input);
    expect(result).toEqual({ kind: 'unauthorized' });
    expect(fakeEmail.sendAppointmentCreatedEmail).not.toHaveBeenCalled();
  });

  it('on repo ServerError: maps to {kind:"error", ref} and sends no email', async () => {
    fakeApptRepo.createAppointment.mockResolvedValue({
      ok: false,
      code: ResultCode.ServerError,
      ref: 'cafef00d',
    });
    const result = await createAppointment(deps, input);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') throw new Error('expected error');
    expect(result.ref).toBe('cafef00d');
    expect(fakeEmail.sendAppointmentCreatedEmail).not.toHaveBeenCalled();
  });

  it('swallows an email failure: booking still returns {kind:"ok"} and logs the failure', async () => {
    fakeApptRepo.createAppointment.mockResolvedValue({ ok: true, id: 'appt-9' });
    fakeTechRepo.getResponsibleTechName.mockResolvedValue('Eng. Ana');
    fakeTechRepo.getResponsibleTechEmail.mockResolvedValue('ana@sustentec.com');
    fakeEmail.sendAppointmentCreatedEmail.mockRejectedValue(
      new Error('smtp down'),
    );

    const result = await createAppointment(deps, input);
    expect(result).toEqual({ kind: 'ok', id: 'appt-9' });

    const logged = findStructuredLog(errSpy.mock.calls);
    expect(logged?.event).toBe(AuditEvent.AppointmentNotifyEmailFailed);
  });
});
