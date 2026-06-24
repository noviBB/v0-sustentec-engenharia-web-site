/**
 * Payments feature module — public surface.
 *
 * Payments are READ-ONLY in the portal today: there is no `'use server'`
 * controller and no mutation action. The repository layer is server-only and
 * must NOT be re-exported here for runtime use; only its row TYPES are public.
 *
 * - Row types come from the repository (`payments.repo.ts`).
 * - Pure derivation helpers come from the service (`payments.service.ts`).
 */

// Row types (type-only; the repo is `server-only` and is not re-exported here).
export type { PaymentRow, PaymentWithProcess } from './payments.repo';

// Status enum (value) — re-exported so view code can key on `PaymentStatus`
// without importing `@/lib/db*` directly (the lint boundary forbids that).
export { PaymentStatus } from '@/lib/db/enums';

// Pure service helpers (safe on server and client).
export {
  isDue,
  totalDue,
  groupByProcess,
  countByStatus,
} from './payments.service';
export type {
  DuePaymentStatus,
  AmountStatusLike,
  ProcessScopedLike,
} from './payments.service';
