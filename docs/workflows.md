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
