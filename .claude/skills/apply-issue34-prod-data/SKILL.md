---
name: apply-issue34-prod-data
description: Apply issue #34 production data — real responsável staff emails and client victorfr2026ok@gmail.com's project refresh — to the prod database, after PR #36 is merged and migration 0008 is applied. Use when promoting issue #34 / "Pronts 19-06-26" data to production. Encodes the pre-flight slug reconciliation and the post-apply security verification. Contains NO real email addresses — the operator supplies them at runtime.
---

# Apply issue #34 production data

This is the **manual, post-merge** companion to PR #36 (issue #34). Migration
`drizzle/custom/0008_responsible_techs_email_privs.sql` ships the structural
change (locks the `responsible_techs.email` column, pins the 8 active staff,
sets `email = NULL`). This skill applies the **PII** that is deliberately kept
out of git: the 8 real staff emails and client `victorfr2026ok@gmail.com`'s
real project data.

## Guardrails (read first)
- **Never commit real email addresses or write them into any tracked file.**
  Supply them inline at apply time only.
- Production migrations are manual here (Vercel does not run them). Use the
  **pooled** `DATABASE_URL` if the direct URL times out.
- Every data step runs inside a single transaction (`BEGIN; … COMMIT;`).
- Connect with the **service role** (`DATABASE_URL` from prod env) — column
  grants restrict `email` reads for `authenticated`, not for service.

## Open input
- **Amanda's real email** is required for step 3 and was never provided. Get it
  before running, or skip her row and re-run later (the CC degrades gracefully
  to no-CC until her email exists).

## The 8 canonical slugs
`amanda, hilton, ivon-benitez, kely, laila, leon, marcelo, maira`

Real emails (domain `@sustentec-engenharia.com.br`), per issue #34 item 8:
`hilton`, `kely`, `laila`, `marcelo`, `maira` → `<localpart>@…`;
`ivon-benitez` → `ivonoristela@…`; `leon` → `leondalmasso@…`; `amanda` → **TBD**.

---

## Step 0 — Preconditions
1. PR #36 merged to `main`.
2. `pnpm db:migrate` run against prod so `0008` is in `_custom_migrations`.
   Confirm: `SELECT filename FROM public._custom_migrations WHERE filename LIKE '0008%';`

## Step 1 — Pre-flight slug reconciliation (CRITICAL)
The prod `responsible_techs` rows are created by the **Notion sync**, which may
have generated the 6 new people under *different* slugs (or not at all). Running
`0008` blind could deactivate the real techs or create duplicates.

```sql
SELECT slug, display_name, active, (email IS NOT NULL) AS has_email
FROM public.responsible_techs
ORDER BY active DESC, slug;
```

Compare against the 8 canonical slugs:
- A canonical slug present → fine (0008 already upserted/activated it).
- A real person present under a **different** slug (e.g. `kely-figueira` vs
  `kely`) → **rename/merge**, do not duplicate. Repoint FKs, then drop the
  stray row:
  ```sql
  -- example: fold 'kely-figueira' into canonical 'kely'
  UPDATE public.processes
    SET responsible_tech_id = (SELECT id FROM public.responsible_techs WHERE slug='kely')
    WHERE responsible_tech_id = (SELECT id FROM public.responsible_techs WHERE slug='kely-figueira');
  UPDATE public.responsible_tech_aliases
    SET responsible_tech_id = (SELECT id FROM public.responsible_techs WHERE slug='kely')
    WHERE responsible_tech_id = (SELECT id FROM public.responsible_techs WHERE slug='kely-figueira');
  DELETE FROM public.responsible_techs WHERE slug='kely-figueira';
  ```
- **If anything is ambiguous, stop and ask** before mutating prod.

## Step 2 — (already done by 0008) verify active set
```sql
SELECT slug, active FROM public.responsible_techs WHERE active ORDER BY slug;
-- expect exactly the 8 canonical slugs
```

## Step 3 — Apply real staff emails (PII — runtime values only)
```sql
BEGIN;
UPDATE public.responsible_techs SET email = :'hilton_email'   WHERE slug='hilton';
UPDATE public.responsible_techs SET email = :'ivon_email'     WHERE slug='ivon-benitez';
UPDATE public.responsible_techs SET email = :'kely_email'     WHERE slug='kely';
UPDATE public.responsible_techs SET email = :'laila_email'    WHERE slug='laila';
UPDATE public.responsible_techs SET email = :'leon_email'     WHERE slug='leon';
UPDATE public.responsible_techs SET email = :'marcelo_email'  WHERE slug='marcelo';
UPDATE public.responsible_techs SET email = :'maira_email'    WHERE slug='maira';
UPDATE public.responsible_techs SET email = :'amanda_email'   WHERE slug='amanda'; -- TBD; skip if unknown
COMMIT;
```
(`psql -v hilton_email='hilton@…' …`, or substitute by hand. Do not paste real
values into chat history you intend to keep.)

## Step 4 — Apply Victor's project data
Values come from issue #34 item 11 (codes, names, buckets, responsável slug,
coordinates — the same data already in `scripts/seed-data.ts`). For each of the
10 codes, update the row for client `victorfr2026ok@gmail.com`; insert any code
that does not yet exist in prod.

```sql
BEGIN;
-- repeat per code; example for one row:
UPDATE public.processes p
SET name = 'Exigências Fazenda Sapucay',
    status = 'andamento',
    status_label = 'Em andamento',
    latitude = -22.3930150,
    longitude = -42.4869660,
    responsible_tech_id = (SELECT id FROM public.responsible_techs WHERE slug='laila')
WHERE p.code = 'CC 26-021'
  AND p.client_id = (SELECT id FROM public.clients WHERE contact_email='victorfr2026ok@gmail.com');
-- … CC 24-016 (kely), CC 24-015 (marcelo), CC 24-017 (marcelo), CC 24-061 (kely),
--    CC 25-072 (kely), CC 25-073 (kely), CC 24-006 (laila), CC 25-119 (leon),
--    CC 24-044 (amanda). finalizados → status_label 'Finalizado'.
COMMIT;
```
Cross-check the full code→slug→bucket→coordinates table against `VICTOR_PROCESSES`
in `scripts/seed-data.ts` so prod matches the seed.

## Step 5 — Verify
1. **Security** — as a non-staff client (a real `authenticated` JWT, or
   `SET ROLE authenticated`): `SELECT email FROM public.responsible_techs` must
   fail / return no `email` column, while
   `SELECT id, slug, display_name FROM public.responsible_techs` works.
2. **Dropdown** — the appointment form lists exactly the 8 active techs,
   alphabetical.
3. **Appointment CC** — book a test meeting; confirm the notification email is
   `To: contato@sustentec-engenharia.com.br`, `Cc:` the chosen responsável's
   real email (check the `audit_log` `after.cc` if no inbox access).
4. **Victor** — log in as the client; dashboard shows 2 andamento / 6
   acompanhamento / 2 finalizado with the correct names and map pins.

## Rollback
All steps are idempotent and transactional. To undo emails:
`UPDATE public.responsible_techs SET email = NULL WHERE slug IN (…);`
Victor data: re-run with prior values (kept in git history of `seed-data.ts`).
