import { z } from 'zod';

/**
 * Branded (nominal) entity ID types — the foundation for threading typed IDs
 * through repos, services, and controllers.
 *
 * Two tiers, by trust:
 *
 *  1. zod brand schemas (`xxxIdSchema`) — for UNTRUSTED input crossing a
 *     boundary (controllers, webhook payloads, query params). They validate
 *     the string AND brand it in one step, with zero `as`. Parse untrusted
 *     strings here; never hand-cast them.
 *
 *  2. trusted constructors (`asXxx`) — for DB-origin strings. The database is
 *     the source of truth, so these brand without re-validating. They route
 *     through `brand()`, the SINGLE quarantined assertion in this module — the
 *     only place a type-assertion is permitted for ID branding.
 *
 * Framework-free on purpose (no `server-only`): the branded types are used in
 * both client type positions and server runtime code.
 */

// ── Tier 1: zod brand schemas (untrusted input) ─────────────────────────────

export const clientIdSchema = z.string().uuid().brand<'ClientId'>();
export type ClientId = z.infer<typeof clientIdSchema>;

export const processIdSchema = z.string().uuid().brand<'ProcessId'>();
export type ProcessId = z.infer<typeof processIdSchema>;

export const userIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof userIdSchema>;

export const messageIdSchema = z.string().uuid().brand<'MessageId'>();
export type MessageId = z.infer<typeof messageIdSchema>;

export const paymentIdSchema = z.string().uuid().brand<'PaymentId'>();
export type PaymentId = z.infer<typeof paymentIdSchema>;

export const appointmentIdSchema = z.string().uuid().brand<'AppointmentId'>();
export type AppointmentId = z.infer<typeof appointmentIdSchema>;

export const responsibleTechIdSchema = z.string().uuid().brand<'ResponsibleTechId'>();
export type ResponsibleTechId = z.infer<typeof responsibleTechIdSchema>;

// Notion ids are NOT uuids — they are opaque non-empty strings.
export const notionPageIdSchema = z.string().min(1).brand<'NotionPageId'>();
export type NotionPageId = z.infer<typeof notionPageIdSchema>;

// ── Tier 2: trusted constructors (DB-origin strings) ────────────────────────

/**
 * The single quarantined assertion in this module. Brands a string the DB
 * already vouches for, without re-validation. Reused by every `asXxx` below so
 * the cast lives in exactly one place.
 */
function brand<B>(s: string): B {
  // eslint-disable-next-line no-restricted-syntax -- nominal branding of a trusted DB string (no re-validation by design); quarantined; see docs/conventions.md
  return s as B;
}

export const asClientId = (s: string): ClientId => brand<ClientId>(s);
export const asProcessId = (s: string): ProcessId => brand<ProcessId>(s);
export const asUserId = (s: string): UserId => brand<UserId>(s);
export const asMessageId = (s: string): MessageId => brand<MessageId>(s);
export const asPaymentId = (s: string): PaymentId => brand<PaymentId>(s);
export const asAppointmentId = (s: string): AppointmentId => brand<AppointmentId>(s);
export const asResponsibleTechId = (s: string): ResponsibleTechId => brand<ResponsibleTechId>(s);
export const asNotionPageId = (s: string): NotionPageId => brand<NotionPageId>(s);
