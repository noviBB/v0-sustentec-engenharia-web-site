/**
 * Server-side audit / log event names.
 *
 * Unlike `ResultCode`, these never cross to the client — they are emitted into
 * structured `console.error` logs and the `audit_log.action` column. They are
 * still centralized as string enums so the names stay consistent and greppable.
 *
 * Postgres column enums are a separate concern handled by Drizzle `pgEnum`
 * in `lib/db/enums.ts`.
 */

/** Structured `console.error` log event names (the `event` field). */
export enum AuditEvent {
  NotionSyncNowFailed = 'notion_sync_now_failed',
  AppointmentCreateFailed = 'appointment_create_failed',
  MarkMessageReadFailed = 'mark_message_read_failed',
  ContactSubmitFailed = 'contact_submit_failed',
}

/** Values written to the `audit_log.action` column. */
export enum AuditAction {
  NotionSyncClient = 'notion.sync_client',
}
