# Payments module — SPEC

Feature module for the **payments** domain. Payments are **read-only** in the
portal today: the repo exposes one mutation (`markPaymentPaid`) and one system
sweep (`markOverdue`), but there is **no `'use server'` controller and no
client-triggered mutation action**. The barrel therefore exposes row TYPES and
pure service helpers only.

```
modules/payments/
  payments.repo.ts           # server-only DB access (the ONLY file touching @/lib/db core)
  payments.service.ts        # pure derivations (no next/*, no supabase, no server-only)
  index.ts                   # barrel: row TYPES + service helpers
  components/
    payments-view.tsx        # "use client" — per-process installments table
    payments-dashboard-card.tsx  # "use client" — total-due summary card
```

Shims (preserve existing importers, do not delete):
- `lib/db/payments.ts` → `export * from '@/modules/payments/payments.repo'`
- `components/portal/payments-view.tsx` → re-exports `PaymentsView`
- `components/portal/payments-dashboard-card.tsx` → re-exports `PaymentsDashboardCard`

---

## (a) Barrel public exports (`@/modules/payments`)

Types:
- `type PaymentRow = typeof payments.$inferSelect` — a single `payments` table row.
  Notable fields used by callers: `id: string`, `process_id: string`,
  `installment_no: number`, `amount: string` (pg numeric, serialized as string),
  `due_date: string`, `status: string` (`'pending' | 'paid' | 'overdue'`),
  `paid_at: string | null`, `updated_at`.
- `type PaymentWithProcess = PaymentRow & { process: { id: string; client_id: string; code: string | null; name: string | null } }`

Service value exports (pure functions):
- `isDue(status: string): boolean`
- `totalDue(payments: readonly AmountStatusLike[]): number`
- `groupByProcess<T extends ProcessScopedLike>(payments: readonly T[]): Map<string, T[]>`
- `countByStatus(payments: readonly AmountStatusLike[], status: string): number`

Service type exports:
- `type DuePaymentStatus = 'pending' | 'overdue'`
- `interface AmountStatusLike { status: string; amount: number | string | null | undefined }`
- `interface ProcessScopedLike { process_id: string }`

The repository functions are **NOT** re-exported from the barrel (server-only).
Server code that needs them imports from `@/lib/db/payments` (shim) or directly
from `@/modules/payments/payments.repo`.

---

## (b) Repository functions (`modules/payments/payments.repo.ts`, `import 'server-only'`)

| Function | Params | Returns | DB mode |
|---|---|---|---|
| `listPaymentsByClient` | `(session: SessionLike, clientId: string)` | `Promise<PaymentWithProcess[]>` | **RLS** (`dbRls(session, …)`) |
| `listPaymentsByProcess` | `(session: SessionLike, processId: string)` | `Promise<PaymentRow[]>` | **RLS** (`dbRls`) |
| `markPaymentPaid` | `(session: SessionLike, paymentId: string)` | `Promise<PaymentRow \| null>` | **RLS** (`dbRls`) |
| `markOverdue` | `()` | `Promise<PaymentRow[]>` | **SERVICE** (`getDbService()`, no session) |

Behavior detail:
- `listPaymentsByClient` — inner-joins `payments → processes` (payments carry no
  `client_id`), filters `processes.client_id = clientId`, orders by
  `due_date ASC, installment_no ASC`. Returns each row flattened as
  `{ ...payment, process }`.
- `listPaymentsByProcess` — all payments for one process, ordered by
  `installment_no ASC`.
- `markPaymentPaid` — sets `paid_at = now()`, `status = 'paid'`,
  `updated_at = now()` for the row with `id = paymentId`, regardless of prior
  status; returns the updated row or `null` if none matched.
- `markOverdue` — bulk cross-tenant sweep: flips every row where
  `status = 'pending' AND due_date < current_date` to `status = 'overdue'`
  (also bumps `updated_at`); returns the rows that flipped (used by the daily
  `payment-overdue` cron to fan out notification emails).

---

## (c) RLS invariants the repo relies on

- Payments are **tenant-scoped**: the `payments` RLS policy joins through
  `processes` / `user_clients`, so under `dbRls(session, …)` a user only sees
  payments belonging to processes of clients they are linked to.
- `listPaymentsByClient`/`listPaymentsByProcess`/`markPaymentPaid` MUST be run
  through `dbRls` with a real session — RLS is the security boundary. The
  application-layer `WHERE processes.client_id = ?` in `listPaymentsByClient` is
  a defense-in-depth seatbelt, not the primary boundary.
- `markOverdue` deliberately bypasses RLS via `getDbService()` because it is a
  system cron job operating across all tenants with no authenticated user. It
  must never be reachable from a user-facing action.
- Integration tests: a session for client A must NOT be able to read or mark
  paid any payment belonging to client B (expect empty results / no-op).

---

## (d) Pure service functions — input → output contracts

All are deterministic, side-effect free, and tolerate empty input.

- `isDue(status)` → `true` iff `status === 'pending' || status === 'overdue'`,
  else `false`.
- `totalDue(payments)` → sum of `Number(amount ?? 0)` over rows where
  `isDue(status)` is true. `amount` may be a number, a pg-numeric string, or
  null/undefined (treated as 0). `paid` rows are excluded. Empty input → `0`.
  Example: `[{status:'pending',amount:'100'},{status:'paid',amount:'50'},{status:'overdue',amount:25}]` → `125`.
- `groupByProcess(payments)` → `Map<process_id, payments[]>`, insertion order
  preserved within each bucket and across keys. Empty input → empty Map.
- `countByStatus(payments, status)` → number of rows whose `status` exactly
  equals `status`. Empty input or no match → `0`.

---

## (e) User-facing payments behaviors (the views)

`PaymentsView` (`components/payments-view.tsx`, `"use client"`):
- Prop: `payments: PaymentRow[]` (per-process installment ladder).
- Renders a 5-column shadcn `Table`: Parcela (installment_no) / Vencimento
  (due_date, `pt-BR` date) / Valor (amount as `pt-BR` BRL currency, right
  aligned) / Status (color-coded `Badge`: pending=blue, paid=emerald,
  overdue=rose, fallback=gray) / Pago em (paid_at as date or `—`).
- Empty list renders a centered `—` placeholder.
- All copy is i18n-keyed under `portal.payments.*`
  (`title`, `installment` with `{n}`, `dueDate`, `amount`, `column.status`,
  `status.{pending|paid|overdue}`, `paidOn` with `{date}`).

`PaymentsDashboardCard` (`components/payments-dashboard-card.tsx`, `"use client"`):
- Prop: `total: number` (sum of pending + overdue amounts across the client's
  processes — i.e. the output of `totalDue`).
- Renders a summary card with a `CreditCard` icon and the total formatted as
  `pt-BR` BRL currency. Label key: `portal.payments.dashboardTotal`.

Note: the `total` passed to the dashboard card and the per-process grouping are
computed today in `components/portal/portal-shell.tsx` (out of this module's
ownership). `payments.service.ts` provides `totalDue` / `groupByProcess` as the
canonical, testable implementations of exactly that logic for future reuse.
