# Marketing module — SPEC

Public marketing site (single-page sections) + the unauthenticated contact
form. Layered as **controller → service → repository**, with a public barrel
(`modules/marketing/index.ts`).

## Directory

```
modules/marketing/
  index.ts                 # public barrel
  contact.controller.ts    # 'use server' action: headers() + rate-limit + Zod
  contact.service.ts       # orchestration: anon insert + audit log
  contact.repo.ts          # 'server-only' DB access (dbAnon INSERT)
  contact.schema.ts        # Zod schema + domain wire types
  components/              # 9 marketing section components
    header.tsx hero-section.tsx stats-section.tsx services-section.tsx
    tracker-section.tsx values-section.tsx support-section.tsx
    contact-section.tsx footer.tsx
```

### Back-compat shims (old paths, READ-ONLY consumers unchanged)

- `lib/actions/contact.ts` → `export { submitContact } from '@/modules/marketing/contact.controller'`
- `lib/db/contactSubmissions.ts` → `export * from '@/modules/marketing/contact.repo'`
- `lib/schemas/contact.ts` → `export * from '@/modules/marketing/contact.schema'`
- `components/<name>.tsx` (all 9) → `export { <Name> } from '@/modules/marketing/components/<name>'`

`app/page.tsx` and `app/layout.tsx` import the old `@/components/*` paths and
keep working via the shims (not edited).

## Barrel exports (`@/modules/marketing`)

| Export | Kind | Signature / Type |
| --- | --- | --- |
| `submitContact` | server action | `(input: unknown) => Promise<ContactSubmissionResult>` |
| `Header`, `HeroSection`, `StatsSection`, `ServicesSection`, `TrackerSection`, `ValuesSection`, `SupportSection`, `ContactSection`, `Footer` | React components | `() => JSX.Element` (all `"use client"`) |
| `contactSubmissionSchema` | Zod schema | `ZodObject` (see below) |
| `ContactSubmissionInput` | type | `z.infer<typeof contactSubmissionSchema>` |
| `ContactSubmissionResult` | type | discriminated union (see below) |

## Schema (`contact.schema.ts`)

`contactSubmissionSchema` — fields (all trimmed):

- `name`: string, 2–200 chars. Errors: `contact.validation.nameRequired`.
- `email`: string, valid email, max 320. Errors: `contact.validation.emailInvalid`.
- `phone`: optional string, max 40; `''` is coerced to `undefined`.
- `message`: string, 5–5000 chars. Errors: `contact.validation.messageRequired`.

Error messages are i18n keys resolved via `t()` in the UI (kept in sync with
`lib/language-context.tsx`).

```ts
type ContactSubmissionInput = {
  name: string; email: string; phone?: string; message: string;
}

type ContactSubmissionResult =
  | { ok: true }
  | { ok: false; code: ResultCode.Validation | ResultCode.RateLimited | ResultCode.ServerError; ref?: string }
```

`ResultCode` is the string-enum wire contract from `@/lib/constants/result-codes`
(serialization-safe across the server-action → client boundary). `ref` is an
8-char correlation id, present only on `ServerError`.

## Repository (`contact.repo.ts`)

`import 'server-only'`. The **only** importer of `dbAnon`/`@/lib/db` core in
this module.

```ts
type NewContactSubmission = Pick<
  typeof contactSubmissions.$inferInsert,
  'name' | 'email' | 'phone' | 'message' | 'ip_hash' | 'source' | 'user_agent'
>;

insertContactSubmission(input: NewContactSubmission): Promise<{ id: <pk> }>
```

- **DB mode: anon.** Runs inside `dbAnon((tx) => …)` — a Postgres connection
  bound to the `anon` role. RLS on `contact_submissions` permits `INSERT`
  (`WITH CHECK (true)`) but **denies `SELECT`** to anon, so a leaked anon
  connection can write but never read back historical submissions.
- Defaults applied: `phone`/`ip_hash`/`user_agent` → `null` when omitted;
  `source` → `'marketing_site'`.
- Returns the inserted row's `id` (the `.returning({ id })` projection).

## Controller ↔ service split

### Controller (`contact.controller.ts`) — request-framework concerns

`'use server'` + `import 'server-only'`. Exported entry `submitContact(input)`.
Owns everything that touches the request framework:

1. **Zod parse** — `contactSubmissionSchema.safeParse(input)`. On failure →
   `{ ok: false, code: ResultCode.Validation }` (no DB call).
2. **`headers()` read** — derives client IP from `x-forwarded-for` (first hop)
   falling back to `x-real-ip`, else `'unknown'`; reads `user-agent`.
   - `ipHash = sha256(ip)` or `null` when IP is `'unknown'`.
   - `emailHash = sha256(normalized email)` (lowercased + trimmed) — used only
     for rate-limit keying.
3. **Rate limit** — `checkContactRateLimit({ ipHash, emailHash })`
   (`@/lib/rate-limit`, Upstash). On `!ok` → `{ ok: false, code: ResultCode.RateLimited }`.
4. Calls **one** service fn `submitContactSubmission(data, { ipHash, userAgent })`.
5. **Maps domain result → ResultCode**: `{ kind: 'ok' }` → `{ ok: true }`;
   `{ kind: 'error', ref }` → `{ ok: false, code: ResultCode.ServerError, ref }`.

The controller never imports the repo or `@/lib/db` directly.

### Service (`contact.service.ts`) — pure orchestration

No `'use server'`, no `next/*`, no direct supabase. Imports the repo +
`@/lib/constants/audit-events`.

```ts
type ContactServiceResult = { kind: 'ok' } | { kind: 'error'; ref: string }
type ContactSubmissionContext = { ipHash: string | null; userAgent: string | null }

submitContactSubmission(
  data: ContactSubmissionInput,
  ctx: ContactSubmissionContext,
): Promise<ContactServiceResult>
```

- Calls `insertContactSubmission` (anon insert) with
  `source: 'marketing_site'`, `ip_hash: ctx.ipHash`, `user_agent: ctx.userAgent`.
- On success → `{ kind: 'ok' }`.
- On thrown error → generates an 8-char `ref` (`randomUUID().slice(0,8)`),
  emits a structured `console.error` audit line
  (`{ event: AuditEvent.ContactSubmitFailed, ref, error }`), returns
  `{ kind: 'error', ref }`. Never throws.

The IP/email **hashing** lives in the controller (rate-limit keying is a
request-framework concern); the service receives the already-hashed `ipHash`.

## Domain-result shape & RateLimited surfacing

- Service returns the internal `{ kind }` result (`ok` / `error`).
- `RateLimited` is **not** a service outcome — it is decided entirely in the
  controller (before the service is called) and surfaced as
  `{ ok: false, code: ResultCode.RateLimited }`. No DB write happens when rate
  limited.
- `Validation` likewise short-circuits in the controller before any service or
  DB call.

## RLS invariants

- Role `anon` **may `INSERT`** into `contact_submissions` (`WITH CHECK (true)`).
- Role `anon` **may NOT `SELECT`** other rows — no read policy grants it.
- Therefore the anon path is write-only by construction; staff read access is a
  separate (authenticated) policy outside this module.

## User-facing flow (`ContactSection`)

`"use client"`. Uses `react-hook-form` + `zodResolver(contactSubmissionSchema)`
(`mode: 'onBlur'`). On submit, inside a `useTransition`, calls `submitContact`:

- `result.ok` → success toast (`contact.success.*`), `reset()` the form.
- `code === Validation` → `contact.error.validation` toast.
- `code === RateLimited` → `contact.error.rateLimited` toast.
- else (`ServerError`) → `contact.error.server`, appending `(ref: <ref>)` when
  a `ref` is present. All error toasts use `variant: "destructive"`.

Client-side Zod validation generally prevents `Validation` from the server;
field errors render inline via i18n keys.

## Test guidance

- **Unit (service)** — mock `insertContactSubmission`. Assert: success returns
  `{ kind: 'ok' }`; a thrown repo error returns `{ kind: 'error', ref }` with
  an 8-char ref and emits the `ContactSubmitFailed` audit log. Service has no
  framework deps, so no `headers()`/Next mocking needed.
- **Integration (anon RLS)** — against a real DB as the `anon` role: an
  `insertContactSubmission` succeeds; a direct `SELECT * FROM contact_submissions`
  by anon returns zero rows / is denied (deny-select invariant).
- **E2E (contact submit)** — fill + submit the form: first submit → success
  toast + form reset (happy path). Second submit within the 5-minute window
  (same IP/email) → rate-limited toast (`contact.error.rateLimited`), assuming
  Upstash creds are configured (limiter degrades to allow-all when unset).
