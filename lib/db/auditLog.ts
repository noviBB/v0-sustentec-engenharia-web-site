import 'server-only';
import type { AuditAction } from '@/lib/constants/audit-events';
import { DbMode } from '@/lib/enums';
import {
  dbAnon,
  dbRls,
  getDbService,
  type DrizzleTx,
  type SessionLike,
} from './index';
import { auditLog } from './schema';

export interface AuditLogEntry {
  /** A value from the `AuditAction` enum (never a bare string literal). */
  action: AuditAction;
  entity_type?: string | null;
  entity_id?: string | null;
  actor_id?: string | null;
  before?: unknown;
  after?: unknown;
}

export type AuditLogScope =
  | { mode: DbMode.Service }
  | { mode: DbMode.Rls; session: SessionLike }
  | { mode: DbMode.Anon }
  | { mode: DbMode.Tx; tx: DrizzleTx };

/**
 * Inserts one row into `audit_log`. The single place that writes the table —
 * services (the Notion adapter, server actions) call this instead of touching
 * `db` directly.
 *
 * `scope` decides the connection role:
 *   - `service` — bypasses RLS (cron, Notion adapter, scripts).
 *   - `rls`     — runs as `authenticated` with the caller's claims; used by
 *                 server actions so the audit-log INSERT lives under the
 *                 same RLS policy as the data change it records.
 *   - `anon`    — public marketing submissions.
 *   - `tx`      — reuse an open transaction (so the audit row commits or
 *                 rolls back atomically with the data change).
 *
 * `action` MUST be an `AuditAction` enum member.
 */
export async function insertAuditLog(
  entry: AuditLogEntry,
  scope: AuditLogScope = { mode: DbMode.Service },
): Promise<void> {
  const values = {
    action: entry.action,
    entity_type: entry.entity_type ?? null,
    entity_id: entry.entity_id ?? null,
    actor_id: entry.actor_id ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  };

  if (scope.mode === DbMode.Tx) {
    await scope.tx.insert(auditLog).values(values);
    return;
  }
  if (scope.mode === DbMode.Rls) {
    await dbRls(scope.session, async (tx) => {
      await tx.insert(auditLog).values(values);
    });
    return;
  }
  if (scope.mode === DbMode.Anon) {
    await dbAnon(async (tx) => {
      await tx.insert(auditLog).values(values);
    });
    return;
  }
  await getDbService().insert(auditLog).values(values);
}
