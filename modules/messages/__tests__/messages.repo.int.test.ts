import { afterAll, beforeAll, expect, it } from 'vitest';

import { ResultCode } from '@/lib/constants/result-codes';
import {
  cleanupWorld,
  createTenant,
  describeIntegration,
  newWorld,
  type Tenant,
} from '@/modules/_test-support/integration';

/**
 * RLS invariants (messages SPEC §"Test seams: Repo"):
 *   - list/count only see own-tenant rows;
 *   - markMessageRead returns NotFound for a cross-tenant id (no existence leak).
 */
type Repo = typeof import('@/modules/messages/messages.repo');

const world = newWorld();
let repo: Repo;
let a: Tenant;
let b: Tenant;
let bMessageId: string;

async function seedMessage(clientId: string, opts: { read?: boolean } = {}) {
  const { getDbService } = await import('@/lib/db');
  const { messages } = await import('@/lib/db/schema');
  const [row] = await getDbService()
    .insert(messages)
    .values({
      client_id: clientId,
      direction: 'inbound',
      subject: 'Hello',
      body: 'Integration message',
      read: opts.read ?? false,
      sent_at: new Date(),
    })
    .returning({ id: messages.id });
  return row!.id;
}

beforeAll(async () => {
  repo = await import('@/modules/messages/messages.repo');
  a = await createTenant(world, 'Msg Tenant A');
  b = await createTenant(world, 'Msg Tenant B');
  await seedMessage(a.clientId, { read: false });
  await seedMessage(a.clientId, { read: true });
  bMessageId = await seedMessage(b.clientId, { read: false });
});
afterAll(() => cleanupWorld(world));

describeIntegration('messages.repo (RLS)', () => {
  it('listMessagesForClient sees only own-tenant rows', async () => {
    const aRows = await repo.listMessagesForClient(a.session, a.clientId);
    expect(aRows.length).toBe(2);
    expect(aRows.every((r) => r.client_id === a.clientId)).toBe(true);

    const cross = await repo.listMessagesForClient(a.session, b.clientId);
    expect(cross).toHaveLength(0);
  });

  it('countUnreadForClient counts own unread only', async () => {
    expect(await repo.countUnreadForClient(a.session, a.clientId)).toBe(1);
    expect(await repo.countUnreadForClient(a.session, b.clientId)).toBe(0);
  });

  it('markMessageRead on a cross-tenant id returns NotFound', async () => {
    const result = await repo.markMessageRead(a.session, a.clientId, bMessageId);
    expect(result).toEqual({ ok: false, code: ResultCode.NotFound });
  });
});
