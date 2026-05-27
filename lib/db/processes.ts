import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from './index';
import {
  processes,
  processLicenseTypes,
  processMilestoneKinds,
  processMilestones,
  processTasks,
} from './schema';
import { vProcessesWithProgress } from './views';
import type {
  processStatus,
  processTipologia,
  processLicenseType,
  processTaskStatus,
  processTaskPriority,
} from './enums';

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
  progress_percent: number;
  pendencias_count: number;
};

/**
 * Per-tenant list of processes, joined to the `v_processes_with_progress`
 * view so callers receive `progress_percent` + `pendencias_count` without
 * a second roundtrip.
 *
 * Application-layer scoping — `WHERE client_id = $clientId` is the
 * isolation boundary until RLS lands in #22 (RLS section). Defaults to `LIMIT 200` so a
 * runaway list doesn't blow up the RSC payload; callers can paginate later
 * via `{ limit, offset }`.
 */
export async function listProcessesForClient(
  clientId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<ProcessRow[]> {
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  return db
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
    .offset(offset);
}

export async function getProcessById(
  clientId: string,
  processId: string,
): Promise<ProcessRow | null> {
  const rows = await db
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
export async function listBuckets(clientId: string): Promise<ProcessBuckets> {
  const rows = await listProcessesForClient(clientId);
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
 */
export async function listProcessSyncItemsForClient(
  clientId: string,
): Promise<ProcessSyncItem[]> {
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
 */
export async function getProcessForExport(
  clientId: string,
  processId: string,
): Promise<ProcessForExport | null> {
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

/** Lists the ids of non-deleted processes for a client (export iteration). */
export async function listProcessIdsForClient(
  clientId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: processes.id })
    .from(processes)
    .where(and(eq(processes.client_id, clientId), isNull(processes.deleted_at)));
  return rows.map((r) => r.id);
}
