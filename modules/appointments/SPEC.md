# Appointments module

Feature module for client-initiated appointment booking in the portal. A client
picks a responsible tech + date/time + subject in the scheduling view; a server
action persists the appointment (tenant-scoped, audited) and the team is
notified by email.

## Layering

```
components/scheduling-view.tsx   (client) ─┐
                                            ▼
appointments.controller.ts  ('use server') — auth + Zod + map domain → ResultCode
                                            ▼
appointments.service.ts     (orchestration) — repo writes + notification email
                                            ▼
appointments.repo.ts  +  responsible-techs.repo.ts   (only files touching @/lib/db core)
```

- **repo** — the only layer importing `dbRls` / `getDbService` from `@/lib/db`.
  Keeps `import 'server-only'`.
- **service** — pure orchestration. No `'use server'`, no `next/*`, no Supabase.
  Imports repos + `@/lib/email/*` + `@/lib/constants/*`. Returns a DOMAIN result
  (`{ kind }`), never a `ResultCode`.
- **controller** — `'use server'` action. `requireClient()` + Zod parse + ONE
  service call + map `{ kind }` → `ResultCode`.
- **barrel** (`index.ts`) — re-exports the controller fn + row/contract TYPES.

## Barrel exports (`@/modules/appointments`)

| Export | Kind | From |
| --- | --- | --- |
| `createAppointmentAction` | server action (value) | `appointments.controller` |
| `Appointment` | type (select row) | `appointments.repo` |
| `NewAppointment` | type (insert subset) | `appointments.repo` |
| `ResponsibleTech` | type (select row) | `responsible-techs.repo` |
| `ResponsibleTechOption` | type (`id`/`slug`/`display_name`) | `responsible-techs.repo` |
| `CreateAppointmentInput` | type (`z.infer` of schema) | `appointment.schema` |
| `CreateAppointmentResult` | type (action return) | `appointment.schema` |

## Signatures

### Controller — `appointments.controller.ts`

```ts
createAppointmentAction(input: unknown): Promise<CreateAppointmentResult>
```

Validates / maps (does NOT orchestrate):
1. `requireClient()` → if not `ok`, return `{ ok: false, code: Unauthorized }`.
2. `createAppointmentSchema.safeParse(input)` → on failure
   `{ ok: false, code: Validation }`.
3. Calls the service ONCE with `{ session, clientId, clientName }` + parsed data.
4. Maps the service domain result → `ResultCode`:
   - `ok`            → `{ ok: true, id }`
   - `double_booked` → `{ ok: false, code: DoubleBooked }`
   - `unauthorized`  → `{ ok: false, code: Unauthorized }`
   - `error`         → `{ ok: false, code: ServerError, ref }`

`CreateAppointmentResult` (wire contract, from `appointment.schema`):
```ts
| { ok: true; id: string }
| { ok: false; code: Validation | Unauthorized | DoubleBooked | ServerError; ref?: string }
```

### Service — `appointments.service.ts`

```ts
createAppointment(
  deps: { session: SessionLike; clientId: string; clientName: string },
  input: CreateAppointmentInput,
): Promise<CreateAppointmentDomainResult>
```

Orchestrates:
1. Maps `input` → `NewAppointment` (`subject`→`title`, `notes`→`description`,
   `scheduled_for` ISO string → `Date` for `starts_at`; `ends_at`/`process_id`
   null) and calls the repo `createAppointment`.
2. On repo failure, translates the repo `ResultCode` into a domain `kind`
   (`DoubleBooked`→`double_booked`, `Unauthorized`→`unauthorized`, else
   `error` carrying `ref`) and returns WITHOUT sending email.
3. On success — **email side-effect** (best-effort, AFTER the commit):
   - `getResponsibleTechName(session, techId)` — client-readable.
   - `getResponsibleTechEmail(techId)` — service-only column.
   - `sendAppointmentCreatedEmail({ clientName, techName, techEmail,
     startsAtIso, subject, notes })`.
   - Any throw in this block is caught, logged as
     `AuditEvent.AppointmentNotifyEmailFailed` (with `appointment_id`), and
     swallowed — the booking still returns `ok`.
4. Returns `{ kind: 'ok', id }`.

Domain result shape:
```ts
type CreateAppointmentDomainResult =
  | { kind: 'ok'; id: string }
  | { kind: 'double_booked' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; ref?: string }
```

### Repo — `appointments.repo.ts`

| Function | Params | Returns | Mode |
| --- | --- | --- | --- |
| `listAppointmentsForClient` | `(session, clientId)` | `Appointment[]` | `dbRls` |
| `listAppointmentsForTech` | `(session, techId, dateFromIsoDate, dateToIsoDate)` | `Appointment[]` (non-cancelled, `[from, to]` inclusive by UTC date) | `dbRls` |
| `createAppointment` | `(session, clientId, payload: NewAppointment)` | `CreateAppointmentResult` (repo variant: `{ok:true;id}` \| `DoubleBooked` \| `Unauthorized` \| `{ServerError; ref}`) | `dbRls` (+ service-mode audit on failure) |

- INSERT + success audit log run in the SAME tx (commit/rollback together).
- Postgres error mapping: `23505` (unique violation
  `appointments_tech_slot_uniq`) → `DoubleBooked`; `42501`
  (insufficient_privilege / RLS reject) → `Unauthorized`; otherwise
  `ServerError` with an 8-char `ref`. Failure is audited on a fresh
  service-mode connection (`AuditAction.AppointmentCreateFailed`).

### Repo — `responsible-techs.repo.ts`

| Function | Params | Returns | Mode |
| --- | --- | --- | --- |
| `listActiveResponsibleTechs` | `(session)` | `ResponsibleTechOption[]` (active, ordered by `display_name`) | `dbRls` |
| `getResponsibleTechName` | `(session, techId)` | `string \| null` | `dbRls` |
| `getResponsibleTechEmail` | `(techId)` | `string \| null` | `getDbService()` (RLS-bypass) |

## RLS invariants

- **appointments** — tenant-scoped via `dbRls(session, ...)`. Reads/writes are
  filtered to the caller's tenant(s); a client only ever sees / writes rows for
  their own client. The `appointments_tech_slot_uniq` constraint enforces one
  active booking per tech per slot (surfaces as `double_booked`). A write that
  RLS rejects (`42501`) is surfaced as `unauthorized` (stale-session UX).
- **responsible_techs** — intentionally SHARED (not tenant-scoped). Non-sensitive
  columns (`id`/`slug`/`display_name`) are readable by the `authenticated`
  (client) role under `dbRls`. The `email` column is locked by column-level
  grants to service/staff only — hence `getResponsibleTechEmail` must use
  `getDbService()` (no session), and the client role cannot select `email`.

## User-facing flow

1. Portal renders `SchedulingView` with `techs: ResponsibleTechOption[]`
   (loaded server-side via `listActiveResponsibleTechs`).
2. Client selects tech + date (Mon–Thu, today-or-later) + 30-min slot
   (09:00–17:00) + subject (+ optional notes). Date/time is combined into an
   ISO timestamp anchored to `America/Sao_Paulo` (`combineDateTimeIso`).
3. Submit calls `createAppointmentAction(...)` (server action).
4. On `ok`: success toast + form reset. On failure: a `ResultCode`-specific
   destructive toast (`double_booked` / `validation` / `unauthorized` /
   `server_error` with optional `ref`).
5. Side-effect: the team mailbox (`APPOINTMENT_NOTIFY_EMAIL`, default
   `contato@sustentec-engenharia.com.br`) receives a notification email, CC'ing
   the selected tech's email. Email failure never blocks the booking.

## Test guidance

- **Unit (service, fake repos + fake email):** inject a fake `createAppointment`
  repo + fake `sendAppointmentCreatedEmail`.
  - repo `ok` → asserts email sent with mapped fields (`subject`/`notes`/
    `startsAtIso`); returns `{ kind: 'ok', id }`.
  - repo `DoubleBooked`/`Unauthorized`/`ServerError` → mapped to the matching
    `kind`; email NOT sent.
  - email throws → result still `{ kind: 'ok' }`; failure logged.
  (Service is `server-only` but has no `'use server'`/`next/*`/Supabase, so it
  is unit-testable with module mocks.)
- **Integration (repo RLS):** with a real DB + a session for tenant A, assert
  `createAppointment` writes only A's rows, a duplicate tech/slot →
  `DoubleBooked`, and a missing user-client link → `Unauthorized` (42501).
  Assert `getResponsibleTechEmail` reads `email` (service) while a `dbRls`
  client-role select of `email` is denied.
- **e2e (booking flow):** drive `SchedulingView`, submit a valid booking, assert
  success toast AND that the notification email lands in Inbucket (subject +
  tech CC).

## Back-compat shims (legacy import paths still work)

- `lib/db/appointments.ts` → `export * from '@/modules/appointments/appointments.repo'`
- `lib/db/responsibleTechs.ts` → `export * from '@/modules/appointments/responsible-techs.repo'`
- `lib/schemas/appointment.ts` → `export * from '@/modules/appointments/appointment.schema'`
- `lib/actions/appointments.ts` → `export { createAppointmentAction } from '@/modules/appointments/appointments.controller'`
- `components/portal/scheduling-view.tsx` → `export { SchedulingView } from '@/modules/appointments/components/scheduling-view'`
