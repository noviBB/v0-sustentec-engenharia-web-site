import { afterAll, beforeAll, expect, it } from 'vitest';

import {
  cleanupWorld,
  createTenant,
  describeIntegration,
  newWorld,
  type Tenant,
} from '@/modules/_test-support/integration';

/**
 * RLS invariants (clients SPEC §"Integration (RLS)"):
 *   - updateClient mutates only the caller own tenant row;
 *   - an id outside scope returns null (UPDATE/SELECT affects 0 rows);
 *   - getClientByIdRls returns null cross-tenant.
 *
 * Repos imported lazily so a skipped run never loads `@/lib/db`.
 */
type Repo = typeof import('@/modules/clients/clients.repo');

const world = newWorld();
let repo: Repo;
let a: Tenant;
let b: Tenant;

describeIntegration('clients.repo (RLS)', () => {
  beforeAll(async () => {
    repo = await import('@/modules/clients/clients.repo');
    a = await createTenant(world, 'Clients Tenant A');
    b = await createTenant(world, 'Clients Tenant B');
  });
  afterAll(() => cleanupWorld(world));

  it('getClientByIdRls returns own row but null cross-tenant', async () => {
    const own = await repo.getClientByIdRls(a.session, a.clientId);
    expect(own?.id).toBe(a.clientId);

    const cross = await repo.getClientByIdRls(a.session, b.clientId);
    expect(cross).toBeNull();
  });

  it('updateClient patches the caller own row and returns it', async () => {
    const updated = await repo.updateClient(a.session, a.clientId, {
      contact_name: 'Patched Name',
      address_city: 'São Paulo',
    });
    expect(updated?.id).toBe(a.clientId);
    expect(updated?.contact_name).toBe('Patched Name');
  });

  it('updateClient on an out-of-scope id returns null (RLS = 0 rows)', async () => {
    const result = await repo.updateClient(a.session, b.clientId, {
      contact_name: 'Should Not Apply',
    });
    expect(result).toBeNull();

    const bRow = await repo.getClientByIdRls(b.session, b.clientId);
    expect(bRow?.contact_name).not.toBe('Should Not Apply');
  });
});
