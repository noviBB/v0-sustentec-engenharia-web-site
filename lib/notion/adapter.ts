import 'server-only';

import { AuditAction } from '@/lib/constants/audit-events';
import { insertAuditLog } from '@/lib/db/auditLog';
import { getClientById } from '@/modules/clients/clients.repo';
import {
  getProcessByNotionPageId,
  getProcessForExport,
  listProcessIdsForClient,
  listProcessSyncItemsForClient,
  type ProcessSyncItem,
} from '@/modules/processes/processes.repo';
import { createNotionClient, type NotionClient } from './client';
import { exportToNotion } from './export';
import { parseProcess, taskRelationIds } from './property-map';
import {
  importFromNotion,
  loadSyncCaches,
  makeResponsibleResolver,
  softDeleteMissing,
} from './repository';
import { type NotionPage, type SyncResult } from './types';

/**
 * Public adapter surface. The portal must import ONLY from `lib/notion`
 * (re-exported by index.ts) — the ESLint boundary forbids reaching into the
 * internal modules below.
 */

interface SyncOptions {
  /** Inject a client for tests; otherwise built lazily from the token. */
  notion?: NotionClient;
  /**
   * Incremental cutoff. When set, the underlying `queryDatabaseAll` ships a
   * Notion-side filter on `last_edited_time > since` so the API only returns
   * pages edited after this instant. Omitted = full pull (the existing
   * default — additive change, existing callers keep working).
   */
  since?: Date;
}

async function resolveNotionClient(
  clientRow: { notion_integration_token: string | null },
  opts: SyncOptions,
): Promise<NotionClient> {
  if (opts.notion) return opts.notion;
  // Per-client token wins; otherwise fall back to the integration env token.
  return createNotionClient(clientRow.notion_integration_token ?? undefined);
}

/**
 * Full sync for one client: query its Notion database, import every page,
 * soft-delete pages that disappeared, and write an audit_log row.
 *
 * Lazily validates the Notion token (throws NotionTokenMissingError if absent).
 */
export async function syncClient(
  clientId: string,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error(`client ${clientId} not found`);
  }
  if (!client.notion_database_id) {
    throw new Error(
      `client ${clientId} has no notion_database_id configured`,
    );
  }

  const notion = await resolveNotionClient(client, opts);
  const caches = await loadSyncCaches();
  const resolveResponsible = makeResponsibleResolver(caches);

  // When `opts.since` is provided, ship a Notion-side filter so the API only
  // returns pages edited after that instant. Untouched pages don't paginate.
  const sinceFilter = opts.since
    ? {
        timestamp: 'last_edited_time' as const,
        last_edited_time: { after: opts.since.toISOString() },
      }
    : undefined;
  const pages = await notion.queryDatabaseAll(
    client.notion_database_id,
    sinceFilter,
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const liveIds: string[] = [];

  for (const page of pages) {
    liveIds.push(page.id);
    try {
      const taskPages = await fetchTaskPages(notion, page);
      const parsed = parseProcess(page, { taskPages, resolveResponsible });
      const outcome = await importFromNotion(clientId, parsed, caches);
      if (outcome.created) {
        created += 1;
      } else if (outcome.unchanged) {
        skipped += 1;
      } else {
        updated += 1;
      }
    } catch (e) {
      failed += 1;
      console.error(
        JSON.stringify({
          event: 'notion_page_sync_failed',
          client_id: clientId,
          notion_page_id: page.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }

  // softDeleteMissing assumes `liveIds` is the COMPLETE set of pages currently
  // present in Notion. With an incremental `since` filter we only see recently
  // edited pages, so the "live set" is incomplete and would wrongly soft-delete
  // every untouched page. Skip soft-delete in incremental mode — soft-deletion
  // is handled by the full migration runs (`pnpm db:notion:migrate`) instead.
  const soft = opts.since ? 0 : await softDeleteMissing(clientId, liveIds);

  const result: SyncResult = {
    client_id: clientId,
    pages_total: pages.length,
    pages_created: created,
    pages_updated: updated,
    pages_skipped: skipped,
    pages_failed: failed,
    pages_soft_deleted: soft,
  };

  await insertAuditLog({
    action: AuditAction.NotionSyncClient,
    entity_type: 'client',
    entity_id: clientId,
    after: {
      pages_created: created,
      pages_updated: updated,
      pages_skipped: skipped,
      pages_failed: failed,
      pages_soft_deleted: soft,
      pages_total: pages.length,
    },
  });

  return result;
}

/** Resolves and fetches the TAREFAS related pages for a process page. */
async function fetchTaskPages(
  notion: NotionClient,
  page: NotionPage,
): Promise<NotionPage[]> {
  const ids = taskRelationIds(page);
  if (ids.length === 0) return [];
  const out: NotionPage[] = [];
  for (const id of ids) {
    out.push(await notion.retrievePage(id));
  }
  return out;
}

/**
 * Syncs a single Notion page by id for a client (used by webhooks later, and
 * for targeted re-syncs). Lazily validates the token.
 */
export async function syncOne(
  clientId: string,
  notionPageId: string,
  opts: SyncOptions = {},
): Promise<{ created: boolean; unchanged: boolean }> {
  const client = await getClientById(clientId);
  if (!client) throw new Error(`client ${clientId} not found`);

  const notion = await resolveNotionClient(client, opts);
  const caches = await loadSyncCaches();
  const resolveResponsible = makeResponsibleResolver(caches);

  const page = await notion.retrievePage(notionPageId);
  const taskPages = await fetchTaskPages(notion, page);
  const parsed = parseProcess(page, { taskPages, resolveResponsible });
  const outcome = await importFromNotion(clientId, parsed, caches);
  return { created: outcome.created, unchanged: outcome.unchanged };
}

export type ProcessListItem = ProcessSyncItem;

/**
 * Lists the (non-deleted) processes for a client from Supabase. Read path —
 * the portal reads from Supabase, never from Notion directly. Delegates to the
 * `lib/db/processes` repository; the adapter never touches `db` directly.
 */
export async function listForClient(
  clientId: string,
): Promise<ProcessListItem[]> {
  return listProcessSyncItemsForClient(clientId);
}

export interface ExportResult {
  client_id: string;
  processes_total: number;
  processes_written: number;
  processes_skipped: number;
  tasks_written: number;
}

/**
 * Reverse sync (DB -> Notion): reads each of a client's processes from the
 * repository, maps it to Notion property payloads via `exportToNotion`, and
 * writes them back with the client's `updatePage`. Processes (and tasks) that
 * are not yet linked to a Notion page (`notion_page_id == null`) are skipped —
 * there is nothing to write back to.
 *
 * Lazily validates the Notion token (throws NotionTokenMissingError if absent).
 */
export async function exportClient(
  clientId: string,
  opts: SyncOptions = {},
): Promise<ExportResult> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error(`client ${clientId} not found`);
  }

  const notion = await resolveNotionClient(client, opts);
  const ids = await listProcessIdsForClient(clientId);

  let written = 0;
  let skipped = 0;
  let tasksWritten = 0;

  for (const id of ids) {
    const process = await getProcessForExport(clientId, id);
    if (!process) continue;
    const payload = exportToNotion(process);
    if (!payload.page_id) {
      skipped += 1;
      continue;
    }
    await notion.updatePage(payload.page_id, payload.properties);
    written += 1;

    for (const task of payload.tasks) {
      if (!task.page_id) continue;
      await notion.updatePage(task.page_id, task.properties);
      tasksWritten += 1;
    }
  }

  await insertAuditLog({
    action: AuditAction.NotionExportClient,
    entity_type: 'client',
    entity_id: clientId,
    after: {
      processes_total: ids.length,
      processes_written: written,
      processes_skipped: skipped,
      tasks_written: tasksWritten,
    },
  });

  return {
    client_id: clientId,
    processes_total: ids.length,
    processes_written: written,
    processes_skipped: skipped,
    tasks_written: tasksWritten,
  };
}

/**
 * Result returned by `handleWebhook`. Pure data — the route layer turns this
 * into the audit-log entry and JSON envelope.
 *
 * `deduped: true` covers two distinct no-op cases:
 *   - `unknown_page` — no live `processes` row tracks this `notion_page_id`
 *     (deleted, never imported, or a page from a database we don't own).
 *   - `unchanged`    — the row's `notion_etag` matches Notion's current
 *     `last_edited_time`, so this is a replay (or a write we already
 *     observed via the cron).
 */
export interface WebhookOutcome {
  deduped: boolean;
  reason?: 'unknown_page' | 'unchanged';
  synced?: boolean;
  client_id?: string;
  process_id?: string;
}

/**
 * Real-time Notion webhook handler. Resolves the canonical process by
 * `notion_page_id`, dedups against the stored `notion_etag`
 * (Notion's `last_edited_time`), and delegates the actual write to `syncOne`.
 *
 * Pure-async — no HTTP / audit-log concerns; the route handler at
 * `app/api/notion/webhook/route.ts` writes audit rows at the boundary.
 *
 * Lazily validates the Notion token via `syncOne` (throws
 * `NotionTokenMissingError` if absent).
 */
export async function handleWebhook(
  pageId: string,
  opts: SyncOptions = {},
): Promise<WebhookOutcome> {
  const row = await getProcessByNotionPageId(pageId);
  if (!row) {
    return { deduped: true, reason: 'unknown_page' };
  }

  const client = await getClientById(row.client_id);
  if (!client) {
    // Defensive: the FK should make this impossible. Treat as unknown.
    return { deduped: true, reason: 'unknown_page' };
  }

  const notion = await resolveNotionClient(client, opts);
  const page = await notion.retrievePage(pageId);

  // notion_etag stores Notion's `last_edited_time` string verbatim. If it
  // matches, this webhook is a replay (or we already imported this version
  // via the cron). No write, no audit row from the adapter side.
  if (
    row.notion_etag != null &&
    page.last_edited_time != null &&
    row.notion_etag === page.last_edited_time
  ) {
    return {
      deduped: true,
      reason: 'unchanged',
      client_id: row.client_id,
      process_id: row.id,
    };
  }

  await syncOne(row.client_id, pageId, opts);
  return {
    deduped: false,
    synced: true,
    client_id: row.client_id,
    process_id: row.id,
  };
}
