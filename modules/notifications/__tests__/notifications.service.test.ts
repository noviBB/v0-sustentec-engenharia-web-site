import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionLike } from '@/lib/db';
import { ResultKind } from '@/lib/enums';

const fakeRepo = vi.hoisted(() => ({
  markPendenciasSeen: vi.fn(),
}));

vi.mock('@/modules/notifications/notifications.repo', () => fakeRepo);

import { markPendenciasSeen } from '@/modules/notifications/notifications.service';

const session: SessionLike = { sub: 'user-1' };
const clientId = 'client-1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('markPendenciasSeen (service)', () => {
  it('returns { kind: "ok" } when the repo succeeds', async () => {
    fakeRepo.markPendenciasSeen.mockResolvedValue(undefined);
    const result = await markPendenciasSeen(session, clientId);
    expect(result).toEqual({ kind: ResultKind.Ok });
    expect(fakeRepo.markPendenciasSeen).toHaveBeenCalledWith(session, clientId);
  });

  it('returns { kind: "error", ref } when the repo throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeRepo.markPendenciasSeen.mockRejectedValue(new Error('boom'));

    const result = await markPendenciasSeen(session, clientId);

    expect(result.kind).toBe(ResultKind.Error);
    if (result.kind === ResultKind.Error) {
      expect(result.ref).toHaveLength(8);
    }
    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });
});
