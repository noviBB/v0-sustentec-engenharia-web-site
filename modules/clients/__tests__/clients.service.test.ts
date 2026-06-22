import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { findStructuredLog } from '@/modules/_test-support/console-log';

/**
 * Unit test for the clients service `updateClientCadastral`. The service
 * imports the repo `updateClient` and the shared `insertAuditLog` repo
 * directly, so we substitute both modules with hand-written fakes (no DB, no
 * Drizzle) via `vi.mock`.
 *
 * Per the SPEC §"Test seams":
 *   - repo null  → { kind: 'not_found' } and NO audit write,
 *   - repo row   → { kind: 'ok' } + ONE audit row, before = the 8 cadastral
 *                  fields read off `client`, after = patch,
 *   - dependency throws → { kind: 'error', ref } (8-char) + logged.
 */
const fakeRepo = vi.hoisted(() => ({ updateClient: vi.fn() }));
const fakeAudit = vi.hoisted(() => ({ insertAuditLog: vi.fn() }));

vi.mock('@/modules/clients/clients.repo', () => fakeRepo);
vi.mock('@/lib/db/auditLog', () => fakeAudit);

import { updateClientCadastral } from '@/modules/clients/clients.service';

const session = { sub: 'auth-uid-1' } as never;

// A full client row; only the 8 cadastral fields seed the audit `before`.
// Typed as a plain record so we can spread it; cast to the repo `Client` type
// at the service call sites.
const client: Record<string, unknown> = {
  id: 'client-1',
  name: 'Tenant One',
  contact_name: 'Old Name',
  contact_role: 'Old Role',
  contact_email: 'old@example.com',
  contact_phone: '111',
  address_street: 'Old St',
  address_city: 'Old City',
  address_state: 'OS',
  address_postal_code: '00000',
  // non-cadastral noise that must NOT appear in the audit before:
  notion_page_id: 'np-1',
  deleted_at: null,
};

const patch = {
  contact_name: 'New Name',
  contact_email: 'new@example.com',
};

const CADASTRAL_FIELDS = [
  'contact_name',
  'contact_role',
  'contact_email',
  'contact_phone',
  'address_street',
  'address_city',
  'address_state',
  'address_postal_code',
] as const;

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

describe('updateClientCadastral', () => {
  it('returns { kind: "not_found" } and writes no audit row when repo returns null', async () => {
    fakeRepo.updateClient.mockResolvedValue(null);
    const result = await updateClientCadastral({
      session,
      client: client as never,
      actorId: 'auth-uid-1',
      patch,
    });
    expect(result).toEqual({ kind: 'not_found' });
    expect(fakeAudit.insertAuditLog).not.toHaveBeenCalled();
  });

  it('returns ok and writes one audit row with before=8 fields, after=patch', async () => {
    fakeRepo.updateClient.mockResolvedValue({ ...client, ...patch });
    fakeAudit.insertAuditLog.mockResolvedValue(undefined);

    const result = await updateClientCadastral({
      session,
      client: client as never,
      actorId: 'auth-uid-1',
      patch,
    });
    expect(result).toEqual({ kind: 'ok' });

    // repo called per SPEC: updateClient(session, client.id, patch).
    expect(fakeRepo.updateClient).toHaveBeenCalledWith(session, 'client-1', patch);

    expect(fakeAudit.insertAuditLog).toHaveBeenCalledTimes(1);
    const [entry, scope] = fakeAudit.insertAuditLog.mock.calls[0]!;
    expect(entry).toMatchObject({
      action: AuditAction.ClientUpdated,
      entity_type: 'client',
      entity_id: 'client-1',
      actor_id: 'auth-uid-1',
      after: patch,
    });
    // `before` carries exactly the 8 cadastral fields off the client row.
    expect(Object.keys(entry.before).sort()).toEqual(
      [...CADASTRAL_FIELDS].sort(),
    );
    for (const f of CADASTRAL_FIELDS) {
      expect(entry.before[f]).toBe((client as Record<string, unknown>)[f]);
    }
    // and must NOT leak non-cadastral columns.
    expect(entry.before).not.toHaveProperty('notion_page_id');
    expect(entry.before).not.toHaveProperty('id');
    // audit written in the same rls mode + session as the data change.
    expect(scope).toEqual({ mode: 'rls', session });
  });

  it('returns { kind: "error", ref } (8-char) and logs when a dependency throws', async () => {
    fakeRepo.updateClient.mockResolvedValue({ ...client, ...patch });
    fakeAudit.insertAuditLog.mockRejectedValue(new Error('audit boom'));

    const result = await updateClientCadastral({
      session,
      client: client as never,
      actorId: 'auth-uid-1',
      patch,
    });
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') throw new Error('expected error');
    expect(result.ref).toHaveLength(8);

    const payload = findStructuredLog(errSpy.mock.calls);
    expect(payload?.event).toBe(AuditEvent.ClientUpdateFailed);
    expect(payload?.ref).toBe(result.ref);
  });
});
