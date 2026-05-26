import 'server-only';

import type {
  processStatus,
  processTipologia,
  processLicenseType,
  processTaskStatus,
  processTaskPriority,
} from '@/lib/db/enums';

// ---------------------------------------------------------------------------
// Enum value unions (mirrors of the Drizzle pgEnum value lists)
// ---------------------------------------------------------------------------
export type ProcessStatus = (typeof processStatus.enumValues)[number];
export type ProcessBucket = 'andamento' | 'acompanhamento' | 'finalizado';
export type ProcessTipologia = (typeof processTipologia.enumValues)[number];
export type ProcessLicenseType = (typeof processLicenseType.enumValues)[number];
export type ProcessTaskStatus = (typeof processTaskStatus.enumValues)[number];
export type ProcessTaskPriority = (typeof processTaskPriority.enumValues)[number];

// ---------------------------------------------------------------------------
// Minimal Notion page shape (we only depend on `id` + `properties` + meta).
// We avoid importing @notionhq/client types into the public surface so the
// parsers can be tested against hand-written fixtures.
// ---------------------------------------------------------------------------
export interface NotionPropertyValue {
  id?: string;
  type?: string;
  // The discriminated payload (title, rich_text, select, etc.). We read it
  // loosely in the parsers and validate the shape there.
  [key: string]: unknown;
}

export interface NotionPage {
  id: string;
  /** Notion's last_edited_time — used as the etag for change detection. */
  last_edited_time?: string;
  properties: Record<string, NotionPropertyValue>;
}

// ---------------------------------------------------------------------------
// A single mapping error recorded on processes.notion_sync_errors. These are
// non-fatal: they degrade a field to NULL but do not roll back the page.
// ---------------------------------------------------------------------------
export interface NotionSyncError {
  field: string;
  notion_property?: string;
  value?: unknown;
  message: string;
  at: string;
}

// ---------------------------------------------------------------------------
// Parsed task (one row of the TAREFAS relation, fully resolved).
// ---------------------------------------------------------------------------
export interface ParsedTask {
  notion_page_id: string;
  title: string;
  summary: string | null;
  status: ProcessTaskStatus;
  priority: ProcessTaskPriority;
  due_date: string | null;
}

// ---------------------------------------------------------------------------
// The fully-parsed representation of one Notion process page, ready for the
// repository to write in a single transaction.
// ---------------------------------------------------------------------------
export interface ParsedProcess {
  notion_page_id: string;
  notion_etag: string | null;
  name: string | null;
  code: string | null;
  process_number: string | null;
  objective: string | null;
  observation: string | null;
  links: string | null;
  city: string | null;
  environmental_agency: string | null;
  status: ProcessStatus;
  status_label: string | null;
  tipologia: ProcessTipologia | null;
  client_cnpj: string | null;
  applicant_cnpj: string | null;
  started_at: string | null;
  due_date: string | null;
  finished_at: string | null;
  /** Canonical responsible tech slug resolved via aliases, or null. */
  responsible_tech_slug: string | null;
  /** Raw Notion label for the responsible (for alias resolution / errors). */
  responsible_label: string | null;
  license_types: ProcessLicenseType[];
  /** kind slug -> checked. Only slugs present in the page are included. */
  milestones: Record<string, boolean>;
  tasks: ParsedTask[];
  errors: NotionSyncError[];
}

// ---------------------------------------------------------------------------
// Result of a syncClient run (mirrors the audit_log metadata).
// ---------------------------------------------------------------------------
export interface SyncResult {
  client_id: string;
  pages_total: number;
  pages_created: number;
  pages_updated: number;
  pages_skipped: number;
  pages_failed: number;
  pages_soft_deleted: number;
}

// ---------------------------------------------------------------------------
// Export payload (issue: exportToNotion is a stub for #11+).
// ---------------------------------------------------------------------------
export interface NotionPropertyPayload {
  properties: Record<string, unknown>;
}

export interface ProcessWithRelations {
  id: string;
  notion_page_id: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

/** Thrown by stubs that are intentionally not built yet (export / webhooks). */
export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`${feature} is not implemented yet`);
    this.name = 'NotImplementedError';
  }
}

/**
 * Thrown when a Notion property has an unexpected type/shape that we cannot
 * safely map. A NotionMappingError on a page rolls back THAT page's
 * transaction (it does not stamp notion_synced_at), but other pages continue.
 */
export class NotionMappingError extends Error {
  readonly property: string;
  constructor(property: string, message: string) {
    super(`[${property}] ${message}`);
    this.name = 'NotionMappingError';
    this.property = property;
  }
}

/** Thrown lazily when NOTION_INTEGRATION_TOKEN is missing at sync time. */
export class NotionTokenMissingError extends Error {
  constructor() {
    super(
      'NOTION_INTEGRATION_TOKEN is not set — cannot reach the Notion API. ' +
        'Set it in the environment to enable live sync.',
    );
    this.name = 'NotionTokenMissingError';
  }
}
