# Notifications module — SPEC

The **notifications** domain (issue #39.8): a persistent "mark-as-seen" model
for the portal header bell badge. The badge counts only pendências that are NEW
since the user last opened the bell, and clears when they open it. The sidebar
and per-process pendências badges are unaffected — they keep showing the TOTAL
open count.

Layered `controller → service → repository`.

```
modules/notifications/
  index.ts                              # barrel (public surface)
  notifications.controller.ts           # 'use server' action
  notifications.service.ts              # pure orchestration (domain result)
  notifications.repo.ts                 # db access (only importer of db core)
  hooks/use-mark-pendencias-seen.ts     # client hook wrapping the action
  SPEC.md
```

## The "seen" model

`pendencia_seen (user_id, client_id, seen_at)` records when the user last opened
the notifications bell for a tenant (no row = never). The header badge counts
open pendências whose `created_at` is strictly after `seen_at`; a missing row
means every open pendência counts as new. Opening the bell upserts `now()` →
badge clears. The table has no FK on `user_id` (like `user_clients`) so RLS-only
tenancy holds and integration tests run with synthetic ids.

"Open pendência" matches the dashboard definition (`0003_views.sql`
`pendencias_count`): `process_tasks` where `status NOT IN
('concluida','arquivada')` and `deleted_at IS NULL`.

## Barrel (`modules/notifications/index.ts`)

| Export | Kind | Signature |
| --- | --- | --- |
| `markPendenciasSeenAction` | server action | `() => Promise<MarkPendenciasSeenResult>` |
| `useMarkPendenciasSeen` | client hook | `() => { mutate, pending, error }` |
| `MarkPendenciasSeenResult` | type | controller wire result |

The repo functions are intentionally NOT in the barrel — server callers (the
portal RSC) import `countUnseenPendencias` straight from
`@/modules/notifications/notifications.repo`.

## Repository (`notifications.repo.ts`)

`import 'server-only'`. Only module-file allowed to import db core (`dbRls`/
`SessionLike` from `@/lib/db`, `pendenciaSeen`/`processes`/`processTasks` from
`@/lib/db/schema`). All access runs under `dbRls(session, tx => …)`.

| Function | Params | Return | Mode |
| --- | --- | --- | --- |
| `markPendenciasSeen` | `(session: SessionLike, clientId: string)` | `Promise<void>` | RLS write (own row) |
| `countUnseenPendencias` | `(session: SessionLike, clientId: string)` | `Promise<number>` | RLS read |

Behavior:
- `markPendenciasSeen`: upserts `pendencia_seen` for `(auth.uid(), clientId)`,
  setting `seen_at = updated_at = now()`. RLS (`pendencia_seen_insert/update`,
  `user_id = auth.uid()`) scopes it to the caller's own row.
- `countUnseenPendencias`: `count(*)::int` over `process_tasks` joined to
  `processes` on `process_id`, filtered by `processes.client_id = clientId`,
  the open-pendência predicate, and `(seen IS NULL OR created_at > seen)`
  where `seen = (SELECT seen_at FROM pendencia_seen WHERE user_id = auth.uid()
  AND client_id = clientId)`. Coerced via `Number(...)`; returns `0` when no rows.

## Service (`notifications.service.ts`)

`import 'server-only'`. Pure orchestration; no `'use server'`, `next/*`, or
Supabase. Returns a **domain** result (not `ResultCode`).

```ts
export type MarkPendenciasSeenResult =
  | { kind: 'ok' }
  | { kind: 'error'; ref?: string };

markPendenciasSeen(session: SessionLike, clientId: string): Promise<MarkPendenciasSeenResult>
```

Calls `repo.markPendenciasSeen`; on success `{ kind: 'ok' }`; on throw logs a
structured `AuditEvent.MarkPendenciasSeenFailed` line with an 8-char `ref` and
returns `{ kind: 'error', ref }`. No count function in the service — the count
is a read the portal RSC does directly via the repo.

## Controller (`notifications.controller.ts`)

`'use server'` + `import 'server-only'`. Client-callable surface.

```ts
export type MarkPendenciasSeenResult =
  | { ok: true }
  | { ok: false; code: ResultCode };

markPendenciasSeenAction(): Promise<MarkPendenciasSeenResult>
```

No input (no Zod). Flow: `requireClient()` → `!ok` → `{ ok:false, code:
Unauthorized }`; else one service call; `ok → {ok:true}`, anything else →
`{ ok:false, code: ServerError }`.

## Hook (`hooks/use-mark-pendencias-seen.ts`)

`'use client'`. `useMarkPendenciasSeen()` wraps the action in `useTransition`,
returns `{ mutate, pending, error }`. `mutate()` resolves with the
`MarkPendenciasSeenResult`. The portal shell updates the badge optimistically,
so a failed stamp is non-fatal (the badge simply re-appears next page load).

## Wiring (shared shell, not in this module)

- `app/portal/(protected)/page.tsx`: `countUnseenPendencias(session, clientId)`
  → passed as `unseenPendencias` to `<PortalShell>`.
- `components/portal/portal-shell.tsx`: holds `unseenPendencias` in state,
  exposes `onNotificationsOpened` (fires `useMarkPendenciasSeen().mutate()` +
  optimistically sets the count to 0). The existing `pendenciasSummary` list
  prop is unchanged — the dropdown still lists ALL open pendências.
- `components/portal/portal-header.tsx`: bell badge renders `unseenPendencias`
  (shown only when `> 0`); `DropdownMenu onOpenChange` fires
  `onNotificationsOpened` when opened with unseen `> 0`. The dropdown list is
  unchanged.

## RLS / tenant invariants

- `markPendenciasSeen` only writes the caller's own `pendencia_seen` row
  (`user_id = auth.uid()`), per `0009_pendencia_seen.sql`.
- `countUnseenPendencias` runs RLS-scoped; `process_tasks`/`processes` policies
  block cross-tenant rows, so a foreign `clientId` yields 0.

## Test seams

- **Repo (integration, real RLS):** seed a tenant (synthetic id, no profile);
  assert `markPendenciasSeen` writes `pendencia_seen.seen_at`;
  `countUnseenPendencias` returns 0 when all open pendências predate the cursor
  and `> 0` when a newer task exists.
- **Service (unit):** stub the repo; assert `ok` on success and `error` when the
  fake throws.
