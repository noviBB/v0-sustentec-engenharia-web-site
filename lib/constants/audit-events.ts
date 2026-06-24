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
  ClientUpdateFailed = 'client_update_failed',
  PaymentOverdueCronFailed = 'payment_overdue_cron_failed',
  PaymentOverdueEmailFailed = 'payment_overdue_email_failed',
  AppointmentNotifyEmailFailed = 'appointment_notify_email_failed',
  MarkPendenciasSeenFailed = 'mark_pendencias_seen_failed',
}

/** Values written to the `audit_log.action` column. */
export enum AuditAction {
  NotionSyncClient = 'notion.sync_client',
  NotionExportClient = 'notion.export_client',
  NotionInitialMigration = 'notion.initial_migration',
  NotionCronSync = 'notion.cron_sync',
  NotionWebhookReceived = 'notion.webhook_received',
  NotionWebhookRejected = 'notion.webhook_rejected',
  NotionWebhookSyncedPage = 'notion.webhook_synced_page',
  NotionWebhookFailed = 'notion.webhook_failed',
  ClientUpdated = 'client.updated',
  PaymentOverdueCronRun = 'payment.cron_overdue',
  PaymentOverdueEmailSent = 'payment.overdue_email_sent',
  PaymentOverdueEmailFailed = 'payment.overdue_email_failed',
  PaymentOverdueTaskCreated = 'payment.overdue_task_created',
  MessageMarkedRead = 'message.marked_read',
  AppointmentCreated = 'appointment.created',
  AppointmentCreateFailed = 'appointment.create_failed',
  AppointmentNotifyEmailSent = 'appointment.notify_email_sent',
  AppointmentNotifyEmailFailed = 'appointment.notify_email_failed',
}
