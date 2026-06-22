import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResultCode } from '@/lib/constants/result-codes';

/**
 * Unit test for the messages service `markMessageReadForClient`. The service
 * imports the repository directly, so we substitute the repo module with a
 * hand-written fake (no DB, no Drizzle) via `vi.mock`. We assert the repo
 * result → domain `{ kind }` mapping and that `clientId` is forwarded.
 *
 * NOTE: hoisted fake so the factory below can reference it.
 */
const fakeRepo = vi.hoisted(() => ({
  markMessageRead: vi.fn(),
}));

vi.mock('@/modules/messages/messages.repo', () => fakeRepo);

import { markMessageReadForClient } from '@/modules/messages/messages.service';

const session = { sub: 'user-1' } as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('markMessageReadForClient', () => {
  it('maps repo ok → { kind: "ok" }', async () => {
    fakeRepo.markMessageRead.mockResolvedValue({ ok: true });
    const result = await markMessageReadForClient(session, 'client-1', 'msg-1');
    expect(result).toEqual({ kind: 'ok' });
  });

  it('maps repo NotFound → { kind: "not_found" }', async () => {
    fakeRepo.markMessageRead.mockResolvedValue({
      ok: false,
      code: ResultCode.NotFound,
    });
    const result = await markMessageReadForClient(session, 'client-1', 'msg-1');
    expect(result).toEqual({ kind: 'not_found' });
  });

  it('maps repo ServerError → { kind: "error", ref } (ref passthrough)', async () => {
    fakeRepo.markMessageRead.mockResolvedValue({
      ok: false,
      code: ResultCode.ServerError,
      ref: 'deadbeef',
    });
    const result = await markMessageReadForClient(session, 'client-1', 'msg-1');
    expect(result).toEqual({ kind: 'error', ref: 'deadbeef' });
  });

  it('forwards session, clientId and messageId unchanged to the repo', async () => {
    fakeRepo.markMessageRead.mockResolvedValue({ ok: true });
    await markMessageReadForClient(session, 'client-XYZ', 'msg-42');
    expect(fakeRepo.markMessageRead).toHaveBeenCalledTimes(1);
    expect(fakeRepo.markMessageRead).toHaveBeenCalledWith(
      session,
      'client-XYZ',
      'msg-42',
    );
  });
});
