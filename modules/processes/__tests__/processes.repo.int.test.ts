import { afterAll, beforeAll, expect, it } from 'vitest';

import {
  cleanupWorld,
  createProcess,
  createTenant,
  describeIntegration,
  newWorld,
  type Tenant,
} from '@/modules/_test-support/integration';

/**
 * RLS invariants (processes SPEC §"Integration (RLS)"):
 *   - cross-tenant getProcessById → null;
 *   - listProcessesForClient only returns own-tenant rows;
 *   - listBuckets drops `arquivado` and soft-deleted rows.
 */
type Repo = typeof import('@/modules/processes/processes.repo');

const world = newWorld();
let repo: Repo;
let a: Tenant;
let b: Tenant;
let aProcAndamento: string;
let aProcArquivado: string;
let aProcDeleted: string;
let bProc: string;

describeIntegration('processes.repo (RLS)', () => {
  beforeAll(async () => {
    repo = await import('@/modules/processes/processes.repo');
    a = await createTenant(world, 'Proc Tenant A');
    b = await createTenant(world, 'Proc Tenant B');
    aProcAndamento = await createProcess(a.clientId, { status: 'andamento' });
    aProcArquivado = await createProcess(a.clientId, { status: 'arquivado' });
    aProcDeleted = await createProcess(a.clientId, {
      status: 'andamento',
      deleted_at: new Date(),
    });
    bProc = await createProcess(b.clientId, { status: 'andamento' });
  });
  afterAll(() => cleanupWorld(world));

  it('listProcessesForClient returns only own-tenant, non-deleted rows', async () => {
    const rows = await repo.listProcessesForClient(a.session, a.clientId);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(aProcAndamento);
    expect(ids).toContain(aProcArquivado); // not bucket-filtered at this layer
    expect(ids).not.toContain(aProcDeleted); // deleted_at IS NULL filter
    expect(ids).not.toContain(bProc); // cross-tenant
  });

  it('getProcessById is null cross-tenant even with a valid id', async () => {
    expect(
      (await repo.getProcessById(a.session, a.clientId, aProcAndamento))?.id,
    ).toBe(aProcAndamento);
    expect(await repo.getProcessById(a.session, a.clientId, bProc)).toBeNull();
  });

  it('listBuckets drops arquivado and soft-deleted', async () => {
    const buckets = await repo.listBuckets(a.session, a.clientId);
    const all = [
      ...buckets.andamento,
      ...buckets.acompanhamento,
      ...buckets.finalizado,
    ].map((r) => r.id);
    expect(all).toContain(aProcAndamento);
    expect(all).not.toContain(aProcArquivado);
    expect(all).not.toContain(aProcDeleted);
    expect(all).not.toContain(bProc);
  });
});
