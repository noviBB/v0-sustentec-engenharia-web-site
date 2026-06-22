import { describe, expect, it } from 'vitest';

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
    expect(isDue('pending')).toBe(true);
    expect(isDue('overdue')).toBe(true);
  });
  it('is false for paid and unknown statuses', () => {
    expect(isDue('paid')).toBe(false);
    expect(isDue('cancelled')).toBe(false);
    expect(isDue('')).toBe(false);
  });
});

describe('totalDue', () => {
  it('sums only due rows, treating null/undefined amounts as 0', () => {
    // Worked example straight from the SPEC.
    const rows = [
      { status: 'pending', amount: '100' },
      { status: 'paid', amount: '50' },
      { status: 'overdue', amount: 25 },
    ];
    expect(totalDue(rows)).toBe(125);
  });

  it('excludes paid rows from the total', () => {
    const rows = [
      { status: 'paid', amount: '999' },
      { status: 'paid', amount: 1 },
    ];
    expect(totalDue(rows)).toBe(0);
  });

  it('coerces pg-numeric strings and tolerates null/undefined amounts', () => {
    const rows = [
      { status: 'pending', amount: '10.50' },
      { status: 'overdue', amount: null },
      { status: 'overdue', amount: undefined },
      { status: 'pending', amount: 4.5 },
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
      { status: 'pending', amount: 1 },
      { status: 'overdue', amount: 1 },
      { status: 'pending', amount: 1 },
      { status: 'paid', amount: 1 },
    ];
    expect(countByStatus(rows, 'pending')).toBe(2);
    expect(countByStatus(rows, 'overdue')).toBe(1);
    expect(countByStatus(rows, 'paid')).toBe(1);
  });

  it('returns 0 on no match or empty input', () => {
    expect(countByStatus([], 'pending')).toBe(0);
    expect(countByStatus([{ status: 'paid', amount: 1 }], 'overdue')).toBe(0);
  });
});
