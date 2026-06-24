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
