# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (pnpm-lock.yaml is the source of truth).

- `pnpm dev` — Next.js dev server on http://localhost:3000
- `pnpm build` — production build (note: `typescript.ignoreBuildErrors: true` in next.config.mjs)
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint (flat config in [eslint.config.mjs](eslint.config.mjs)). Enforces the module/auth import boundaries (see "Architecture"). **Required to pass.**
- `pnpm typecheck` — `tsc --noEmit`. Run this separately: the build sets `typescript.ignoreBuildErrors: true`, so `pnpm build` will NOT catch type errors.
- `pnpm test` — Vitest **unit** project (fast, no DB).
- `pnpm test:int` — Vitest **integration** project (DB-backed, RLS-aware; needs a Postgres at `DATABASE_URL`, loaded from `.env.test`).
- `pnpm test:e2e` — Playwright e2e (boots `next build && next start`; needs the local Supabase stack).
- `pnpm dev:db:up` / `dev:db:down` / `dev:db:reset` — local Supabase stack (CLI + Docker); `reset` = `db reset && db:migrate && db:seed && seed:auth`.
- `pnpm dlx shadcn@latest add <component>` — add a shadcn primitive into `components/ui/` (style: `new-york`, baseColor: `neutral`, icons: `lucide`).

CI runs lint, typecheck, unit, integration, build, and e2e on every PR — see [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Architecture

A bilingual **public marketing site** plus a tenant-scoped **client portal** (`/portal`). Data lives in Postgres accessed via **Drizzle ORM** (postgres-js); **Supabase is used for authentication only** and is isolated behind an `AuthPort` seam. Notion is a canonical upstream synced in via an adapter.

Business code is organized by **feature module** under [modules/](modules/), not by layer. Each module owns its slice end-to-end with a strict layering:

```
modules/<domain>/
  <domain>.controller.ts   # 'use server' action — auth + Zod + maps domain result -> ResultCode
  <domain>.service.ts      # framework-free domain logic; returns a domain result { kind: ... }
  <domain>.repo.ts         # the ONLY layer that touches the DB (dbRls/dbAnon/getDbService)
  <domain>.schema.ts       # zod (when the domain has a write)
  components/              # the domain's React components
  __tests__/              # unit (*.test.ts) + integration (*.repo.int.test.ts)
  index.ts                # barrel: re-exports controller fns + row TYPES
  SPEC.md                 # the domain's contract (also the basis for its tests)
```

Domains: `marketing` (public site + contact), `clients` (cadastral), `processes` (dashboard/projects), `appointments`, `payments`, `messages`, `documents`, `milestones`, `tasks`. The Notion integration lives in [lib/notion/](lib/notion/) behind its own adapter boundary.

**Shared, NOT in a module:** [components/ui/](components/ui/) (shadcn primitives), the portal shell ([components/portal/portal-shell.tsx](components/portal/portal-shell.tsx), `portal-header.tsx`, `portal-sidebar.tsx`), the DB core ([lib/db/index.ts](lib/db/index.ts) + `schema`/`relations`/`enums`/`views` + the tenancy/profile/audit repos `tenants.ts`/`profiles.ts`/`auditLog.ts`), [lib/email/](lib/email/), [lib/auth/](lib/auth/), [lib/supabase/](lib/supabase/), [lib/constants/](lib/constants/), [lib/config*](lib/config.ts).

### Layer contract (enforced)

- **Controller** = the framework entrypoint (`'use server'` action or `app/api/**/route.ts`). Reads auth (`requireClient`), parses Zod, calls **one** service, maps the domain result to a `ResultCode`. No DB, no business rules.
- **Service** = framework-free domain logic + orchestration (repo calls, email, audit). No `'use server'`, no `next/*`, no Supabase. Returns a **domain** result (e.g. `{ kind: 'ok' | 'not_found' | 'error', ref? }`), never a `ResultCode`.
- **Repository** = the only modules importing `getDbService`/`dbRls`/`dbAnon` from `@/lib/db`. No auth, Supabase, email, or React.

These are enforced by `no-restricted-imports` blocks in [eslint.config.mjs](eslint.config.mjs):
1. View code (`components/**`, `modules/**/components/**`, `app/**/{page,layout}.tsx`) must not import `@/lib/db*`/`drizzle`/`postgres`/the Supabase server client at runtime (type-only imports are allowed). Get data through a module/controller; auth through the port.
2. The deprecated `db` singleton is gone — use `getDbService()`/`dbRls()`/`dbAnon()`.
3. `modules/**/*.service.ts` may not import `next/headers`, `next/navigation`, or `@/lib/supabase/*`.

Every controller/service/repo file starts with `import 'server-only'`.

### Auth (the Supabase seam)

All auth flows through [lib/auth/port.ts](lib/auth/port.ts) (`AuthPort`: `getCurrentUser`/`signIn`/`signOut`/`toClaims`). The only `@supabase/*` imports live in [lib/auth/adapters/](lib/auth/adapters/) (`supabase.server.ts` / `supabase.client.ts`) and [lib/supabase/](lib/supabase/). [lib/auth/tenant.ts](lib/auth/tenant.ts) bridges identity → tenant (`requireClient`, `sessionForUser`, and re-exports `getClientForUser`/`getProfileByUserId`). `dbRls(session, fn)` propagates the session as `request.jwt.claims` so the Postgres RLS policies (which still use `auth.uid()`/`auth.role()`) resolve. Swapping providers means writing one new adapter; the RLS layer is intentionally left on `auth.*` for now.

### i18n

Every user-facing string is keyed and looked up via `t("key")` from [lib/language-context.tsx](lib/language-context.tsx). PT is the default and fallback; EN is opt-in via the language switcher.

## Key patterns

- **Import alias**: `@/...` resolves to repo root (see [tsconfig.json](tsconfig.json)).
- **Modules over layers**: new business code goes in `modules/<domain>/`. Import a domain's public surface from its barrel `@/modules/<domain>` (controller fns + `use*` hooks + row TYPES). Server-only repo functions are imported from `@/modules/<domain>/<domain>.repo` by server callers (RSCs, route handlers, the Notion adapter).
- **Frontend talks to the backend only through hooks**: components reach the backend ONLY via a module's `use*` hook (`modules/<domain>/hooks/use-<name>.ts`, `'use client'`, wraps the server action, returns `{ mutate, pending, error }`) — never a controller/service/repo directly (type-only imports of their row/result TYPES are fine). Module barrels (`modules/<domain>/index.ts`) export repo TYPES only, never repo VALUES. Both are enforced by `no-restricted-imports` in [eslint.config.mjs](eslint.config.mjs). Cross-module imports use the `@/` alias; same-module imports may stay relative (`./`).
- **Result types**: actions return a discriminated `{ ok: true } | { ok: false; code: ResultCode; ref? }`; services return `{ kind: ... }`. No exceptions leak to the UI. Codes live in [lib/constants/result-codes.ts](lib/constants/result-codes.ts); audit events in [lib/constants/audit-events.ts](lib/constants/audit-events.ts).
- **Class merging**: use `cn()` from [lib/utils.ts](lib/utils.ts). Never hand-concatenate Tailwind classes.
- **Exports**: named function exports. Default exports only for Next.js `page`/`layout` files.
- **Icons**: lucide-react. **Forms**: react-hook-form + zod.
- **Theme**: `next-themes` is installed; the site is light-only right now.

## Component conventions

- [components/ui/](components/ui/) — shadcn/Radix primitives (generated by `shadcn add`). No business logic.
- [components/portal/](components/portal/) — the portal shell only (`portal-shell`, `portal-header`, `portal-sidebar`). Feature views live in their module's `components/`.
- `modules/<domain>/components/` — a domain's React components. File names kebab-case; exported component PascalCase.
- [hooks/](hooks/) — `use-*` hooks. [lib/](lib/) — shared utilities, config, contexts, the auth/DB/email/notion infrastructure.

## Adding a translation key

Edit [lib/language-context.tsx](lib/language-context.tsx). The `translations` object has `pt` and `en`. **A new key MUST be added to both in the same change** — there is no cross-language fallback; a missing key returns the key itself. PT is authored first. Never hardcode user-facing strings in JSX.

## Testing

- **Unit** (`pnpm test`): services tested with in-memory fake repos; pure functions tested directly. Files: `modules/**/__tests__/**/*.test.ts` (+ `lib/notion/__tests__`). Node env, no DB.
- **Integration** (`pnpm test:int`): repository tests against a real Postgres, **RLS-aware** (tenant-isolation, anon insert/deny-select). Files: `**/*.int.test.ts`. Needs `DATABASE_URL` (from `.env.test`); skips cleanly when unset.
- **E2e** (`pnpm test:e2e`): Playwright over the 7 portal/marketing flows. Auth via programmatic-login `storageState` (seeded users). Email asserted via local **Inbucket**; the rate limiter is open unless `UPSTASH_*` is set. Specs in [e2e/flows/](e2e/flows/); harness in [e2e/support/](e2e/support/).
- Each `modules/<domain>/SPEC.md` is the contract its tests are written against.

## Database & migrations

Drizzle schema in [lib/db/schema.ts](lib/db/schema.ts); generated migrations in `drizzle/migrations/`; hand-written SQL (indexes, views, **RLS policies** in `0005_rls.sql`) in `drizzle/custom/`. Apply with `pnpm db:migrate` (Drizzle migrations then idempotent custom SQL). **Production migrations are manual** — run `pnpm db:migrate` after merging schema changes; Vercel does not run them.

## Known quirks (preserve unless explicitly told to remove)

- [next.config.mjs](next.config.mjs): `typescript.ignoreBuildErrors: true` (run `pnpm typecheck` separately) and `images.unoptimized: true`.
- v0 sandbox files are gitignored (`__v0_*`, `.snowflake/`, `.v0-trash/`). Don't commit anything matching those.
- This repo is linked to v0 project `prj_hp4OvygiRerka65XShcKsqg686cu`. **Merging to `main` triggers a v0 / Vercel auto-deploy.** See [docs/workflows.md](docs/workflows.md).

## Branch workflow (worktrees)

Branches are checked out under `./.worktrees/<branch-name>` (gitignored):

```
git worktree add ./.worktrees/<branch> -b <branch> main   # create
git worktree list                                         # list
git worktree remove ./.worktrees/<branch>                 # cleanup
```

Don't `cd` into a worktree and commit in the main checkout simultaneously — work in one or the other.

## Commit signatures

**Do not add `Co-Authored-By: Claude` (or any Claude-related) trailers to commit messages.** Commits should be authored under the user's normal git identity with no attribution to Claude in the body or trailers. This applies to all commits, including squash-merges and amended commits.

## More

See [docs/](docs/) for non-code knowledge: conventions, i18n policy, deploy chain, design tokens, and the roadmap.
