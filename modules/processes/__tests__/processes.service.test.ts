import { describe, expect, it } from 'vitest';

import {
  BUCKET_ORDER,
  CLOSED_TASK_STATUSES,
  bucketCounts,
  flattenBuckets,
  isOpenTask,
  openTasks,
  pendenciasTarget,
  totalPendencias,
} from '@/modules/processes';
import { ProcessBucket, ProcessTaskStatus } from '@/lib/db/enums';

/**
 * Pure domain derivations from the processes SPEC §"Pure service derivations".
 * No DB, no Drizzle, no Next.
 *
 * `ProcessRow` is the view row; for these helpers only the named fields matter,
 * so we build minimal partial rows and cast at the call site.
 */
function row(partial: { id?: string; pendencias_count?: number | null }) {
  return partial as unknown as Parameters<typeof totalPendencias>[0][number];
}

function buckets(b: {
  andamento?: unknown[];
  acompanhamento?: unknown[];
  finalizado?: unknown[];
}) {
  return {
    andamento: b.andamento ?? [],
    acompanhamento: b.acompanhamento ?? [],
    finalizado: b.finalizado ?? [],
  } as unknown as Parameters<typeof flattenBuckets>[0];
}

describe('BUCKET_ORDER / CLOSED_TASK_STATUSES', () => {
  it('exposes the canonical bucket order', () => {
    expect(BUCKET_ORDER).toEqual([
      ProcessBucket.Andamento,
      ProcessBucket.Acompanhamento,
      ProcessBucket.Finalizado,
    ]);
  });
  it('lists the closed task statuses', () => {
    expect(CLOSED_TASK_STATUSES).toEqual([
      ProcessTaskStatus.Concluida,
      ProcessTaskStatus.Arquivada,
    ]);
  });
});

describe('flattenBuckets', () => {
  it('concatenates in BUCKET_ORDER', () => {
    const result = flattenBuckets(
      buckets({
        andamento: [{ id: 'a' }],
        acompanhamento: [{ id: 'b' }],
        finalizado: [{ id: 'c' }, { id: 'd' }],
      }),
    );
    expect(result.map((r) => (r as { id: string }).id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('handles empty buckets', () => {
    expect(flattenBuckets(buckets({}))).toEqual([]);
  });
});

describe('bucketCounts', () => {
  it('returns per-bucket counts and a total = sum of the three', () => {
    const counts = bucketCounts(
      buckets({
        andamento: [{}, {}],
        acompanhamento: [{}],
        finalizado: [{}, {}, {}],
      }),
    );
    expect(counts).toEqual({
      andamento: 2,
      acompanhamento: 1,
      finalizado: 3,
      total: 6,
    });
  });

  it('is all-zero for empty buckets', () => {
    expect(bucketCounts(buckets({}))).toEqual({
      andamento: 0,
      acompanhamento: 0,
      finalizado: 0,
      total: 0,
    });
  });
});

describe('totalPendencias', () => {
  it('sums pendencias_count with null-safety', () => {
    expect(
      totalPendencias([
        row({ pendencias_count: 3 }),
        row({ pendencias_count: null }),
        row({ pendencias_count: 2 }),
        row({}),
      ]),
    ).toBe(5);
  });
  it('returns 0 for empty input', () => {
    expect(totalPendencias([])).toBe(0);
  });
});

describe('pendenciasTarget', () => {
  it('returns the row with the largest count > 0', () => {
    const target = pendenciasTarget([
      row({ id: 'a', pendencias_count: 1 }),
      row({ id: 'b', pendencias_count: 5 }),
      row({ id: 'c', pendencias_count: 3 }),
    ]);
    expect((target as { id: string } | null)?.id).toBe('b');
  });

  it('keeps the first seen on ties', () => {
    const target = pendenciasTarget([
      row({ id: 'first', pendencias_count: 4 }),
      row({ id: 'second', pendencias_count: 4 }),
    ]);
    expect((target as { id: string } | null)?.id).toBe('first');
  });

  it('returns null when no row has open pendências', () => {
    expect(
      pendenciasTarget([
        row({ id: 'a', pendencias_count: 0 }),
        row({ id: 'b', pendencias_count: null }),
      ]),
    ).toBeNull();
    expect(pendenciasTarget([])).toBeNull();
  });
});

describe('isOpenTask / openTasks', () => {
  it('treats only non-closed statuses as open', () => {
    expect(isOpenTask({ status: ProcessTaskStatus.Aberta })).toBe(true);
    expect(isOpenTask({ status: ProcessTaskStatus.EmAndamento })).toBe(true);
    expect(isOpenTask({ status: ProcessTaskStatus.Concluida })).toBe(false);
    expect(isOpenTask({ status: ProcessTaskStatus.Arquivada })).toBe(false);
  });

  it('filters a task list down to open tasks', () => {
    const tasks = [
      { id: '1', status: ProcessTaskStatus.Aberta },
      { id: '2', status: ProcessTaskStatus.Concluida },
      { id: '3', status: ProcessTaskStatus.Arquivada },
      { id: '4', status: ProcessTaskStatus.Aberta },
    ];
    expect(openTasks(tasks).map((t) => t.id)).toEqual(['1', '4']);
  });

  it('returns an empty list for empty input', () => {
    expect(openTasks([])).toEqual([]);
  });
});
