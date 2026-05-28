import 'server-only';

import { and, eq, isNotNull, isNull, max } from 'drizzle-orm';

import { AuditAction } from '@/lib/constants/audit-events';
import { db } from '@/lib/db';
import { insertAuditLog } from '@/lib/db/auditLog';
import { clients, processes } from '@/lib/db/schema';
import { syncClient } from './adapter';

/**
 * Cron orchestrator for the Notion -> DB incremental sync.
 *
 * Thin wrapper around `syncClient`: enumerates live clients with a
 * notion_cnpj_filter, derives an incremental `since` from the most recent
 * `processes.notion_synced_at` per client (with a 5-minute overlap window for
 * safety), and dispatches one `syncClient` call per client inside its own
 * try/catch so a Notion 429/5xx on one client doesn't abort the run.
 *
 * Per-client audit_log rows are written even when the call fails — they record
 * the redacted CNPJ filter and the error string so an operator can grep.
 */

const OVERLAP_MS = 5 * 60 * 1000;

export interface CronSyncClientResult {
  clientId: string;
  created: number;
  unchanged: number;
  /** Present when this client's sync threw. The run continues regardless. */
  error?: string;
}

export interface CronSyncResult {
  clients: CronSyncClientResult[];
}

/**
 * Redacts a CNPJ for audit/log purposes — first 2 digits + ".***." + last 6.
 * Falls back to the input when the value is too short to redact meaningfully.
 */
export function redactCnpj(cnpj: string | null): string | null {
  if (cnpj == null) return null;
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length < 8) return cnpj;
  return `${digits.slice(0, 2)}.***.${digits.slice(-6)}`;
}

/** Returns MAX(notion_synced_at) across non-deleted processes for a client. */
async function maxSyncedAt(clientId: string): Promise<Date | null> {
  const rows = await db
    .select({ max_synced: max(processes.notion_synced_at) })
    .from(processes)
    .where(
      and(eq(processes.client_id, clientId), isNull(processes.deleted_at)),
    );
  return rows[0]?.max_synced ?? null;
}

/**
 * Iterates every live client with a notion_cnpj_filter, calls `syncClient`
 * with an incremental `since` cutoff derived from the client's most recent
 * `processes.notion_synced_at`, and writes a per-client audit row.
 *
 * Errors from `syncClient` are caught and recorded — they do NOT abort the
 * remaining clients (the route handler also returns 200 in this case; the
 * detail is in the `clients[].error` field).
 */
export async function runScheduledSync(): Promise<CronSyncResult> {
  const rows = await db
    .select({
      id: clients.id,
      notion_cnpj_filter: clients.notion_cnpj_filter,
    })
    .from(clients)
    .where(
      and(isNull(clients.deleted_at), isNotNull(clients.notion_cnpj_filter)),
    );

  const out: CronSyncClientResult[] = [];

  for (const row of rows) {
    const cnpjRedacted = redactCnpj(row.notion_cnpj_filter);

    let result: { created: number; unchanged: number; error?: string };
    try {
      const lastSynced = await maxSyncedAt(row.id);
      // First run: no `since` -> full pull. Otherwise: last_synced - 5min.
      const since = lastSynced
        ? new Date(lastSynced.getTime() - OVERLAP_MS)
        : undefined;

      const r = await syncClient(row.id, { since });
      result = { created: r.pages_created, unchanged: r.pages_skipped };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(
        JSON.stringify({
          event: 'notion_cron_sync_client_failed',
          client_id: row.id,
          cnpj_filter_redacted: cnpjRedacted,
          error: message,
        }),
      );
      result = { created: 0, unchanged: 0, error: message };
    }

    await insertAuditLog({
      action: AuditAction.NotionCronSync,
      entity_type: 'client',
      entity_id: row.id,
      after: {
        trigger: 'cron',
        cnpj_filter_redacted: cnpjRedacted,
        created: result.created,
        unchanged: result.unchanged,
        ...(result.error ? { error: result.error } : {}),
      },
    });

    out.push({
      clientId: row.id,
      created: result.created,
      unchanged: result.unchanged,
      ...(result.error ? { error: result.error } : {}),
    });
  }

  return { clients: out };
}
