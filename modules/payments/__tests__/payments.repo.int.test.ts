import { afterAll, beforeAll, expect, it } from 'vitest';

import { PaymentStatus } from '@/lib/db/enums';
import {
  cleanupWorld,
  createProcess,
  createTenant,
  describeIntegration,
  newWorld,
  type Tenant,
} from '@/modules/_test-support/integration';

/**
 * RLS invariant (payments SPEC §c): a session for client A must NOT read or
 * mark-paid any payment belonging to client B (empty results / no-op).
 */
import type * as PaymentsRepo from '@/modules/payments/payments.repo';

type Repo = typeof PaymentsRepo;

const world = newWorld();
let repo: Repo;
let a: Tenant;
let b: Tenant;
let aProc: string;
let bProc: string;
let bPaymentId: string;

async function seedPayment(processId: string, installmentNo: number) {
  const { getDbService } = await import('@/lib/db');
  const { payments } = await import('@/lib/db/schema');
  const [row] = await getDbService()
    .insert(payments)
    .values({
      process_id: processId,
      installment_no: installmentNo,
      amount: '100.00',
      due_date: '2026-01-01',
      status: PaymentStatus.Pending,
    })
    .returning({ id: payments.id });
  return row!.id;
}

describeIntegration('payments.repo (RLS)', () => {
  beforeAll(async () => {
    repo = await import('@/modules/payments/payments.repo');
    a = await createTenant(world, 'Pay Tenant A');
    b = await createTenant(world, 'Pay Tenant B');
    aProc = await createProcess(a.clientId);
    bProc = await createProcess(b.clientId);
    await seedPayment(aProc, 1);
    bPaymentId = await seedPayment(bProc, 1);
  });
  afterAll(() => cleanupWorld(world));

  it('listPaymentsByClient returns own payments only', async () => {
    const aRows = await repo.listPaymentsByClient(a.session, a.clientId);
    expect(aRows.length).toBeGreaterThan(0);
    expect(aRows.every((r) => r.process.client_id === a.clientId)).toBe(true);

    const cross = await repo.listPaymentsByClient(a.session, b.clientId);
    expect(cross).toHaveLength(0);
  });

  it('listPaymentsByProcess is empty for a cross-tenant process', async () => {
    expect(
      (await repo.listPaymentsByProcess(a.session, aProc)).length,
    ).toBeGreaterThan(0);
    expect(await repo.listPaymentsByProcess(a.session, bProc)).toHaveLength(0);
  });

  it('markPaymentPaid on a cross-tenant payment is a no-op (null)', async () => {
    const result = await repo.markPaymentPaid(a.session, bPaymentId);
    expect(result).toBeNull();

    const bRows = await repo.listPaymentsByProcess(b.session, bProc);
    expect(bRows[0]?.status).toBe(PaymentStatus.Pending);
  });
});
