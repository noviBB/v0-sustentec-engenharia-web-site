/**
 * Payments domain — pure derivation logic.
 *
 * No `next/*`, no Supabase, no `server-only`. Everything here is deterministic
 * and safe to run on the server OR the client (the portal computes these in
 * `useMemo` today; this module makes them reusable + unit-testable).
 *
 * The functions are intentionally structurally typed: they accept anything
 * carrying the few fields they read, so both `PaymentRow` and
 * `PaymentWithProcess` (and lighter test fixtures) satisfy them.
 */

import { PaymentStatus } from '@/lib/db/enums';

/** A payment is "due" (still owed) when it is pending or overdue. */
export type DuePaymentStatus = PaymentStatus.Pending | PaymentStatus.Overdue;

/** The enum members that count as "due", as plain strings for membership
 *  checks against loosely-typed (`status: string`) inputs without tripping
 *  `no-unsafe-enum-comparison`. */
const DUE_STATUSES: ReadonlySet<string> = new Set<DuePaymentStatus>([
  PaymentStatus.Pending,
  PaymentStatus.Overdue,
]);

/** Minimal shape needed to sum outstanding amounts. */
export interface AmountStatusLike {
  status: string;
  amount: number | string | null | undefined;
}

/** Minimal shape needed to group payments by their parent process. */
export interface ProcessScopedLike {
  process_id: string;
}

/** True when a payment still counts toward the outstanding balance. */
export function isDue(status: string): boolean {
  return DUE_STATUSES.has(status);
}

/**
 * Total still owed across a set of payments = sum of `amount` for every
 * `pending` or `overdue` row. `amount` may arrive as a numeric string (pg
 * numeric) or null; both are coerced safely. Returns `0` for an empty input.
 */
export function totalDue(payments: readonly AmountStatusLike[]): number {
  return payments
    .filter((p) => isDue(p.status))
    .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
}

/**
 * Groups payments by `process_id`, preserving input order within each bucket.
 * Returns a `Map<processId, payments[]>`. Empty input yields an empty Map.
 */
export function groupByProcess<T extends ProcessScopedLike>(
  payments: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const p of payments) {
    const list = map.get(p.process_id) ?? [];
    list.push(p);
    map.set(p.process_id, list);
  }
  return map;
}

/** Count of payments in a given status (e.g. overdue badge counts). */
export function countByStatus(
  payments: readonly AmountStatusLike[],
  status: string,
): number {
  return payments.reduce((acc, p) => (p.status === status ? acc + 1 : acc), 0);
}
