import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultKind } from '@/lib/enums';
import { findStructuredLog } from '@/modules/_test-support/console-log';

/**
 * Unit test for the marketing contact service `submitContactSubmission`.
 * The service imports the anon-insert repo directly; we replace it with a
 * hand-written fake (no DB) via `vi.mock`. Per the SPEC, the service:
 *   - returns { kind: 'ok' } on a successful insert,
 *   - returns { kind: 'error', ref } (8-char ref) + logs ContactSubmitFailed
 *     when the repo throws,
 *   - never throws.
 *
 * RateLimited and Validation are CONTROLLER concerns (decided before the
 * service is invoked) — see contact.controller.int/e2e coverage; the service
 * never sees them.
 */
const fakeRepo = vi.hoisted(() => ({
  insertContactSubmission: vi.fn(),
}));

vi.mock('@/modules/marketing/contact.repo', () => fakeRepo);

import { submitContactSubmission } from '@/modules/marketing/contact.service';

const data = {
  name: 'Maria',
  email: 'maria@example.com',
  phone: undefined,
  message: 'Olá, gostaria de um orçamento.',
};
const ctx = { ipHash: 'abc123', userAgent: 'jsdom' };

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errSpy.mockRestore();
});

describe('submitContactSubmission', () => {
  it('returns { kind: "ok" } on a successful anon insert', async () => {
    fakeRepo.insertContactSubmission.mockResolvedValue({ id: 'row-1' });
    const result = await submitContactSubmission(data, ctx);
    expect(result).toEqual({ kind: ResultKind.Ok });
    expect(fakeRepo.insertContactSubmission).toHaveBeenCalledTimes(1);
  });

  it('forwards source=marketing_site + ip_hash + user_agent to the repo', async () => {
    fakeRepo.insertContactSubmission.mockResolvedValue({ id: 'row-1' });
    await submitContactSubmission(data, ctx);
    const arg = fakeRepo.insertContactSubmission.mock.calls[0]![0];
    expect(arg).toMatchObject({
      name: 'Maria',
      email: 'maria@example.com',
      message: 'Olá, gostaria de um orçamento.',
      ip_hash: 'abc123',
      user_agent: 'jsdom',
      source: 'marketing_site',
    });
  });

  it('returns { kind: "error", ref } with an 8-char ref and logs on repo throw', async () => {
    fakeRepo.insertContactSubmission.mockRejectedValue(new Error('db down'));
    const result = await submitContactSubmission(data, ctx);
    expect(result.kind).toBe(ResultKind.Error);
    if (result.kind !== ResultKind.Error) throw new Error('expected error');
    expect(result.ref).toHaveLength(8);

    // Structured audit line emitted to stderr (JSON.stringify'd payload).
    expect(errSpy).toHaveBeenCalledTimes(1);
    const payload = findStructuredLog(errSpy.mock.calls);
    expect(payload?.event).toBe(AuditEvent.ContactSubmitFailed);
    expect(payload?.ref).toBe(result.ref);
  });

  it('never throws even when the repo rejects', async () => {
    fakeRepo.insertContactSubmission.mockRejectedValue(new Error('boom'));
    await expect(submitContactSubmission(data, ctx)).resolves.toBeDefined();
  });
});
