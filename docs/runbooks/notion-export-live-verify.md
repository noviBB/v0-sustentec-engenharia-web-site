# Notion export live-verify runbook

Operator guide for verifying the DB → Notion reverse map (issue #27) against
a real Notion workspace, with a real `NOTION_INTEGRATION_TOKEN`, before we
trust the export path in production.

## Purpose

The reverse map (`lib/notion/export.ts`) is covered by unit tests against
hand-written fixtures, but those fixtures cannot prove that the property
shapes we emit are accepted by Notion's `pages.update` endpoint as-shipped.
This runbook drives the same `exportClient` code path against a throwaway
Notion database that mirrors `CONTROLE PROJETOS_ATUAL`, then asserts the
round-trip by reading the page back. Production data is never touched; the
throwaway DB stays out-of-band of any client workspace.

## Prerequisites

- A real `NOTION_INTEGRATION_TOKEN` in `.env.local` (NOT the placeholder).
  The integration must have **edit** access to the throwaway DB below.
- A throwaway Notion database with the same property shape as
  `CONTROLE PROJETOS_ATUAL` (title, `Situação` status, `Tipologia` select,
  `Tipos de Licenças` multi-select, `Início` / `Prazo` / `Concluído em`
  dates, `Marcos` checkboxes, etc.). Easiest way: duplicate the production
  template into a personal workspace.
- A `clients` row pointing at the throwaway DB:
  ```sql
  INSERT INTO clients (name, notion_database_id, notion_cnpj_filter)
  VALUES ('export-verify-throwaway', '<throwaway-db-id>', '99999999999999');
  ```
  Capture the returned `id` as `<clientId>` below.
- At least one `processes` row in the throwaway DB that round-trips —
  i.e. it was imported from the throwaway via `pnpm db:notion:migrate
  --client=99999999999999`, so it has a `notion_page_id`.

## Run

Always preview locally first; there is no `--dry-run` on the export path —
this script will write to Notion. Use the throwaway DB.

```bash
pnpm notion:sync --client=<clientId> --direction=export
```

The script reads `clients.notion_integration_token` per-client, falling
back to `NOTION_INTEGRATION_TOKEN`. Processes and tasks with no
`notion_page_id` are intentionally skipped — there is no Notion page to
write back to.

Optional: scope by process by editing one row at a time in the DB before
the run; the export iterates all of a client's processes in one pass.

## Verify checklist

After the run, open the throwaway database in Notion and confirm each
item:

- [ ] `Situação` round-trips with the raw `status_label` casing preserved
      (`Em andamento`, not `em-andamento`). The pgEnum is the canonical
      key; `status_label` carries the human label.
- [ ] Property shapes match Notion's `pages.update` schema for every
      mapped property: `title` (rich-text array), `rich_text`, `select`
      (single object), `multi_select` (array of objects), `status`
      (object with `name`), `date` (`{ start }`), `checkbox` (bool).
      Wrong shape would have surfaced as a 400 from Notion at the
      `updatePage` call — confirm no errored pages in the script output.
- [ ] A `notion.export_client` row was written to `audit_log` with the
      expected counts:
      ```sql
      SELECT after FROM audit_log
      WHERE  action = 'notion.export_client'
        AND  entity_id = '<clientId>'
      ORDER  BY created_at DESC LIMIT 1;
      ```
      `processes_total` / `processes_written` / `processes_skipped` /
      `tasks_written` should match what the script printed.

## Notes

- Real-time Notion webhooks land in issue #11; they are out of scope for
  this verify. The `POST /api/notion/webhook` endpoint exists but
  invocation is driven by Notion, not by this script.
- Processes / tasks with `notion_page_id IS NULL` are intentionally
  skipped by `exportClient` — nothing to write back to. Those rows
  show up in the `processes_skipped` counter.
- The throwaway client row can be soft-deleted (`UPDATE clients SET
  deleted_at = now() WHERE id = '<clientId>'`) once verification passes,
  so no operator accidentally targets it later.
