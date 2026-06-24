import { afterAll, beforeAll, expect, it } from 'vitest';

import { ProcessTaskPriority, ProcessTaskStatus } from '@/lib/db/enums';
import {
  cleanupWorld,
  createProcess,
  createTenant,
  describeIntegration,
  newWorld,
  type Tenant,
} from '@/modules/_test-support/integration';

/**
 * tasks SPEC §"Test outline":
 *   - RLS isolation: A never sees B's tasks;
 *   - ensurePaymentOverdueTask idempotency: 1st → created, immediate 2nd → not;
 *   - key release after closing/archiving/soft-deleting;
 *   - distinct installmentNo → distinct tasks;
 *   - created row shape: status='aberta', priority='alta', notion_page_id=null.
 */
import type * as TasksRepo from '@/modules/tasks/tasks.repo';

type Repo = typeof TasksRepo;

const world = newWorld();
let repo: Repo;
let a: Tenant;
let b: Tenant;
let aProc: string;
let bProc: string;

const overdueTitle = (n: number) => `Pagamento da parcela ${n} em atraso`;

async function tasksWithTitle(processId: string, n: number) {
  const { getDbService } = await import('@/lib/db');
  const { processTasks } = await import('@/lib/db/schema');
  const { and, eq, isNull } = await import('drizzle-orm');
  return getDbService()
    .select()
    .from(processTasks)
    .where(
      and(
        eq(processTasks.process_id, processId),
        eq(processTasks.title, overdueTitle(n)),
        isNull(processTasks.deleted_at),
      ),
    );
}

describeIntegration('tasks.repo (RLS + ensurePaymentOverdueTask)', () => {
  beforeAll(async () => {
    repo = await import('@/modules/tasks/tasks.repo');
    a = await createTenant(world, 'Task Tenant A');
    b = await createTenant(world, 'Task Tenant B');
    aProc = await createProcess(a.clientId);
    bProc = await createProcess(b.clientId);
  });
  afterAll(() => cleanupWorld(world));

  it('listTasksForClient: tenant A never sees tenant B tasks', async () => {
    const { getDbService } = await import('@/lib/db');
    const { processTasks } = await import('@/lib/db/schema');
    await getDbService().insert(processTasks).values({
      process_id: bProc,
      title: 'B private task',
      status: ProcessTaskStatus.Aberta,
      priority: ProcessTaskPriority.Media,
    });
    const aRows = await repo.listTasksForClient(a.session, a.clientId);
    expect(aRows.some((t) => t.title === 'B private task')).toBe(false);

    const crossScoped = await repo.listTasksForClient(a.session, b.clientId);
    expect(crossScoped).toHaveLength(0);
  });

  it('is idempotent: first call creates, immediate second does not', async () => {
    const first = await repo.ensurePaymentOverdueTask(aProc, 1);
    expect(first).toEqual({ created: true });

    const second = await repo.ensurePaymentOverdueTask(aProc, 1);
    expect(second).toEqual({ created: false });

    const rows = await tasksWithTitle(aProc, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe(ProcessTaskStatus.Aberta);
    expect(rows[0]!.priority).toBe(ProcessTaskPriority.Alta);
    expect(rows[0]!.notion_page_id).toBeNull();
  });

  it('releases the idempotency key when the task is closed', async () => {
    const { getDbService } = await import('@/lib/db');
    const { processTasks } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');
    await getDbService()
      .update(processTasks)
      .set({ status: ProcessTaskStatus.Concluida })
      .where(
        and(
          eq(processTasks.process_id, aProc),
          eq(processTasks.title, overdueTitle(1)),
        ),
      );

    const again = await repo.ensurePaymentOverdueTask(aProc, 1);
    expect(again).toEqual({ created: true });

    const open = (await tasksWithTitle(aProc, 1)).filter(
      (t) =>
        t.status !== ProcessTaskStatus.Concluida &&
        t.status !== ProcessTaskStatus.Arquivada,
    );
    expect(open).toHaveLength(1);
  });

  it('distinct installment numbers produce distinct tasks', async () => {
    const r2 = await repo.ensurePaymentOverdueTask(aProc, 2);
    expect(r2).toEqual({ created: true });
    const rows = await tasksWithTitle(aProc, 2);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe(overdueTitle(2));
  });
});
