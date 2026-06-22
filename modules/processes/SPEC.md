# `modules/processes` — Processes (Dashboard / Project) domain

The portal's **read-only** project domain: lists a client's environmental-licensing
processes, buckets them by status for the dashboard, and renders the per-process
detail (resumo, evolução, pendências, documentos, pagamentos, mapa). Also exposes
the service-mode read paths the Notion sync/export adapter and webhook use.

There is **no controller** — the portal performs no process mutations today.
Process data is written by the Notion sync, not by the client UI.

## Layers

- **`processes.repo.ts`** (`import 'server-only'`) — the only file that imports DB
  core (`dbRls`, `getDbService`, `SessionLike` from `@/lib/db`) plus
  `@/lib/db/{schema,views,enums}`. All process DB access lives here.
- **`processes.service.ts`** — pure domain derivations. No `next/*`, no supabase,
  no `server-only`. Safe in client components and unit tests.
- **`index.ts`** (barrel) — re-exports repo row TYPES + the service helpers. No
  runtime repo code is re-exported (it's server-only); server callers import
  `processes.repo` directly.
- **`components/`** — client (`"use client"`) UI: dashboard + process detail + maps.

## Barrel exports (`@/modules/processes`)

Types (from repo): `ProcessRow`, `ProcessBuckets`, `ProcessSyncItem`,
`ProcessExportTask`, `ProcessForExport`, `ProcessNotionLookup`.

Service values: `BUCKET_ORDER`, `CLOSED_TASK_STATUSES`, `flattenBuckets`,
`bucketCounts`, `totalPendencias`, `pendenciasTarget`, `isOpenTask`, `openTasks`.
Service types: `Bucket`, `BucketCounts`.

## Compatibility shims (old paths re-export the new module)

- `lib/db/processes.ts` → `export * from '@/modules/processes/processes.repo'`
- `components/portal/{dashboard-content,process-detail,project-status-badge,dashboard-map,project-map,leaflet-maps}.tsx`
  → `export * from '@/modules/processes/components/<name>'`

Live importers relying on the shims: `app/portal/(protected)/page.tsx`
(`listBuckets`), `lib/notion/adapter.ts` (service read fns + `ProcessSyncItem`),
`components/portal/{portal-shell,portal-sidebar}.tsx` (`ProcessRow`,
`ProcessBuckets` types + `DashboardContent`/`ProcessDetail` components).

## Repository functions (`processes.repo.ts`)

### RLS mode (portal; runs as `authenticated`, tenant-scoped via `dbRls`)

- `listProcessesForClient(session, clientId, opts?: { limit?; offset? })
  : Promise<ProcessRow[]>` — selects `v_processes_with_progress` where
  `client_id = clientId AND deleted_at IS NULL`, ordered `created_at DESC`,
  default `LIMIT 200 OFFSET 0`.
- `getProcessById(session, clientId, processId): Promise<ProcessRow | null>` —
  single row from the view, scoped by client + id + not-deleted; `null` if absent
  or cross-tenant.
- `listBuckets(session, clientId): Promise<ProcessBuckets>` — calls
  `listProcessesForClient` then groups into `{ andamento, acompanhamento,
  finalizado }`. Rows with any other status (e.g. `arquivado`) are dropped.

### Service mode (sync/export/webhook; `getDbService`, bypasses RLS, all tenants)

- `listProcessSyncItemsForClient(clientId): Promise<ProcessSyncItem[]>` — base
  `processes` table, non-deleted, sync columns only.
- `getProcessForExport(clientId, processId): Promise<ProcessForExport | null>` —
  one non-deleted process fully hydrated with `license_types` (string[]),
  `milestones` (`Record<slug, boolean>`), and non-deleted `tasks`
  (`ProcessExportTask[]`). `null` if absent/cross-tenant.
- `getProcessByNotionPageId(notionPageId): Promise<ProcessNotionLookup | null>` —
  `{ id, client_id, notion_etag }` for the live row tracking that Notion page;
  `null` (idempotent no-op for the webhook) when none.
- `listProcessIdsForClient(clientId): Promise<string[]>` — ids of non-deleted
  processes for export iteration.

## Status & bucket model

Process `status` enum (`@/lib/db/enums.processStatus`); the portal surfaces three
as buckets, identical to the status value:

- `andamento` — in progress (blue, `FileSearch`).
- `acompanhamento` — accompaniment / monitoring (amber, `Eye`).
- `finalizado` — finalized (green, `CheckCircle`).

Any other status (notably `arquivado`) is filtered out by `listBuckets` and never
reaches the dashboard. `ProjectStatusBadge` still defensively renders unknown
statuses with a neutral gray style + raw value.

`status_label` (free text from Notion) is shown when present; otherwise the
bucket's i18n label is the fallback.

## Pure service derivations + contracts

- `BUCKET_ORDER = ['andamento','acompanhamento','finalizado']` — canonical order.
- `flattenBuckets(buckets): ProcessRow[]` — concatenate in `BUCKET_ORDER`.
- `bucketCounts(buckets): BucketCounts` — `{ andamento, acompanhamento,
  finalizado, total }`; `total` = sum of the three lengths.
- `totalPendencias(rows): number` — Σ `pendencias_count ?? 0`.
- `pendenciasTarget(rows): ProcessRow | null` — the row with the **largest**
  `pendencias_count` that is `> 0`; ties keep the first seen; `null` when none
  has open pendências. Drives the dashboard "Resolver Pendências" shortcut.
- `CLOSED_TASK_STATUSES = ['concluida','arquivada']` — statuses NOT counted as an
  open pendência. Mirrors the DB view's `pendencias_count` so client filter and
  server count agree.
- `isOpenTask({ status }): boolean` — `!CLOSED_TASK_STATUSES.includes(status)`.
- `openTasks(tasks): T[]` — `tasks.filter(isOpenTask)` (generic over
  `{ status: string }`).

## RLS invariants

- Portal reads (`listProcessesForClient`, `getProcessById`, `listBuckets`) run
  through `dbRls(session, …)` as `authenticated`; the `processes` RLS policy
  bounds visible rows to the caller's tenants. The explicit `WHERE client_id = ?`
  is a seatbelt for multi-tenant users, NOT the isolation boundary.
- A user must never see another tenant's process via any portal path — even with
  a valid `processId` from another tenant, `getProcessById` returns `null`.
- Service-mode functions intentionally bypass RLS (service_role) and iterate all
  tenants; they take a raw `clientId` and must only be called from server-side
  sync/export/webhook code, never from a user-session request path.
- Soft-delete: every query filters `deleted_at IS NULL`.

## User-facing flows

### Dashboard (`DashboardContent`)
- Greeting + unread-messages line; five stat cards (Total, Andamento,
  Acompanhamento, Finalizado, Payments-due). Clicking a status card toggles a
  filter on the list below; the Total card clears it.
- `DashboardMap` plots `andamento` + `acompanhamento` projects that have
  coordinates (finalized hidden); empty-state when none geocoded.
- Process list grouped by bucket (each group shows code, name, city, progress %,
  status badge, pendências badge, "Ver detalhes"). Empty-state when no processes.
- Three shortcut cards: Agendamentos (navigates), Novo processo (mailto to the
  Sustentec inbox), Resolver Pendências (opens `pendenciasTarget` on the
  `pendencias` tab; disabled when no open pendências).

### Process detail (`ProcessDetail`)
Header (code badge, name, city, `ProjectStatusBadge`) + two status cards (current
status / last update, start & due dates). Six tabs (`initialTab` selects on
mount; "Resolver Pendências" passes `"pendencias"`):
- **resumo** — enquadramento label/value table (license types, agency, processing
  time, impact class, responsible tech, licensed activity) + objective/observation.
- **evolucao** — milestone timeline (checked = green, with `checked_at`); empty-state.
- **pendencias** — open tasks (`openTasks`) with status + priority badges and due
  date; tab badge shows `pendencias_count`; empty-state = "all clear".
- **documentos** — download-only document list (no upload); empty-state.
- **pagamentos** — delegates to `PaymentsView` (payments domain — other module).
- **mapa** — `ProjectMap` single marker from lat/lng; empty-state when ungeocoded.

Bottom: WhatsApp support card + "back to dashboard" card.

## Testing notes

- **Unit (service, no DB):** `flattenBuckets` order; `bucketCounts.total`;
  `totalPendencias` null-safety; `pendenciasTarget` tie/zero/null cases;
  `openTasks`/`isOpenTask` against `CLOSED_TASK_STATUSES`.
- **Integration (RLS):** cross-tenant `getProcessById` → `null`; `listBuckets`
  drops `arquivado` and soft-deleted; service-mode fns see all tenants.
- **e2e:** dashboard buckets render + stat-card filtering + shortcuts; process
  detail tab switching incl. `initialTab="pendencias"`; map empty-states.
