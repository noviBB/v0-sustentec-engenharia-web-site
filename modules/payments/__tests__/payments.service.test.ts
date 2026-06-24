import { describe, expect, it } from 'vitest';

import { PaymentStatus } from '@/lib/db/enums';
import {
  countByStatus,
  groupByProcess,
  isDue,
  totalDue,
} from '@/modules/payments';

/**
 * Pure derivation helpers from the payments SPEC §(d). Deterministic,
 * side-effect free, tolerant of empty input. No DB, no Drizzle.
 */

describe('isDue', () => {
  it('is true only for pending/overdue', () => {
    expect(isDue(PaymentStatus.Pending)).toBe(true);
    expect(isDue(PaymentStatus.Overdue)).toBe(true);
  });
  it('is false for paid and unknown statuses', () => {
    expect(isDue(PaymentStatus.Paid)).toBe(false);
    expect(isDue('cancelled')).toBe(false);
    expect(isDue('')).toBe(false);
  });
});

describe('totalDue', () => {
  it('sums only due rows, treating null/undefined amounts as 0', () => {
    // Worked example straight from the SPEC.
    const rows = [
      { status: PaymentStatus.Pending, amount: '100' },
      { status: PaymentStatus.Paid, amount: '50' },
      { status: PaymentStatus.Overdue, amount: 25 },
    ];
    expect(totalDue(rows)).toBe(125);
  });

  it('excludes paid rows from the total', () => {
    const rows = [
      { status: PaymentStatus.Paid, amount: '999' },
      { status: PaymentStatus.Paid, amount: 1 },
    ];
    expect(totalDue(rows)).toBe(0);
  });

  it('coerces pg-numeric strings and tolerates null/undefined amounts', () => {
    const rows = [
      { status: PaymentStatus.Pending, amount: '10.50' },
      { status: PaymentStatus.Overdue, amount: null },
      { status: PaymentStatus.Overdue, amount: undefined },
      { status: PaymentStatus.Pending, amount: 4.5 },
    ];
    expect(totalDue(rows)).toBe(15);
  });

  it('returns 0 for empty input', () => {
    expect(totalDue([])).toBe(0);
  });
});

describe('groupByProcess', () => {
  it('buckets rows by process_id preserving insertion order', () => {
    const rows = [
      { process_id: 'p1', installment_no: 1 },
      { process_id: 'p2', installment_no: 1 },
      { process_id: 'p1', installment_no: 2 },
    ];
    const grouped = groupByProcess(rows);
    expect([...grouped.keys()]).toEqual(['p1', 'p2']);
    expect(grouped.get('p1')).toEqual([
      { process_id: 'p1', installment_no: 1 },
      { process_id: 'p1', installment_no: 2 },
    ]);
    expect(grouped.get('p2')).toEqual([{ process_id: 'p2', installment_no: 1 }]);
  });

  it('returns an empty Map for empty input', () => {
    const grouped = groupByProcess([]);
    expect(grouped.size).toBe(0);
  });
});

describe('countByStatus', () => {
  it('counts exact status matches', () => {
    const rows = [
      { status: PaymentStatus.Pending, amount: 1 },
      { status: PaymentStatus.Overdue, amount: 1 },
      { status: PaymentStatus.Pending, amount: 1 },
      { status: PaymentStatus.Paid, amount: 1 },
    ];
    expect(countByStatus(rows, PaymentStatus.Pending)).toBe(2);
    expect(countByStatus(rows, PaymentStatus.Overdue)).toBe(1);
    expect(countByStatus(rows, PaymentStatus.Paid)).toBe(1);
  });

  it('returns 0 on no match or empty input', () => {
    expect(countByStatus([], PaymentStatus.Pending)).toBe(0);
    expect(
      countByStatus(
        [{ status: PaymentStatus.Paid, amount: 1 }],
        PaymentStatus.Overdue,
      ),
    ).toBe(0);
  });
});
