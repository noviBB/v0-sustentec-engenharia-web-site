# Messages module — SPEC

The **messages** (inbox) domain as a feature module. Layered
`controller → service → repository`, with thin shims left at the old paths
so external importers keep working.

```
modules/messages/
  index.ts                      # barrel (public surface)
  message.schema.ts             # zod input validation
  messages.controller.ts        # 'use server' action
  messages.service.ts           # pure orchestration (domain result)
  messages.repo.ts              # db access (only importer of db core)
  components/messages-view.tsx  # client inbox UI
  SPEC.md
```

Compatibility shims (re-export only, no logic):
- `lib/db/messages.ts` → `export * from '@/modules/messages/messages.repo'`
- `lib/actions/messages.ts` → re-exports `markMessageReadAction` + `MarkMessageReadResult` type
- `components/portal/messages-view.tsx` → re-exports `MessagesView`

## Barrel (`modules/messages/index.ts`)

| Export | Kind | Signature |
| --- | --- | --- |
| `markMessageReadAction` | server action | `(messageId: string) => Promise<MarkMessageReadResult>` |
| `MarkMessageReadResult` | type | controller wire result (below) |
| `MessageRow` | type | `typeof messages.$inferSelect` (Drizzle row) |

## Repository (`messages.repo.ts`)

`import 'server-only'`. Only module allowed to import db core
(`dbRls`/`SessionLike` from `@/lib/db`, `messages` from `@/lib/db/schema`,
`insertAuditLog` from `@/lib/db/auditLog`). All reads/writes go through
`dbRls(session, tx => …)` so they run inside an RLS-scoped transaction.

| Function | Params | Return | Mode |
| --- | --- | --- | --- |
| `listMessagesForClient` | `(session: SessionLike, clientId: string, opts?: { limit?: number; offset?: number })` | `Promise<MessageRow[]>` | RLS read |
| `countUnreadForClient` | `(session: SessionLike, clientId: string)` | `Promise<number>` | RLS read |
| `markMessageRead` | `(session: SessionLike, clientId: string, messageId: string)` | `Promise<MarkMessageReadResult>` (repo variant — see below) | RLS write + audit |

Repo-level `MarkMessageReadResult` (unchanged from the original `lib/db`):
```ts
| { ok: true }
| { ok: false; code: ResultCode.NotFound }
| { ok: false; code: ResultCode.ServerError; ref: string }
```

Behavior details:
- `listMessagesForClient`: newest first, `sent_at desc nulls last`; default
  `LIMIT 200`, `OFFSET 0`; filtered `WHERE client_id = clientId` (belt &
  braces on top of RLS).
- `countUnreadForClient`: `count(*)::int WHERE client_id = clientId AND read = false`;
  returns `0` when no rows.
- `markMessageRead`: `UPDATE … SET read = true, read_at = now()
  WHERE id = messageId AND client_id = clientId RETURNING id`. On a hit, writes
  an audit row (`AuditAction.MessageMarkedRead`, entity `message`) **inside the
  same tx** (atomic). 0 rows → `{ ok:false, code: NotFound }`. Thrown error →
  caught, logs `AuditEvent.MarkMessageReadFailed` with an 8-char `ref` to
  stderr, returns `{ ok:false, code: ServerError, ref }`.

## Service (`messages.service.ts`)

`import 'server-only'`. Pure orchestration: no `'use server'`, no `next/*`,
no Supabase. May import the repository + `lib/constants/*`. Returns a
**domain** result (not `ResultCode`).

```ts
export type MarkMessageReadResult =
  | { kind: 'ok' }
  | { kind: 'not_found' }
  | { kind: 'error'; ref: string };

markMessageReadForClient(
  session: SessionLike, clientId: string, messageId: string
): Promise<MarkMessageReadResult>
```

Calls `markMessageRead(session, clientId, messageId)` (tenant-scoped) and maps
the repo result: `ok → {kind:'ok'}`, `NotFound → {kind:'not_found'}`, else
`{kind:'error', ref}`. No DB access of its own; the `clientId` scoping is the
service's tenant-isolation guarantee.

## Controller (`messages.controller.ts`)

`'use server'` + `import 'server-only'`. The only client-callable surface.

```ts
export type MarkMessageReadResult =
  | { ok: true }
  | { ok: false; code: ResultCode.Unauthorized | ResultCode.NotFound }
  | { ok: false; code: ResultCode.ServerError; ref: string };

markMessageReadAction(messageId: string): Promise<MarkMessageReadResult>
```

Flow (controller responsibilities only):
1. **Validate** — `markMessageReadSchema.safeParse({ messageId })` (zod uuid).
   On failure → `{ ok:false, code: NotFound }` (malformed id is indistinguishable
   from a missing one — no leak).
2. **Auth/tenant** — `requireClient()`. On `!ok` → `{ ok:false, code: Unauthorized }`.
3. **One service call** — `markMessageReadForClient(ctx.session, ctx.client.id, id)`.
4. **Map** domain `{ kind }` → `ResultCode`:
   `ok → {ok:true}`, `not_found → NotFound`, `error → {ServerError, ref}`.

Exported name + return type are byte-identical to the pre-migration action, so
the client and the `lib/actions/messages.ts` shim are unaffected.

## Schema (`message.schema.ts`)

```ts
markMessageReadSchema = z.object({ messageId: z.string().uuid() })
type MarkMessageReadInput = z.infer<typeof markMessageReadSchema>
```

## Component (`components/messages-view.tsx`)

`"use client"`. Named export `MessagesView`. Props:
- `messages: MessageRow[]`
- `onMarkedRead(messageId: string)` — optimistic; parent decrements the unread
  badge / flips the row before the action resolves.
- `onMarkReadFailed(messageId: string)` — rollback when the action fails.

Imports the row type from `messages.repo` and the action from
`messages.controller`. On click of an **unread inbound** card it calls
`onMarkedRead` immediately, then `markMessageReadAction(msg.id)` in a
transition; on `!result.ok` it calls `onMarkReadFailed` and shows a
destructive toast (appending `(ref …)` for `ServerError`). Outbound and
already-read messages are not clickable. Inbound read messages show a
`read_at` tooltip.

## RLS / tenant invariants

- `messages` is tenant-scoped; the RLS policy joins through
  `processes` / `user_clients`, so a foreign-tenant `client_id` yields 0 rows.
- Every repo call runs under `dbRls(session, …)` → RLS is enforced in-tx.
- A user can only mark-read messages belonging to **their own** client:
  the UPDATE is filtered by both `id` and `client_id`, and RLS independently
  blocks cross-tenant rows. Cross-tenant / unknown ids → `not_found`
  (no existence leak).
- The audit row commits atomically with the UPDATE (same tx) or not at all.

## User-facing flow

1. Portal RSC loads the inbox via `listMessagesForClient` and the unread count
   via `countUnreadForClient`; the count drives a sidebar/nav **unread badge**.
2. `MessagesView` renders messages thread-style (ascending by `sent_at`).
   Unread inbound messages are highlighted and clickable.
3. Clicking an unread inbound message optimistically clears its unread state
   and decrements the badge, then runs `markMessageReadAction`. Success keeps
   the optimistic state (now with a `read_at` tooltip); failure rolls back and
   toasts (with a correlation `ref` on server errors).

## Test seams (no implementation reading required)

- **Repo (integration, real RLS):** seed two tenants; assert
  `listMessagesForClient` / `countUnreadForClient` only see own-tenant rows;
  `markMessageRead` returns `NotFound` for a cross-tenant id and writes one
  audit row on success.
- **Service (unit):** stub the repo; assert the `{ kind }` mapping for each
  repo result, and that `clientId` is forwarded unchanged.
- **Controller (unit):** stub `requireClient` + service; assert
  invalid/non-uuid id → `NotFound` (service not called), `!ok` auth →
  `Unauthorized`, and `{ kind }` → `ResultCode` mapping incl. `ref` passthrough.
- **Component (e2e):** unread inbound click decrements badge + flips row;
  forced action failure rolls back and toasts; outbound/read cards inert.
