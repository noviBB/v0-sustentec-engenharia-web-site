import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionLike } from '@/lib/db';
import { ResultKind } from '@/lib/enums';

// Fake repo: an in-memory store of per-process open-task counts plus a per
// (user, process) seen set. markProcessPendenciasSeen marks a process seen
// (drops it to 0); countUnseenPendenciasByProcess returns only processes with
// a non-zero unseen count, grouped by process_id.
const store = vi.hoisted(() => ({
  openByProcess: new Map<string, number>(),
  seen: new Set<string>(),
}));

const fakeRepo = vi.hoisted(() => ({
  markProcessPendenciasSeen: vi.fn((_session: unknown, processId: string) => {
    store.seen.add(processId);
    return Promise.resolve();
  }),
  countUnseenPendenciasByProcess: vi.fn(() => {
    const out: { process_id: string; count: number }[] = [];
    for (const [processId, count] of store.openByProcess) {
      const unseen = store.seen.has(processId) ? 0 : count;
      if (unseen > 0) out.push({ process_id: processId, count: unseen });
    }
    return Promise.resolve(out);
  }),
}));

vi.mock('@/modules/notifications/notifications.repo', () => fakeRepo);

import {
  markProcessPendenciasSeen,
  type MarkProcessPendenciasSeenResult,
} from '@/modules/notifications/notifications.service';

const session: SessionLike = { sub: 'user-1' };
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  store.openByProcess = new Map([
    [A, 3],
    [B, 2],
  ]);
  store.seen = new Set();
});

describe('markProcessPendenciasSeen (service)', () => {
  it('returns { kind: "ok" } and delegates to the repo with the processId', async () => {
    const result: MarkProcessPendenciasSeenResult =
      await markProcessPendenciasSeen(session, A);
    expect(result).toEqual({ kind: ResultKind.Ok });
    expect(fakeRepo.markProcessPendenciasSeen).toHaveBeenCalledWith(session, A);
  });

  it('marking process A seen drops A to 0 while B is unaffected', async () => {
    await markProcessPendenciasSeen(session, A);

    const rows = await fakeRepo.countUnseenPendenciasByProcess();
    // A no longer appears (count 0, filtered out); B still has its 2 unseen.
    expect(rows).toEqual([{ process_id: B, count: 2 }]);
  });

  it('returns one row per process with >=1 unseen open task before any seen', async () => {
    const rows = await fakeRepo.countUnseenPendenciasByProcess();
    expect(rows).toEqual([
      { process_id: A, count: 3 },
      { process_id: B, count: 2 },
    ]);
  });

  it('returns { kind: "error", ref } when the repo throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeRepo.markProcessPendenciasSeen.mockRejectedValueOnce(
      new Error('boom'),
    );

    const result = await markProcessPendenciasSeen(session, A);

    expect(result.kind).toBe(ResultKind.Error);
    if (result.kind === ResultKind.Error) {
      expect(result.ref).toHaveLength(8);
    }
    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });
});
