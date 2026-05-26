import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLog, clients, processes } from '@/lib/db/schema';
import { createNotionClient, type NotionClient } from './client';
import { parseProcess, taskRelationIds } from './property-map';
import {
  importFromNotion,
  loadSyncCaches,
  makeResponsibleResolver,
  softDeleteMissing,
} from './repository';
import { NotImplementedError, type NotionPage, type SyncResult } from './types';

/**
 * Public adapter surface. The portal must import ONLY from `lib/notion`
 * (re-exported by index.ts) — the ESLint boundary forbids reaching into the
 * internal modules below.
 */

interface SyncOptions {
  /** Inject a client for tests; otherwise built lazily from the token. */
  notion?: NotionClient;
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
  const clientRows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deleted_at)))
    .limit(1);
  const client = clientRows[0];
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

  const pages = await notion.queryDatabaseAll(client.notion_database_id);

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

  const soft = await softDeleteMissing(clientId, liveIds);

  const result: SyncResult = {
    client_id: clientId,
    pages_total: pages.length,
    pages_created: created,
    pages_updated: updated,
    pages_skipped: skipped,
    pages_failed: failed,
    pages_soft_deleted: soft,
  };

  await db.insert(auditLog).values({
    action: 'notion.sync_client',
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
  const clientRows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deleted_at)))
    .limit(1);
  const client = clientRows[0];
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

export interface ProcessListItem {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  status_label: string | null;
  notion_page_id: string | null;
  notion_synced_at: Date | null;
}

/**
 * Lists the (non-deleted) processes for a client from Supabase. Read path —
 * the portal reads from Supabase, never from Notion directly.
 */
export async function listForClient(
  clientId: string,
): Promise<ProcessListItem[]> {
  return db
    .select({
      id: processes.id,
      code: processes.code,
      name: processes.name,
      status: processes.status,
      status_label: processes.status_label,
      notion_page_id: processes.notion_page_id,
      notion_synced_at: processes.notion_synced_at,
    })
    .from(processes)
    .where(and(eq(processes.client_id, clientId), isNull(processes.deleted_at)));
}

/**
 * Webhook handler stub. Real-time Notion webhooks land in #11. Typed no-op for
 * now so callers can wire the route without a behavioral change.
 */
export async function handleWebhook(_payload: unknown): Promise<never> {
  throw new NotImplementedError('Notion webhook handling (#11)');
}
