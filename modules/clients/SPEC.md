# Clients (cadastral) feature module — SPEC

The clients module owns the portal "Dados Cadastrais" (registration data)
domain: reading a tenant's client row and editing its contact/address fields.
It follows the layered contract **controller → service → repository → db**,
where only the repository touches the DB core.

## Layout

```
modules/clients/
  clients.repo.ts          repository (only DB-core importer)
  client.schema.ts         Zod schema + input/result types (plain ESM)
  clients.service.ts       orchestration (pure, returns DOMAIN result)
  clients.controller.ts    'use server' action (Zod + auth + map → ResultCode)
  index.ts                 barrel (public surface)
  components/
    dados-cadastrais-view.tsx   client React component (edit form)
  SPEC.md
```

### Back-compat shims (old paths, re-export only)

- `lib/db/clients.ts` → `export * from '@/modules/clients/clients.repo'`
- `lib/schemas/client.ts` → `export * from '@/modules/clients/client.schema'`
- `lib/actions/clients.ts` → `export { updateClientAction } from '@/modules/clients/clients.controller'`
- `components/portal/dados-cadastrais-view.tsx` → `export { DadosCadastraisView } from '@/modules/clients/components/dados-cadastrais-view'`

External READ-ONLY consumers still importing old paths keep working:
`lib/email/payment-overdue.ts`, `lib/notion/adapter.ts`,
`app/api/cron/payment-overdue/route.ts`, `components/portal/portal-shell.tsx`.

## Barrel exports (`modules/clients/index.ts`)

| Export | Kind | Signature |
| --- | --- | --- |
| `updateClientAction` | server action | `(input: unknown) => Promise<ClientCadastralResult>` |
| `ClientCadastralResult` | type | see schema section |
| `Client` | type | `typeof clients.$inferSelect` (full client row) |

## Repository (`clients.repo.ts`)

`import 'server-only'`. The ONLY module importing `dbRls` / `getDbService` /
`SessionLike` from `@/lib/db` and `clients` from `@/lib/db/schema`.

| Function | Params | Returns | DB mode | Notes |
| --- | --- | --- | --- | --- |
| `getClientById` | `clientId: string` | `Promise<Client \| null>` | **service** (bypasses RLS) | cross-tenant; for Notion/cron/scripts. Filters `deleted_at IS NULL`. |
| `getClientByIdRls` | `session: SessionLike, clientId: string` | `Promise<Client \| null>` | **rls** | portal read; row reachable only via caller's `user_clients` link + `WHERE id=?` seatbelt. Filters `deleted_at IS NULL`. |
| `updateClient` | `session: SessionLike, clientId: string, partial: ClientCadastralUpdate` | `Promise<Client \| null>` | **rls** | patches cadastral fields, sets `updated_at = now()`, `RETURNING` row. `null` if missing / soft-deleted / out of tenant scope. |

Exported types: `Client` (full row), `NewClient` (notion-create subset),
`ClientCadastralUpdate` = `Partial<Pick<insert, contact_name | contact_role |
contact_email | contact_phone | address_street | address_city | address_state
| address_postal_code>>`. Notion-sync fields, soft-delete timestamps, and
tenant identity (`id`, `name`) are deliberately NOT patchable.

## Schema (`client.schema.ts`)

Plain ESM — no `'use server'`, no `'server-only'` — so both the server action
and the client form (`@hookform/resolvers/zod`) can import it.

- `clientCadastralSchema` — `z.object` over the 8 cadastral fields. Each:
  `string().trim().max(N).optional().or(z.literal('')).transform(empty → undefined)`.
  `contact_email` additionally `.refine` matches a simple email regex (error
  message `'portal.dados.validation.invalidEmail'` — an i18n key, not literal
  text). Max lengths: name/role 200, email 320, phone 40, street 300,
  city/state 120, postal_code 20.
- `ClientCadastralInput = z.infer<typeof clientCadastralSchema>` (all fields
  `string | undefined`).
- `ClientCadastralResult` (the action's return contract):
  ```ts
  | { ok: true }
  | { ok: false; code: ResultCode.Validation | ResultCode.Unauthorized
                    | ResultCode.NotFound | ResultCode.ServerError; ref?: string }
  ```

## Service (`clients.service.ts`)

Pure orchestration: no `'use server'`, no `next/*`, no Supabase, no
`ResultCode`. Imports repositories + the shared `lib/db/auditLog` repo +
`lib/constants/audit-events`.

`updateClientCadastral(args): Promise<UpdateClientCadastralResult>`

Args:
- `session: SessionLike` — caller's RLS session (used for both writes).
- `client: Client` — caller's current row; seeds the audit `before`.
- `actorId: string` — `auth.uid()`, written to `audit_log.actor_id`.
- `patch: ClientCadastralUpdate` — already-validated cadastral patch.

Domain result:
```ts
type UpdateClientCadastralResult =
  | { kind: 'ok' }
  | { kind: 'not_found' }
  | { kind: 'error'; ref: string };
```

Orchestration steps:
1. `updateClient(session, client.id, patch)`. If `null` → `{ kind: 'not_found' }`.
2. Build the audit diff: `before` = the 8 cadastral fields read off `client`;
   `after` = `patch`. Write via `insertAuditLog({ action:
   AuditAction.ClientUpdated, entity_type: 'client', entity_id: client.id,
   actor_id, before, after }, { mode: 'rls', session })`.
3. Return `{ kind: 'ok' }`.
4. On any thrown error: mint `ref = randomUUID().slice(0,8)`, emit a
   structured `console.error` (`event: AuditEvent.ClientUpdateFailed, ref,
   clientId, error`), return `{ kind: 'error', ref }`.

The `randomUUID` ref + the failure `console.error` live HERE, not the controller.

## Controller (`clients.controller.ts`)

`'use server'` + `import 'server-only'`. Imports the Zod schema, `requireClient`
(`@/lib/auth/tenant`), `ResultCode`, and the service. Touches NO repository or
DB directly.

`updateClientAction(input: unknown): Promise<ClientCadastralResult>`

1. `clientCadastralSchema.safeParse(input)`; on failure →
   `{ ok: false, code: ResultCode.Validation }`.
2. `requireClient()`; on `!ok` → `{ ok: false, code: ResultCode.Unauthorized }`
   (no session OR no tenant link both collapse here).
3. Call `updateClientCadastral({ session, client, actorId: user.id, patch })`.
4. Map the domain `kind` → wire `ResultCode`:
   - `ok` → `{ ok: true }`
   - `not_found` → `{ ok: false, code: ResultCode.NotFound }`
   - `error` → `{ ok: false, code: ResultCode.ServerError, ref }`

Controller does ALL the `ResultCode` mapping; service NEVER references `ResultCode`.

## RLS invariants

- The client row is tenant-scoped: `updateClient` / `getClientByIdRls` run via
  `dbRls(session, ...)` as role `authenticated`. A user can only UPDATE/SELECT
  rows reachable through their `user_clients` link; out-of-scope ids yield
  `null` (UPDATE affects 0 rows → `null` return → controller `NotFound`).
- The audit-log INSERT runs in the SAME `rls` mode with the SAME `session`, so
  the audit row is bound to the same `auth.uid()` the `clients` policy checked —
  a caller can never write an audit row attributed to another identity.
- `deleted_at IS NULL` filters mean soft-deleted rows are invisible to the
  portal path.

## User-facing flow (edit cadastral form → save)

`DadosCadastraisView` ("use client", `components/dados-cadastrais-view.tsx`):
- Read mode renders the client's cadastral fields (CNPJ formatted, address
  joined, blanks shown as `—`). Edit button toggles edit mode.
- Edit mode is a `react-hook-form` form (`zodResolver(clientCadastralSchema)`)
  over the 8 fields; `contact_email` shows an inline i18n error on invalid.
- On submit: `startTransition(updateClientAction(values))`.
  - `result.ok` → optimistic merge into local `snapshot` (typed-empty →
    `null`), success toast (`portal.dados.toast.saved`), exit edit mode.
  - `!result.ok` → destructive toast (`portal.dados.toast.error`).

## Test seams (no implementation reading needed)

- **Unit (service)**: inject a fake `updateClient` repo + fake `insertAuditLog`.
  Assert: returns `not_found` when repo returns `null` (and no audit write);
  returns `ok` and writes one audit row with `before` = the 8 fields off
  `client` and `after` = `patch` when repo returns a row; returns
  `{ kind:'error', ref }` (8-char ref) and logs when a dependency throws.
- **Integration (RLS)**: with a real session, `updateClient` mutates only the
  caller's own tenant row; an id outside scope returns `null`; the audit row
  lands with `actor_id === auth.uid()`.
- **E2E (form save)**: open Dados Cadastrais, edit a field, save → success
  toast + persisted value on reload; invalid email → inline error, no submit.
