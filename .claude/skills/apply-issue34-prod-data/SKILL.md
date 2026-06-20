---
name: apply-issue34-prod-data
description: Apply issue #34 production data — real responsável staff emails and client victorfr2026ok@gmail.com's project refresh — to the prod database, after PR #36 is merged and migrations 0008/0009 are applied. Use when promoting issue #34 / "Pronts 19-06-26" data to production or replaying it on a fresh environment. Encodes the pre-flight slug reconciliation and the post-apply security verification. Contains NO real email addresses — supply them at runtime.
---

# Apply issue #34 production data

Companion to PR #36 (issue #34). Migrations `0008_responsible_techs_email_privs.sql`
(locks the `responsible_techs.email` column + pins the canonical staff) and
`0009_deactivate_amanda.sql` ship the structure with `email = NULL`. This skill
applies the **PII kept out of git**: the 7 real staff emails and client
`victorfr2026ok@gmail.com`'s real project data.

> **Status:** applied to production during the issue #34 rollout. Keep this as
> the record + the procedure to replay on any fresh environment.

## Guardrails (read first)
- **Never commit real email addresses or write them into any tracked file.** Supply at apply time only.
- Production migrations are manual; Vercel doesn't run them. The **direct** DB URL times out from CI/dev — **use the pooled `DATABASE_URL`** (`prepare:false`). With `pnpm db:migrate`, unset `DATABASE_DIRECT_URL` so it falls back to pooled.
- Data steps run in a single transaction.
- Connect with the **service role** — column grants restrict `email` for `authenticated`, not for service.

## The 7 canonical active slugs
`hilton, ivon-benitez, kely, laila, leon, marcelo, maira`

Real emails (issue #34 item 8, domain `@sustentec-engenharia.com.br`): `hilton`,
`kely`, `laila`, `marcelo`, `maira` → `<localpart>@…`; `ivon-benitez` →
`ivonoristela@…`; `leon` → `leondalmasso@…`.

**Amanda** is NOT a current responsável — kept as an inactive row only; `CC 24-044`
is owned by **Leon**. `0009` deactivates her; do not give her an email.

## Step 0 — Preconditions
1. PR #36 merged to `main`.
2. `pnpm db:migrate` against prod so `0008` and `0009` are in `_custom_migrations`.
   Confirm: `SELECT filename FROM public._custom_migrations WHERE filename LIKE '000[89]%';`

## Step 1 — Pre-flight slug reconciliation
`responsible_techs` is also populated by the Notion sync, which could create the
new people under different slugs. Check before applying:
```sql
SELECT slug, display_name, active, (email IS NOT NULL) AS has_email
FROM public.responsible_techs ORDER BY active DESC, slug;
```
- Canonical slug present → fine.
- A real person under a **different** slug (e.g. `kely-figueira` vs `kely`) →
  **merge/rename**, don't duplicate: repoint `processes` + `responsible_tech_aliases`
  FKs to the canonical id, then `DELETE` the stray row. Stop and ask if ambiguous.

  *(During the issue #34 rollout: no drift — the 6 new people simply didn't exist
  yet; `0008` inserted them cleanly. Expect the same on a fresh seed.)*

## Step 2 — Verify the active set
```sql
SELECT slug, active FROM public.responsible_techs WHERE active ORDER BY slug;
-- expect exactly the 7 canonical slugs (Amanda NOT among them)
```

## Step 3 — Apply the 7 real staff emails (PII — runtime values only)
```sql
BEGIN;
UPDATE public.responsible_techs SET email = :'hilton_email'   WHERE slug='hilton';
UPDATE public.responsible_techs SET email = :'ivon_email'     WHERE slug='ivon-benitez';
UPDATE public.responsible_techs SET email = :'kely_email'     WHERE slug='kely';
UPDATE public.responsible_techs SET email = :'laila_email'    WHERE slug='laila';
UPDATE public.responsible_techs SET email = :'leon_email'     WHERE slug='leon';
UPDATE public.responsible_techs SET email = :'marcelo_email'  WHERE slug='marcelo';
UPDATE public.responsible_techs SET email = :'maira_email'    WHERE slug='maira';
COMMIT;
```

## Step 4 — Apply Victor's project data
For each of the 10 codes, update the row for `victorfr2026ok@gmail.com`; insert any
missing code (`CC 24-006` was missing in the original prod data). Values come from
`VICTOR_PROCESSES` in `scripts/seed-data.ts` (authoritative). **CC 24-044 → leon.**
```sql
BEGIN;
-- per code; example:
UPDATE public.processes p SET
  name='Exigências Fazenda Sapucay', status='andamento', status_label='Em andamento',
  latitude=-22.3930150, longitude=-42.4869660,
  responsible_tech_id=(SELECT id FROM public.responsible_techs WHERE slug='laila')
WHERE p.code='CC 26-021'
  AND p.client_id=(SELECT id FROM public.clients WHERE contact_email='victorfr2026ok@gmail.com');
-- CC 24-016→kely, CC 24-015→marcelo, CC 24-017→marcelo, CC 24-061→kely, CC 25-072→kely,
-- CC 25-073→kely, CC 24-006→laila (INSERT if missing), CC 25-119→leon, CC 24-044→leon.
-- finalizados (CC 25-119, CC 24-044) → status_label 'Finalizado'.
COMMIT;
```
A `node` + `postgres` upsert loop keyed on `(code, client_id)` is the easiest way to
do all 10 atomically — mirror the field set in `VICTOR_PROCESSES`. Sub-records
(payments/tasks/documents/milestones) are out of scope; progress bars keep existing
values.

## Step 5 — Verify
1. **Security** — `SET LOCAL ROLE authenticated` then `SELECT email FROM responsible_techs` must be **denied**, while `SELECT id, slug, display_name` works. (Run each in its own transaction — the denial aborts the tx.)
2. **Dropdown** — appointment form lists exactly the **7** active techs, alphabetical.
3. **Appointment CC** — book a test meeting → notification `To: contato@…`, `Cc:` the chosen responsável (check `audit_log.after.cc` if no inbox).
4. **Victor** — dashboard shows 2 andamento / 6 acompanhamento / 2 finalizado with correct names + map pins.

## Rollback
Emails: `UPDATE public.responsible_techs SET email = NULL WHERE slug IN (…);`.
Victor data: re-run with prior values (in `seed-data.ts` git history).
