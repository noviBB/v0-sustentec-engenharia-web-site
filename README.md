# v0-sustentec-engenharia-web-site

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app)

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_hp4OvygiRerka65XShcKsqg686cu)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/noviBB/v0-sustentec-engenharia-web-site" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>

## Database (local dev)

Copy `.env.local.example` to `.env.local` and fill five vars from the shared Supabase project:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (browser-safe).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (browser-safe).
- `SUPABASE_SERVICE_ROLE_KEY` — service role JWT (server-only; used by `seed:auth`).
- `DATABASE_URL` — Session pooler URL (port 5432). Used by the Drizzle runtime pool.
- `DATABASE_DIRECT_URL` — Direct connection URL (`db.<ref>.supabase.co:5432`). Used by `drizzle-kit` and `pnpm db:migrate` for `CREATE TYPE` etc. **The free tier's direct host is IPv6-only**: if your machine lacks IPv6, leave this empty and `scripts/migrate.ts` falls back to `DATABASE_URL` with `{ prepare: false }` against the session pooler.

Scripts:

- `pnpm db:generate` — diff `lib/db/schema.ts` against the snapshot under `drizzle/meta/` and emit a new SQL migration under `drizzle/migrations/`.
- `pnpm db:migrate` — apply drizzle-kit migrations, then any custom SQL under `drizzle/custom/` via a sha256 ledger.
- `pnpm seed:auth` — idempotently create the two seed Auth users via the Supabase admin REST endpoint.
- `pnpm db:seed` — idempotently insert the minimal seed rows (clients, profiles, user_clients, responsible_techs).
- `pnpm db:studio` — open drizzle-kit Studio against the configured URL.
