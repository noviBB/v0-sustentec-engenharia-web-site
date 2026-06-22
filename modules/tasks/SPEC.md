# Module: tasks

Process tasks = **pendências**. Two surfaces:
- Client-portal read (RLS) — renders the **Pendências** tab inside `process-detail`.
- A service-mode helper called by the daily `payment-overdue` cron to create an overdue pendência.

## Barrel (`modules/tasks/index.ts`)

| Export | Kind | Signature |
| --- | --- | --- |
| `TaskRow` | type | `{ id: string; process_id: string; title: string; summary: string \| null; status: ProcessTaskStatus; priority: ProcessTaskPriority; due_date: string \| null; created_at: Date }` |
| `listTasksForClient` | function | `(session: SessionLike, clientId: string) => Promise<TaskRow[]>` |
| `ensurePaymentOverdueTask` | function | `(processId: string, installmentNo: number) => Promise<{ created: boolean }>` |

`status`/`priority` are the enum value unions from `@/lib/db/enums` (`processTaskStatus`, `processTaskPriority`).

Old path `@/lib/db/tasks` is a shim (`export * from '@/modules/tasks/tasks.repo'`); existing importers — portal page, `portal-shell`, `process-detail`, and the cron route `app/api/cron/payment-overdue/route.ts` — keep working unchanged.

## Repository (`tasks.repo.ts`)

`import 'server-only'`. Only importer of `@/lib/db` core (`dbRls`, `getDbService`, `SessionLike`), `@/lib/db/schema`, and `@/lib/db/enums` in this module.

Module-private constant: `CLOSED_TASK_STATUSES = ['concluida', 'arquivada']` — statuses that do NOT count as open pendências (mirrors the view filter).

### `listTasksForClient(session, clientId) -> Promise<TaskRow[]>`
- **Mode:** RLS (`dbRls(session, ...)`).
- Selects from `process_tasks` INNER JOIN `processes` ON `processes.id = process_tasks.process_id` (tasks carry no `client_id`).
- **Filters:** `processes.client_id = clientId` AND `process_tasks.deleted_at IS NULL`.
- **Order:** `due_date ASC NULLS LAST`, then `created_at ASC` (most urgent first). One tenant-wide query, grouped per-process client-side.
- Returns `[]` when none match.

### `ensurePaymentOverdueTask(processId, installmentNo) -> Promise<{ created: boolean }>`
- **Mode:** SERVICE (`getDbService()`), cross-tenant. Invoked by the daily `payment-overdue` cron route alongside the overdue email. NOT behind RLS.
- Deterministic title = `` `Pagamento da parcela ${installmentNo} em atraso` `` — doubles as the idempotency key.
- Checks for an existing **open** matching task: same `process_id`, same `title`, `status NOT IN CLOSED_TASK_STATUSES`, `deleted_at IS NULL`. If found → returns `{ created: false }` (no insert).
- Otherwise inserts: `status='aberta'`, `priority='alta'`, fixed PT `summary`, `notion_page_id=null` (keeps it out of the Notion soft-delete sweep and export write-back).
- Returns `{ created: true }` on insert.

## RLS / mode invariants
- `listTasksForClient` is tenant-scoped via `dbRls`; explicit `processes.client_id = clientId` is a seatbelt. Soft-deleted rows excluded.
- `ensurePaymentOverdueTask` runs in service mode (cron, cross-tenant) and must remain exported and reachable via the `@/lib/db/tasks` shim for the cron route.
- **Idempotency:** repeated calls for the same `(processId, installmentNo)` while a matching task stays open create at most one task. Closing/archiving (status → `concluida`/`arquivada`) or soft-deleting releases the key, so a later re-overdue creates a fresh pendência.

## Test outline
- **RLS isolation:** tenant A session must not see tenant B tasks.
- **Soft delete / order:** deleted rows excluded; `due_date ASC NULLS LAST` then `created_at ASC`.
- **`ensurePaymentOverdueTask` idempotency:** first call → `{ created: true }`; immediate second call with same args → `{ created: false }` and exactly one row.
- **Key release:** after the task is set to `concluida`/`arquivada` (or `deleted_at` set), a new call → `{ created: true }`.
- **Distinct installments:** different `installmentNo` values produce distinct tasks (distinct titles).
- **Created row shape:** `status='aberta'`, `priority='alta'`, `notion_page_id=null`.
