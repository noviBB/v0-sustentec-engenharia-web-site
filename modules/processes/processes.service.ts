/**
 * Pure domain derivations for the processes (dashboard / project) domain.
 *
 * No `next/*`, no supabase, no `server-only` — these are plain functions over
 * already-loaded rows, safe to call from client components AND unit tests.
 * The repository (`processes.repo.ts`) owns DB access; this file owns the
 * status/bucket/aggregate logic the UI derives from those rows.
 */
import { ProcessBucket, ProcessTaskStatus } from '@/lib/db/enums';
import type { ProcessRow, ProcessBuckets } from './processes.repo';

/** The three portal-facing process buckets (UI bucket = process status). */
export type Bucket = ProcessBucket;

/** Bucket order used everywhere the dashboard renders groups / flattens rows. */
export const BUCKET_ORDER: readonly Bucket[] = [
  ProcessBucket.Andamento,
  ProcessBucket.Acompanhamento,
  ProcessBucket.Finalizado,
];

/**
 * Flattens the three buckets back into a single list, in canonical
 * `BUCKET_ORDER` (andamento → acompanhamento → finalizado).
 */
export function flattenBuckets(buckets: ProcessBuckets): ProcessRow[] {
  return BUCKET_ORDER.flatMap((b) => buckets[b]);
}

/** Per-bucket counts plus the grand total, derived from the buckets. */
export interface BucketCounts {
  total: number;
  andamento: number;
  acompanhamento: number;
  finalizado: number;
}

export function bucketCounts(buckets: ProcessBuckets): BucketCounts {
  const andamento = buckets.andamento.length;
  const acompanhamento = buckets.acompanhamento.length;
  const finalizado = buckets.finalizado.length;
  return {
    andamento,
    acompanhamento,
    finalizado,
    total: andamento + acompanhamento + finalizado,
  };
}

/** Sum of `pendencias_count` across all supplied rows (null-safe). */
export function totalPendencias(processes: ProcessRow[]): number {
  return processes.reduce((acc, p) => acc + (p.pendencias_count ?? 0), 0);
}

/**
 * The single process with the most open pendências (> 0). `null` when no row
 * has any open pendência. Used by the dashboard "Resolver Pendências" shortcut
 * to jump straight to the busiest project.
 */
export function pendenciasTarget(processes: ProcessRow[]): ProcessRow | null {
  return processes.reduce<ProcessRow | null>(
    (max, p) =>
      p.pendencias_count > 0 &&
      p.pendencias_count > (max?.pendencias_count ?? 0)
        ? p
        : max,
    null,
  );
}

/**
 * Task statuses that do NOT count as an open pendência. Mirrors the DB view
 * (`v_processes_with_progress.pendencias_count`) so the client-side filter and
 * the server-side count agree.
 */
export const CLOSED_TASK_STATUSES: readonly ProcessTaskStatus[] = [
  ProcessTaskStatus.Concluida,
  ProcessTaskStatus.Arquivada,
];

/** String set of the closed statuses, for plain-string membership checks. */
const CLOSED_TASK_STATUS_SET: ReadonlySet<string> = new Set(
  CLOSED_TASK_STATUSES,
);

/** A task is "open" (an actionable pendência) when its status isn't closed. */
export function isOpenTask(task: { status: string }): boolean {
  return !CLOSED_TASK_STATUS_SET.has(task.status);
}

/** Filters a task list down to the open (pendência) tasks. */
export function openTasks<T extends { status: string }>(tasks: T[]): T[] {
  return tasks.filter(isOpenTask);
}
