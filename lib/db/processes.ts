import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from './index';
import { vProcessesWithProgress } from './views';
import type { processStatus, processTipologia } from './enums';

// `pgView` doesn't expose `$inferSelect`; declare the row shape explicitly to
// mirror the columns in `lib/db/views.ts`. Keep this in sync when the view
// gains/loses columns.
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
 * isolation boundary until RLS lands in #18.
 */
export async function listProcessesForClient(
  clientId: string,
): Promise<ProcessRow[]> {
  return db
    .select()
    .from(vProcessesWithProgress)
    .where(
      and(
        eq(vProcessesWithProgress.client_id, clientId),
        isNull(vProcessesWithProgress.deleted_at),
      ),
    )
    .orderBy(desc(vProcessesWithProgress.created_at));
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
