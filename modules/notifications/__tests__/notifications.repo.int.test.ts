import { afterAll, beforeAll, expect, it } from 'vitest';

import {
  cleanupWorld,
  createProcess,
  createTenant,
  describeIntegration,
  newWorld,
  type Tenant,
} from '@/modules/_test-support/integration';
import type * as NotificationsRepo from '@/modules/notifications/notifications.repo';

type Repo = typeof NotificationsRepo;

const world = newWorld();
let repo: Repo;
let a: Tenant;
let processId: string;

// Service-mode open pendência (process_task) with a controllable created_at.
async function seedOpenTask(pid: string, createdAt: Date) {
  const { getDbService } = await import('@/lib/db');
  const { processTasks } = await import('@/lib/db/schema');
  const { ProcessTaskStatus } = await import('@/lib/db/enums');
  await getDbService()
    .insert(processTasks)
    .values({
      process_id: pid,
      title: 'Pendência',
      status: ProcessTaskStatus.Aberta,
      created_at: createdAt,
    });
}

describeIntegration('notifications.repo (RLS)', () => {
  beforeAll(async () => {
    repo = await import('@/modules/notifications/notifications.repo');
    a = await createTenant(world, 'Notif Tenant A');
    processId = await createProcess(a.clientId);
    await seedOpenTask(processId, new Date('2020-01-01T00:00:00.000Z'));
  });
  afterAll(() => cleanupWorld(world));

  it('counts all open pendências as unseen when never opened', async () => {
    expect(await repo.countUnseenPendencias(a.session, a.clientId)).toBe(1);
  });

  it('markPendenciasSeen stamps the cursor and clears the unseen count', async () => {
    await repo.markPendenciasSeen(a.session, a.clientId);

    const { getDbService } = await import('@/lib/db');
    const { pendenciaSeen } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');
    const [row] = await getDbService()
      .select({ seen: pendenciaSeen.seen_at })
      .from(pendenciaSeen)
      .where(
        and(
          eq(pendenciaSeen.user_id, a.userId),
          eq(pendenciaSeen.client_id, a.clientId),
        ),
      );
    expect(row?.seen).toBeInstanceOf(Date);

    expect(await repo.countUnseenPendencias(a.session, a.clientId)).toBe(0);
  });

  it('counts a pendência created after the cursor as unseen', async () => {
    await seedOpenTask(processId, new Date(Date.now() + 60_000));
    expect(await repo.countUnseenPendencias(a.session, a.clientId)).toBe(1);
  });
});

describeIntegration('notifications.repo process_pendencia_seen (RLS)', () => {
  const w = newWorld();
  let r: Repo;
  let t1: Tenant;
  let t2: Tenant;
  let p1: string;
  let p2: string;

  function countFor(rows: { process_id: string; count: number }[], pid: string) {
    return rows.find((row) => row.process_id === pid)?.count ?? 0;
  }

  beforeAll(async () => {
    r = await import('@/modules/notifications/notifications.repo');
    t1 = await createTenant(w, 'Notif PerProc T1');
    t2 = await createTenant(w, 'Notif PerProc T2');
    p1 = await createProcess(t1.clientId);
    p2 = await createProcess(t1.clientId);
    // p1: 2 open tasks, p2: 1 open task — all created in the past.
    const past = new Date('2020-01-01T00:00:00.000Z');
    await seedOpenTask(p1, past);
    await seedOpenTask(p1, past);
    await seedOpenTask(p2, past);
  });
  afterAll(() => cleanupWorld(w));

  it('counts all open tasks per process when never seen', async () => {
    const rows = await r.countUnseenPendenciasByProcess(t1.session, t1.clientId);
    expect(countFor(rows, p1)).toBe(2);
    expect(countFor(rows, p2)).toBe(1);
  });

  it('markProcessPendenciasSeen clears only the marked process', async () => {
    await r.markProcessPendenciasSeen(t1.session, p1);

    const rows = await r.countUnseenPendenciasByProcess(t1.session, t1.clientId);
    expect(countFor(rows, p1)).toBe(0);
    expect(countFor(rows, p2)).toBe(1);
    // p1 should not appear at all (filtered out when count drops to 0).
    expect(rows.some((row) => row.process_id === p1)).toBe(false);
  });

  it('counts a task created after the per-process cursor as unseen again', async () => {
    await seedOpenTask(p1, new Date(Date.now() + 60_000));
    const rows = await r.countUnseenPendenciasByProcess(t1.session, t1.clientId);
    expect(countFor(rows, p1)).toBe(1);
  });

  it('persists the seen row scoped to the marking user', async () => {
    const { getDbService } = await import('@/lib/db');
    const { processPendenciaSeen } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');
    const [row] = await getDbService()
      .select({ seen: processPendenciaSeen.seen_at })
      .from(processPendenciaSeen)
      .where(
        and(
          eq(processPendenciaSeen.user_id, t1.userId),
          eq(processPendenciaSeen.process_id, p1),
        ),
      );
    expect(row?.seen).toBeInstanceOf(Date);
  });

  it('isolates rows by user: a second tenant sees none of t1 seen rows', async () => {
    const { getDbService } = await import('@/lib/db');
    const { processPendenciaSeen } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    // t2 has its own (different) processes; it has marked nothing, so under
    // RLS t2 reads zero process_pendencia_seen rows.
    const { dbRls } = await import('@/lib/db');
    const visible = await dbRls(t2.session, async (tx) =>
      tx
        .select({ process_id: processPendenciaSeen.process_id })
        .from(processPendenciaSeen),
    );
    expect(visible).toHaveLength(0);

    // Service-mode sanity check: the row genuinely exists for t1's user.
    const all = await getDbService()
      .select({ user_id: processPendenciaSeen.user_id })
      .from(processPendenciaSeen)
      .where(eq(processPendenciaSeen.process_id, p1));
    expect(all.every((x) => x.user_id === t1.userId)).toBe(true);
  });
});
