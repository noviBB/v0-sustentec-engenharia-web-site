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
 * Invariants (milestones SPEC §"Test outline"):
 *   - tenant A never sees tenant B milestones;
 *   - every row carries slug/label_pt/ordinal from its kind (join);
 *   - ordered by process_id, then kind ordinal ASC;
 *   - checked/checked_at pass through (null when unchecked).
 */
import type * as MilestonesRepo from '@/modules/milestones/milestones.repo';

type Repo = typeof MilestonesRepo;

const world = newWorld();
const kindIds: string[] = [];
let repo: Repo;
let a: Tenant;
let b: Tenant;
let aProc: string;
let bProc: string;
let kind1: string;
let kind2: string;

async function seedKind(slug: string, label: string, ordinal: number) {
  const { getDbService } = await import('@/lib/db');
  const { processMilestoneKinds } = await import('@/lib/db/schema');
  const [row] = await getDbService()
    .insert(processMilestoneKinds)
    .values({ slug, label_pt: label, ordinal })
    .returning({ id: processMilestoneKinds.id });
  kindIds.push(row!.id);
  return row!.id;
}

async function seedMilestone(
  processId: string,
  kindId: string,
  checked: boolean,
  checkedAt: Date | null,
) {
  const { getDbService } = await import('@/lib/db');
  const { processMilestones } = await import('@/lib/db/schema');
  await getDbService().insert(processMilestones).values({
    process_id: processId,
    kind_id: kindId,
    checked,
    checked_at: checkedAt,
  });
}

describeIntegration('milestones.repo (RLS)', () => {
  beforeAll(async () => {
    repo = await import('@/modules/milestones/milestones.repo');
    a = await createTenant(world, 'Mil Tenant A');
    b = await createTenant(world, 'Mil Tenant B');
    aProc = await createProcess(a.clientId);
    bProc = await createProcess(b.clientId);
    const tag = randomUUID().slice(0, 6);
    // ordinal-2 kind seeded FIRST to prove ordering is by ordinal, not insert order.
    kind2 = await seedKind(`k2-${tag}`, 'Segunda etapa', 2);
    kind1 = await seedKind(`k1-${tag}`, 'Primeira etapa', 1);
    await seedMilestone(aProc, kind2, false, null);
    await seedMilestone(aProc, kind1, true, new Date('2026-01-01T00:00:00Z'));
    await seedMilestone(bProc, kind1, true, new Date());
  });

  afterAll(async () => {
    await cleanupWorld(world);
    // milestone kinds are global, not client-scoped — clean them explicitly.
    if (kindIds.length) {
      const { getDbService } = await import('@/lib/db');
      const { processMilestoneKinds } = await import('@/lib/db/schema');
      const { inArray } = await import('drizzle-orm');
      await getDbService()
        .delete(processMilestoneKinds)
        .where(inArray(processMilestoneKinds.id, kindIds));
    }
  });

  it('returns own milestones joined with kind, ordered by ordinal', async () => {
    const rows = await repo.listMilestonesForClient(a.session, a.clientId);
    const mine = rows.filter((r) => r.process_id === aProc);
    expect(mine).toHaveLength(2);
    // ordered by kind ordinal ASC (kind2/ordinal=2 was seeded first).
    expect(mine.map((r) => r.ordinal)).toEqual([1, 2]);
    // every row carries slug/label_pt/ordinal from the joined kind.
    expect(mine.map((r) => r.slug)).toEqual([
      expect.stringMatching(/^k1-/),
      expect.stringMatching(/^k2-/),
    ]);
    // label_pt + checked state pass through.
    expect(mine[0]!.label_pt).toBe('Primeira etapa');
    expect(mine[0]!.checked).toBe(true);
    expect(mine[0]!.checked_at).not.toBeNull();
    expect(mine[1]!.checked).toBe(false);
    expect(mine[1]!.checked_at).toBeNull();
  });

  it('cross-tenant clientId yields no rows', async () => {
    expect(
      await repo.listMilestonesForClient(a.session, b.clientId),
    ).toHaveLength(0);
  });
});
