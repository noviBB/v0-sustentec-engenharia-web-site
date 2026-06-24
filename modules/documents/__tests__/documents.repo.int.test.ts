import { randomUUID } from 'node:crypto';
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
 * Invariants (documents SPEC §"Test outline"):
 *   - tenant A never receives tenant B documents (even passing B's clientId);
 *   - soft-deleted rows excluded;
 *   - newest created_at first;
 *   - unknown client → [].
 */
type Repo = typeof import('@/modules/documents/documents.repo');

const world = newWorld();
let repo: Repo;
let a: Tenant;
let b: Tenant;
let aProc: string;
let bProc: string;

async function seedDoc(
  processId: string,
  name: string,
  createdAt: Date,
  deletedAt: Date | null = null,
) {
  const { getDbService } = await import('@/lib/db');
  const { processDocuments } = await import('@/lib/db/schema');
  await getDbService().insert(processDocuments).values({
    process_id: processId,
    name,
    url: `https://example.com/${name}`,
    created_at: createdAt,
    deleted_at: deletedAt,
  });
}

describeIntegration('documents.repo (RLS)', () => {
  beforeAll(async () => {
    repo = await import('@/modules/documents/documents.repo');
    a = await createTenant(world, 'Doc Tenant A');
    b = await createTenant(world, 'Doc Tenant B');
    aProc = await createProcess(a.clientId);
    bProc = await createProcess(b.clientId);
    await seedDoc(aProc, 'older', new Date('2026-01-01T00:00:00Z'));
    await seedDoc(aProc, 'newer', new Date('2026-02-01T00:00:00Z'));
    await seedDoc(aProc, 'gone', new Date('2026-03-01T00:00:00Z'), new Date());
    await seedDoc(bProc, 'b-doc', new Date('2026-01-15T00:00:00Z'));
  });
  afterAll(() => cleanupWorld(world));

  it('returns own docs newest-first, excluding soft-deleted', async () => {
    const rows = await repo.listDocumentsForClient(a.session, a.clientId);
    expect(rows.map((r) => r.name)).toEqual(['newer', 'older']);
  });

  it('cross-tenant clientId yields no rows', async () => {
    expect(
      await repo.listDocumentsForClient(a.session, b.clientId),
    ).toHaveLength(0);
  });

  it('unknown client returns []', async () => {
    expect(
      await repo.listDocumentsForClient(a.session, randomUUID()),
    ).toHaveLength(0);
  });
});
