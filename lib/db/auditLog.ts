import 'server-only';
import type { AuditAction } from '@/lib/constants/audit-events';
import { db } from './index';
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

/**
 * Inserts one row into `audit_log`. The single place that writes the table —
 * services (the Notion adapter, server actions) call this instead of touching
 * `db` directly. `action` MUST be an `AuditAction` enum member.
 */
export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  await db.insert(auditLog).values({
    action: entry.action,
    entity_type: entry.entity_type ?? null,
    entity_id: entry.entity_id ?? null,
    actor_id: entry.actor_id ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}
