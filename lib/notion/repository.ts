import 'server-only';

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { getDbService } from '@/lib/db';
import {
  processes,
  processLicenseTypes,
  processMilestoneKinds,
  processMilestones,
  processTasks,
  responsibleTechAliases,
  responsibleTechs,
} from '@/lib/db/schema';
import { foldDiacritics } from './parsers';
import type { NotionSyncError, ParsedProcess } from './types';

const db = getDbService();

/**
 * Drizzle write layer for the Notion adapter. Operates in "service mode" via
 * the shared `db` instance (connects through DATABASE_URL with full access).
 * The portal is the sole reader; this adapter is the sole writer of process
 * data.
 */

export interface ImportOutcome {
  processId: string;
  created: boolean;
  /** A page that mapped cleanly but had no field changes vs. the stored row. */
  unchanged: boolean;
  errors: NotionSyncError[];
}

// ---------------------------------------------------------------------------
// Lookup caches (loaded once per syncClient run, passed into importFromNotion).
// ---------------------------------------------------------------------------
export interface SyncCaches {
  /** kind slug -> kind id */
  milestoneKindIdBySlug: Map<string, string>;
  /** folded notion_label -> responsible_tech slug */
  techSlugByAlias: Map<string, string>;
  /** responsible_tech slug -> id */
  techIdBySlug: Map<string, string>;
}

export async function loadSyncCaches(): Promise<SyncCaches> {
  const [kinds, techs, aliases] = await Promise.all([
    db
      .select({
        id: processMilestoneKinds.id,
        slug: processMilestoneKinds.slug,
      })
      .from(processMilestoneKinds),
    db
      .select({ id: responsibleTechs.id, slug: responsibleTechs.slug })
      .from(responsibleTechs),
    db
      .select({
        slug: responsibleTechs.slug,
        notion_label: responsibleTechAliases.notion_label,
      })
      .from(responsibleTechAliases)
      .innerJoin(
        responsibleTechs,
        eq(responsibleTechs.id, responsibleTechAliases.responsible_tech_id),
      ),
  ]);

  const milestoneKindIdBySlug = new Map(kinds.map((k) => [k.slug, k.id]));
  const techIdBySlug = new Map(techs.map((t) => [t.slug, t.id]));
  const techSlugByAlias = new Map(
    aliases.map((a) => [foldDiacritics(a.notion_label), a.slug] as const),
  );

  return { milestoneKindIdBySlug, techSlugByAlias, techIdBySlug };
}

/** Resolves a raw responsible label to a canonical tech slug, or null. */
export function makeResponsibleResolver(
  caches: SyncCaches,
): (label: string) => string | null {
  return (label: string) =>
    caches.techSlugByAlias.get(foldDiacritics(label)) ?? null;
}

/**
 * Imports one parsed Notion page into the canonical schema in a single
 * transaction. Parent row + all 4 sub-tables commit together or not at all.
 *
 * Non-fatal mapping problems already live in `parsed.errors`; they are written
 * to `processes.notion_sync_errors`. A thrown error inside the transaction
 * rolls everything back and is surfaced to the caller (which records the page
 * as failed and continues with the next page).
 */
export async function importFromNotion(
  clientId: string,
  parsed: ParsedProcess,
  caches: SyncCaches,
): Promise<ImportOutcome> {
  return db.transaction(async (tx) => {
    const responsibleId = parsed.responsible_tech_slug
      ? caches.techIdBySlug.get(parsed.responsible_tech_slug) ?? null
      : null;

    const errors = parsed.errors;
    const errorsJson = errors.length > 0 ? errors : null;

    // --- 1. Upsert the parent process row (keyed by notion_page_id). ---
    const existing = await tx
      .select({ id: processes.id })
      .from(processes)
      .where(
        and(
          eq(processes.notion_page_id, parsed.notion_page_id),
          isNull(processes.deleted_at),
        ),
      )
      .limit(1);

    const baseValues = {
      client_id: clientId,
      name: parsed.name,
      code: parsed.code,
      process_number: parsed.process_number,
      objective: parsed.objective,
      observation: parsed.observation,
      links: parsed.links,
      city: parsed.city,
      environmental_agency: parsed.environmental_agency,
      classe_impacto: parsed.classe_impacto,
      tempo_tramitacao: parsed.tempo_tramitacao,
      atividade_licenciada: parsed.atividade_licenciada,
      status: parsed.status,
      status_label: parsed.status_label,
      tipologia: parsed.tipologia,
      client_cnpj: parsed.client_cnpj,
      applicant_cnpj: parsed.applicant_cnpj,
      started_at: parsed.started_at,
      due_date: parsed.due_date,
      finished_at: parsed.finished_at,
      responsible_tech_id: responsibleId,
      notion_etag: parsed.notion_etag,
      notion_sync_errors: errorsJson,
      notion_synced_at: new Date(),
      deleted_at: null,
      updated_at: new Date(),
    };

    let processId: string;
    let created: boolean;
    let unchanged = false;

    if (existing.length > 0) {
      processId = existing[0].id;
      created = false;
      // Detect a no-op: compare the etag against the stored one.
      const prior = await tx
        .select({ etag: processes.notion_etag })
        .from(processes)
        .where(eq(processes.id, processId))
        .limit(1);
      unchanged =
        parsed.notion_etag != null &&
        prior[0]?.etag != null &&
        prior[0].etag === parsed.notion_etag;

      await tx
        .update(processes)
        .set(baseValues)
        .where(eq(processes.id, processId));
    } else {
      const ins = await tx
        .insert(processes)
        .values({ ...baseValues, notion_page_id: parsed.notion_page_id })
        .returning({ id: processes.id });
      processId = ins[0].id;
      created = true;
    }

    // --- 2. Replace license types. ---
    await tx
      .delete(processLicenseTypes)
      .where(eq(processLicenseTypes.process_id, processId));
    if (parsed.license_types.length > 0) {
      await tx.insert(processLicenseTypes).values(
        parsed.license_types.map((lt) => ({
          process_id: processId,
          license_type: lt,
        })),
      );
    }

    // --- 3. Upsert milestones (joined on kind slug). ---
    const milestoneRows = Object.entries(parsed.milestones)
      .map(([slug, checked]) => {
        const kindId = caches.milestoneKindIdBySlug.get(slug);
        if (!kindId) return null;
        return {
          process_id: processId,
          kind_id: kindId,
          checked,
          checked_at: checked ? new Date() : null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (milestoneRows.length > 0) {
      await tx
        .insert(processMilestones)
        .values(milestoneRows)
        .onConflictDoUpdate({
          target: [processMilestones.process_id, processMilestones.kind_id],
          set: {
            checked: sql`excluded.checked`,
            checked_at: sql`excluded.checked_at`,
          },
        });
    }

    // --- 4. Upsert tasks; soft-delete the ones that disappeared. ---
    const seenTaskIds = new Set<string>();
    for (const task of parsed.tasks) {
      seenTaskIds.add(task.notion_page_id);
      const existingTask = await tx
        .select({ id: processTasks.id })
        .from(processTasks)
        .where(eq(processTasks.notion_page_id, task.notion_page_id))
        .limit(1);

      const taskValues = {
        process_id: processId,
        title: task.title,
        summary: task.summary,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        notion_synced_at: new Date(),
        deleted_at: null, // clear on reappearance
        updated_at: new Date(),
      };

      if (existingTask.length > 0) {
        await tx
          .update(processTasks)
          .set(taskValues)
          .where(eq(processTasks.id, existingTask[0].id));
      } else {
        await tx
          .insert(processTasks)
          .values({ ...taskValues, notion_page_id: task.notion_page_id });
      }
    }

    // Soft-delete tasks of this process that are no longer present in Notion.
    const liveTasks = await tx
      .select({
        id: processTasks.id,
        notion_page_id: processTasks.notion_page_id,
      })
      .from(processTasks)
      .where(
        and(
          eq(processTasks.process_id, processId),
          isNull(processTasks.deleted_at),
        ),
      );
    const toDelete = liveTasks
      .filter(
        (t) => t.notion_page_id != null && !seenTaskIds.has(t.notion_page_id),
      )
      .map((t) => t.id);
    if (toDelete.length > 0) {
      await tx
        .update(processTasks)
        .set({ deleted_at: new Date() })
        .where(inArray(processTasks.id, toDelete));
    }

    return { processId, created, unchanged, errors };
  });
}

/**
 * Soft-deletes processes for a client whose notion_page_id is no longer in the
 * provided live set. Returns the count soft-deleted.
 */
export async function softDeleteMissing(
  clientId: string,
  liveNotionPageIds: string[],
): Promise<number> {
  const live = await db
    .select({
      id: processes.id,
      notion_page_id: processes.notion_page_id,
    })
    .from(processes)
    .where(and(eq(processes.client_id, clientId), isNull(processes.deleted_at)));

  const liveSet = new Set(liveNotionPageIds);
  const toDelete = live
    .filter(
      (p) =>
        p.notion_page_id != null && !liveSet.has(p.notion_page_id),
    )
    .map((p) => p.id);

  if (toDelete.length === 0) return 0;

  await db
    .update(processes)
    .set({ deleted_at: new Date(), updated_at: new Date() })
    .where(inArray(processes.id, toDelete));

  return toDelete.length;
}
