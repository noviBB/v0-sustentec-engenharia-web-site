# Notion initial migration runbook

Operator guide for the one-shot Notion → DB cutover (issue #12). After this
runs once per environment, the incremental cron at `/api/cron/notion-sync`
takes over (see [vercel.json](../../vercel.json) — runs every 15 minutes).

## When to run

- **Initial cutover.** First time we point a Sustentec environment at a live
  Notion workspace. Imports every page in every configured client database
  into Postgres so the portal has data on first load.
- **After a schema change that affects mapping.** When the Notion property map
  or the Drizzle schema changes such that a re-import is needed (e.g. a new
  property added to `parseProcess`). The cron alone won't backfill old pages.
- **To soft-delete pages removed from Notion.** The 15-minute cron runs
  incrementally with a `last_edited_time` filter, so it only sees recently-edited
  pages — it cannot tell which old pages were deleted. The migration script does
  a full pull and soft-deletes any rows whose `notion_page_id` is no longer
  in Notion. Run it periodically (or on demand) to reconcile deletions.
- **Per environment.** Run once in `dev`, once in `staging`, once in `prod`.
  Each environment has its own DB and its own clients rows. The script never
  writes cross-environment.

The cron will eventually catch up too, but for the initial cutover the
migration script is the supported path because it (a) runs synchronously so
operators can watch it, (b) produces an end-of-run summary including unmapped
`Responsável` aliases, and (c) writes a dedicated `notion.initial_migration`
audit row.

## How to invoke

Always do a dry-run first:

```bash
pnpm db:notion:migrate --dry-run
```

The dry-run hits the Notion API (so you'll see auth / rate-limit failures if
those are going to break the real run), but rolls back every DB write at the
end. Use the printed summary to gauge whether the counts look sane and to
collect the **unmapped aliases** list.

Then do the real run:

```bash
pnpm db:notion:migrate
```

Optional flags:

- `--client=<cnpj>` — scope the run to one client. Matches against
  `clients.notion_cnpj_filter` exactly. Useful when re-importing one client
  after fixing a per-client property.
- `--verbose` — prints a one-line summary per client as it runs (instead of
  only the end-of-run block).

Combine freely: `pnpm db:notion:migrate --dry-run --client=12.345.678/0001-90 --verbose`.

## How to interpret the summary

Each client gets one line:

```
client=<uuid> cnpj=<redacted> seen=N imported=N skipped=N errored=N soft_deleted=N duration_ms=N
```

- `seen` — pages the Notion API returned for this client's database.
- `imported` — created + updated (the row is now in Postgres).
- `skipped` — pages whose `notion_etag` matched the stored value, so no
  write was performed.
- `errored` — pages that threw inside `importFromNotion` and rolled back.
  Inspect the structured `console.error` logs above the summary for details.
- `soft_deleted` — pages that exist in Postgres but no longer in Notion;
  marked with `processes.deleted_at` and hidden from the portal.

The CNPJ is always redacted as `XX.***.YYYYYY` in both logs and the
`audit_log.after` payload — never log the full filter.

### Unmapped aliases

If the script prints:

```
Unmapped Responsável aliases (need responsible_tech_aliases rows):
  - Some Person Name
  - Outro Nome
```

…then those pages got imported with `responsible_tech_id = NULL` and a row
appended to `processes.notion_sync_errors`. The import is otherwise complete.
See **How to fix unmapped aliases** below.

### Errored pages

The script prints up to 20 errored-page rows:

```
client=<uuid> process=<uuid> errors=[{"field":"tipologia","message":"unknown value 'XYZ'","at":"..."}]
```

These are non-fatal field errors recorded inside `processes.notion_sync_errors`.
The process row itself is in the DB; one or more fields degraded to NULL. Fix
the underlying Notion property or extend the parser, then re-run the migration
(it's idempotent — keyed by `notion_page_id`).

## How to fix unmapped aliases

`responsible_tech_aliases` maps free-form Notion `Responsável` labels to a
canonical `responsible_techs.slug`. To add a new alias:

```sql
INSERT INTO responsible_tech_aliases (responsible_tech_id, notion_label)
SELECT id, 'Some Person Name'
FROM responsible_techs
WHERE slug = 'some-person';
```

Aliases are case- and diacritic-insensitive (folded via `foldDiacritics()` in
the parsers), so don't bother inserting multiple casings of the same name.

After inserting, re-run the migration (`pnpm db:notion:migrate`) — the pages
will pick up the new mapping on next import.

## How to scope by client

`--client=<cnpj>` matches `clients.notion_cnpj_filter` exactly. To find the
right filter value:

```sql
SELECT id, name, notion_cnpj_filter
FROM clients
WHERE deleted_at IS NULL AND notion_cnpj_filter IS NOT NULL
ORDER BY name;
```

## Per-environment notes

The script reads these env vars (validated via `lib/config.ts` /
`lib/env.server.ts`):

- `DATABASE_URL` — the Postgres pool URL for the target environment.
- `NOTION_INTEGRATION_TOKEN` — falls back to this if the client row's
  `notion_integration_token` is unset. Required; the script refuses to run
  against the placeholder value shipped in `.env.local`.
- `CRON_SECRET` — not used by the script itself (it's required by the
  config schema, so set it to anything non-empty if you're running the
  migration without a populated env).

In CI / sandbox runs that **shouldn't** hit Notion, leave
`NOTION_INTEGRATION_TOKEN` at the placeholder and the script will exit non-zero
before any external call.
