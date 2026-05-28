# Workflows

## Worktrees

Branches are checked out under `./.worktrees/<branch-name>`, which is gitignored. This keeps the main checkout clean and lets you run `pnpm dev` against multiple branches in parallel.

```bash
# Create a new branch and worktree from main
git worktree add ./.worktrees/feature-x -b feature-x main

# List active worktrees
git worktree list

# Clean up after merging
git worktree remove ./.worktrees/feature-x
```

Notes:

- Do not commit *in* the main checkout while you have unmerged work in a worktree — pick one and finish it.
- `pnpm install` is per-worktree. Each `.worktrees/<branch>/` directory needs its own `node_modules`. Plan disk accordingly.
- Don't `git push` a worktree branch from the main checkout; push from inside the worktree to be unambiguous.

## Local dev loop

```bash
pnpm install        # one-time, per worktree
pnpm dev            # http://localhost:3000
```

Environment: only `NODE_ENV` is referenced today, by [app/layout.tsx](../app/layout.tsx) to gate Vercel Analytics on production. There is no `.env.example` and no other env vars are wired.

## Branch → PR → deploy

1. Create a worktree on a new branch off `main`.
2. Make changes, commit, push.
3. Open a PR against `main`.
4. **Merging to `main` triggers v0 / Vercel auto-deploy.** This project is linked to v0 project ID `prj_hp4OvygiRerka65XShcKsqg686cu`. There is no separate deploy step.
5. Verify the deploy in the Vercel dashboard.

The autoskill `v0-deploy-awareness` (installed via `npx autoskills`) reminds you of step 4 when you're about to push or merge.

## Bypassing v0

If v0 is having issues, a direct Vercel CLI deploy still works:

```bash
pnpm dlx vercel deploy --prod
```

This pushes the *local* state to production and **bypasses any v0-side review**. Use sparingly and only when explicitly needed — normal flow is merge-to-main.

## What is not in the loop

- No CI workflows (`.github/workflows/` is absent).
- No pre-commit hooks (no husky, no lint-staged).
- No test runner (Vitest/Playwright deferred — see [roadmap.md](roadmap.md)).
- `pnpm lint` is currently broken: see [roadmap.md](roadmap.md).

## Database migrations

Database migrations run from a dev machine via `pnpm db:migrate` against the shared Supabase project before merging the PR. Vercel only builds the Next.js app — it does not run migrations.

Schema migrations under `drizzle/migrations/` are **generated only**: run `pnpm db:generate` after editing `lib/db/schema.ts` and commit the resulting file. Never hand-edit a generated migration. Custom SQL that drizzle-kit cannot produce (RLS policies, custom indexes, views, triggers, data backfills) lives under `drizzle/custom/` and is picked up by `pnpm db:migrate` alongside generated migrations.

### One-time backfills

If a column is added with no default and historical rows need a value, document the backfill SQL here and run it during cutover. Current backfills:

- **`messages.read_at` (issue #22 §4)** — after `pnpm db:migrate` applies the schema, run once per environment:
  ```sql
  UPDATE messages
  SET    read_at = COALESCE(updated_at, created_at, now())
  WHERE  read = true AND read_at IS NULL;
  ```
  Idempotent. Safe to re-run.

## Notion sync cutover

The canonical DB is populated from Notion in a fixed sequence. Skipping a step risks an empty portal or duplicate audit-log entries.

1. **Schema** — `pnpm db:migrate` against the target environment.
2. **Notion adapter** is already deployed (PRs #23–#26) — no action.
3. **Initial migration** — run once per environment:
   ```bash
   pnpm db:notion:migrate --dry-run     # preview against staging Notion
   pnpm db:notion:migrate               # write
   pnpm db:notion:migrate               # re-run, expect imported=0
   ```
   Scope to one client with `--client <cnpj>`. See [docs/runbooks/notion-initial-migration.md](runbooks/notion-initial-migration.md) for summary interpretation and fixing unmapped aliases.
4. **Enable cron** — once the canonical DB is populated, Vercel's `/api/cron/notion-sync` ticks every 15 minutes (config in [vercel.json](../vercel.json)). The first tick after a successful initial migration should be a no-op (incremental `last_edited_time` filter); a non-trivial first tick means the migration was skipped — that's recoverable since both paths are idempotent, but the audit-log `trigger` field will say `cron` not `initial_migration`.

### Onboarding a new client

Insert a row in `clients` with `name`, `notion_cnpj_filter` (digits-only string), and optionally a per-client `notion_integration_token` if the client uses their own Notion workspace. No deploy needed; the next cron tick imports their data.

## Secrets and rotation

Vercel project env vars (preview + production):

| Var | Used by | Rotation |
|---|---|---|
| `DATABASE_URL`, `DATABASE_DIRECT_URL` | Drizzle pool, migrations | When the Supabase Postgres password rotates. |
| `SUPABASE_SERVICE_ROLE_KEY` | `getDbService()` callers (Notion adapter, scripts, cron) | When the Supabase project key is regenerated. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-side Supabase client | When the Supabase project is reprovisioned. |
| `CRON_SECRET` | `/api/cron/notion-sync`, `/api/cron/payment-overdue`, `/api/notion/sync-now` | Quarterly, or any time the value leaks. Update Vercel cron headers if Vercel's auto-injection ever fails. |
| `NOTION_INTEGRATION_TOKEN` | Notion adapter (fallback when `clients.notion_integration_token` is null) | When the Notion integration is rotated. Validated lazily at sync time. |
| `RESEND_API_KEY` | Overdue-payment email sender | When Resend rotates the project key. Validated lazily at send time — overdue cron tolerates an empty value (logs `PaymentOverdueEmailFailed`, doesn't crash). |

## Row-level security

After PR feat/notion-cron-portal-batch, the Drizzle entry point is a factory: `getDbService()` / `dbRls(session, fn)` / `dbAnon(fn)`. Portal-facing helpers run under `dbRls` (the `authenticated` role with the user's JWT claims propagated), so `auth.uid()` resolves server-side and the policies in [drizzle/custom/0005_rls.sql](../drizzle/custom/0005_rls.sql) enforce tenant isolation at the database layer.

App-layer `WHERE client_id = ?` filters remain as belt-and-braces. Notion adapter and cron orchestrators stay on `getDbService()` because they legitimately cross tenants.
