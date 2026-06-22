import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { dbRls, getDbService, type SessionLike } from '@/lib/db';
import {
  processes,
  processLicenseTypes,
  processMilestoneKinds,
  processMilestones,
  processTasks,
} from '@/lib/db/schema';
import { vProcessesWithProgress } from '@/lib/db/views';
import type {
  processStatus,
  processTipologia,
  processLicenseType,
  processTaskStatus,
  processTaskPriority,
} from '@/lib/db/enums';

// `pgView().existing()` in drizzle 0.36.x doesn't expose `$inferSelect` on
// the `PgViewWithSelection` type (verified — `tsc --noEmit` errors). Until
// drizzle grows that capability or we lift the column list into a reusable
// columns map, keep the row shape declared here and in sync with
// `lib/db/views.ts`.
export type ProcessRow = {
  id: string;
  client_id: string;
  code: string | null;
  process_number: string | null;
  name: string | null;
  objective: string | null;
  observation: string | null;
  links: string | null;
  status: (typeof processStatus.enumValues)[number];
  status_label: string | null;
  tipologia: (typeof processTipologia.enumValues)[number] | null;
  responsible_tech_id: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  environmental_agency: string | null;
  classe_impacto: string | null;
  tempo_tramitacao: string | null;
  atividade_licenciada: string | null;
  started_at: string | null;
  due_date: string | null;
  finished_at: string | null;
  client_cnpj: string | null;
  applicant_cnpj: string | null;
  notion_page_id: string | null;
  notion_synced_at: Date | null;
  notion_etag: string | null;
  notion_sync_errors: unknown;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  responsible_tech_name: string | null;
  license_types: string[];
  progress_percent: number;
  pendencias_count: number;
};

/**
 * Per-tenant list of processes, joined to the `v_processes_with_progress`
 * view so callers receive `progress_percent` + `pendencias_count` without
 * a second roundtrip.
 *
 * Isolation is RLS-first: `dbRls(session, ...)` runs the query as
 * `authenticated` with the caller's JWT claims propagated, and the
 * `processes` policy bounds the visible rows to the user's tenants. The
 * explicit `WHERE client_id = ?` filter stays as a seatbelt — pinning the
 * query to one tenant when a user has multiple.
 *
 * Defaults to `LIMIT 200` so a runaway list doesn't blow up the RSC payload;
 * callers can paginate later via `{ limit, offset }`.
 */
export async function listProcessesForClient(
  session: SessionLike,
  clientId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<ProcessRow[]> {
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  return dbRls(session, async (tx) =>
    tx
      .select()
      .from(vProcessesWithProgress)
      .where(
        and(
          eq(vProcessesWithProgress.client_id, clientId),
          isNull(vProcessesWithProgress.deleted_at),
        ),
      )
      .orderBy(desc(vProcessesWithProgress.created_at))
      .limit(limit)
      .offset(offset),
  );
}

export async function getProcessById(
  session: SessionLike,
  clientId: string,
  processId: string,
): Promise<ProcessRow | null> {
  return dbRls(session, async (tx) => {
    const rows = await tx
      .select()
      .from(vProcessesWithProgress)
      .where(
        and(
          eq(vProcessesWithProgress.client_id, clientId),
          eq(vProcessesWithProgress.id, processId),
          isNull(vProcessesWithProgress.deleted_at),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

export type ProcessBuckets = {
  andamento: ProcessRow[];
  acompanhamento: ProcessRow[];
  finalizado: ProcessRow[];
};

/**
 * Groups a client's processes into the three portal buckets in JS,
 * keeping the DB query to a single trip. Rows with status `arquivado`
 * are dropped — they're not surfaced to the portal.
 */
export async function listBuckets(
  session: SessionLike,
  clientId: string,
): Promise<ProcessBuckets> {
  const rows = await listProcessesForClient(session, clientId);
  const buckets: ProcessBuckets = {
    andamento: [],
    acompanhamento: [],
    finalizado: [],
  };
  for (const row of rows) {
    if (
      row.status === 'andamento' ||
      row.status === 'acompanhamento' ||
      row.status === 'finalizado'
    ) {
      buckets[row.status].push(row);
    }
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// SERVICE-MODE: sync / export read paths. These run from the Notion adapter
// and cron jobs, which iterate across all tenants and intentionally bypass
// RLS. Kept as separate functions (suffix-free, distinct from the portal
// helpers above) so a caller can't accidentally pick the wrong scope.
// ---------------------------------------------------------------------------

/**
 * Lightweight sync-listing row: the columns the Notion adapter / export path
 * need to identify a process and write it back. Read from the base
 * `processes` table (not the progress view) since this is a sync concern.
 */
export type ProcessSyncItem = {
  id: string;
  code: string | null;
  name: string | null;
  status: (typeof processStatus.enumValues)[number];
  status_label: string | null;
  notion_page_id: string | null;
  notion_synced_at: Date | null;
};

/**
 * Lists the (non-deleted) processes for a client with just the columns needed
 * for sync/export. The Notion adapter's `listForClient` delegates here so the
 * adapter never touches `db` directly.
 *
 * Service mode — the adapter runs as service_role and iterates across all
 * tenants.
 */
export async function listProcessSyncItemsForClient(
  clientId: string,
): Promise<ProcessSyncItem[]> {
  const db = getDbService();
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

// ---------------------------------------------------------------------------
// Export read path (DB -> Notion): the fully-hydrated process the reverse
// mapper (`exportToNotion`) needs. Assembled from the base tables in a few
// scoped reads. Lives here so the Notion adapter never touches `db` directly.
// ---------------------------------------------------------------------------
export type ProcessExportTask = {
  notion_page_id: string | null;
  title: string;
  summary: string | null;
  status: (typeof processTaskStatus.enumValues)[number];
  priority: (typeof processTaskPriority.enumValues)[number];
  due_date: string | null;
};

export type ProcessForExport = {
  id: string;
  notion_page_id: string | null;
  code: string | null;
  name: string | null;
  process_number: string | null;
  objective: string | null;
  observation: string | null;
  links: string | null;
  city: string | null;
  environmental_agency: string | null;
  status: (typeof processStatus.enumValues)[number];
  status_label: string | null;
  tipologia: (typeof processTipologia.enumValues)[number] | null;
  client_cnpj: string | null;
  applicant_cnpj: string | null;
  started_at: string | null;
  due_date: string | null;
  finished_at: string | null;
  license_types: (typeof processLicenseType.enumValues)[number][];
  /** kind slug -> checked. */
  milestones: Record<string, boolean>;
  tasks: ProcessExportTask[];
};

/**
 * Loads one non-deleted process for a client, fully hydrated with its license
 * types, milestone checkbox states (keyed by kind slug), and non-deleted
 * tasks. Returns `null` when the process is absent or cross-tenant.
 *
 * Service mode — sync/export caller.
 */
export async function getProcessForExport(
  clientId: string,
  processId: string,
): Promise<ProcessForExport | null> {
  const db = getDbService();
  const rows = await db
    .select()
    .from(processes)
    .where(
      and(
        eq(processes.client_id, clientId),
        eq(processes.id, processId),
        isNull(processes.deleted_at),
      ),
    )
    .limit(1);
  const p = rows[0];
  if (!p) return null;

  const [licenseRows, milestoneRows, taskRows] = await Promise.all([
    db
      .select({ license_type: processLicenseTypes.license_type })
      .from(processLicenseTypes)
      .where(eq(processLicenseTypes.process_id, processId)),
    db
      .select({
        slug: processMilestoneKinds.slug,
        checked: processMilestones.checked,
      })
      .from(processMilestones)
      .innerJoin(
        processMilestoneKinds,
        eq(processMilestoneKinds.id, processMilestones.kind_id),
      )
      .where(eq(processMilestones.process_id, processId)),
    db
      .select({
        notion_page_id: processTasks.notion_page_id,
        title: processTasks.title,
        summary: processTasks.summary,
        status: processTasks.status,
        priority: processTasks.priority,
        due_date: processTasks.due_date,
      })
      .from(processTasks)
      .where(
        and(
          eq(processTasks.process_id, processId),
          isNull(processTasks.deleted_at),
        ),
      ),
  ]);

  const milestones: Record<string, boolean> = {};
  for (const m of milestoneRows) milestones[m.slug] = m.checked;

  return {
    id: p.id,
    notion_page_id: p.notion_page_id,
    code: p.code,
    name: p.name,
    process_number: p.process_number,
    objective: p.objective,
    observation: p.observation,
    links: p.links,
    city: p.city,
    environmental_agency: p.environmental_agency,
    status: p.status,
    status_label: p.status_label,
    tipologia: p.tipologia,
    client_cnpj: p.client_cnpj,
    applicant_cnpj: p.applicant_cnpj,
    started_at: p.started_at,
    due_date: p.due_date,
    finished_at: p.finished_at,
    license_types: licenseRows.map((l) => l.license_type),
    milestones,
    tasks: taskRows,
  };
}

/**
 * Lookup row for the Notion webhook handler: maps an incoming `page.updated`
 * payload back to the canonical process (and the client that owns it) so the
 * adapter can decide whether to dedup or call `syncOne`. Service mode — the
 * webhook runs without a user session.
 *
 * Returns `null` when no live row tracks the given `notion_page_id`; the
 * webhook handler treats this as "unknown page" and no-ops idempotently.
 */
export type ProcessNotionLookup = {
  id: string;
  client_id: string;
  notion_etag: string | null;
};

export async function getProcessByNotionPageId(
  notionPageId: string,
): Promise<ProcessNotionLookup | null> {
  const db = getDbService();
  const rows = await db
    .select({
      id: processes.id,
      client_id: processes.client_id,
      notion_etag: processes.notion_etag,
    })
    .from(processes)
    .where(
      and(
        eq(processes.notion_page_id, notionPageId),
        isNull(processes.deleted_at),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Lists the ids of non-deleted processes for a client (export iteration).
 * Service mode.
 */
export async function listProcessIdsForClient(
  clientId: string,
): Promise<string[]> {
  const db = getDbService();
  const rows = await db
    .select({ id: processes.id })
    .from(processes)
    .where(and(eq(processes.client_id, clientId), isNull(processes.deleted_at)));
  return rows.map((r) => r.id);
}
