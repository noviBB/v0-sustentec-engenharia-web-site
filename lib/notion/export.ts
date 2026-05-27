import 'server-only';

import {
  LICENSE_TYPE_REVERSE,
  MILESTONE_SLUG_TO_LABEL,
  SCALAR_PROPERTIES,
  TASK_PRIORITY_REVERSE,
  TASK_PROPERTIES,
  TASK_STATUS_REVERSE,
  TIPOLOGIA_REVERSE,
  notionCheckbox,
  notionDate,
  notionMultiSelect,
  notionRichText,
  notionSelect,
  notionStatus,
  notionTitle,
  notionUrl,
} from './property-map';
import type {
  ExportTask,
  NotionPropertyPayload,
  NotionTaskPayload,
  ProcessWithRelations,
} from './types';

/**
 * Reverse direction (DB -> Notion): build a Notion property payload from a
 * canonical process, using the canonical property map (`property-map.ts`) in
 * reverse.
 *
 * Key decisions:
 *  - `Situação` re-emits the PRESERVED raw `status_label` (not the folded enum)
 *    so the team's exact casing/wording survives a round-trip. Falls back to
 *    the enum value only when no label was preserved.
 *  - License types / tipologia map back via the explicit reverse tables. The
 *    forward import is lossy for some INSTRUMENTO labels (they fold to
 *    `outros`/`renovacao`); we re-emit the best-effort canonical label.
 *  - Milestones become weighted-checkbox properties keyed by their Notion
 *    label; only slugs we have a label for are emitted.
 *  - Tasks are emitted as separate per-page payloads (TAREFAS sub-pages).
 *
 * This is a PURE mapping function — it performs no I/O and is fully unit-
 * testable against fixtures. The actual Notion write is done by the caller via
 * the client write methods.
 */
export function exportToNotion(
  process: ProcessWithRelations,
): NotionPropertyPayload {
  const properties: Record<string, unknown> = {
    [SCALAR_PROPERTIES.name]: notionTitle(process.name),
    [SCALAR_PROPERTIES.code]: notionRichText(process.code),
    [SCALAR_PROPERTIES.process_number]: notionRichText(process.process_number),
    [SCALAR_PROPERTIES.objective]: notionRichText(process.objective),
    [SCALAR_PROPERTIES.observation]: notionRichText(process.observation),
    [SCALAR_PROPERTIES.links]: notionUrl(process.links),
    [SCALAR_PROPERTIES.city]: notionRichText(process.city),
    [SCALAR_PROPERTIES.environmental_agency]: notionRichText(
      process.environmental_agency,
    ),
    [SCALAR_PROPERTIES.client_cnpj]: notionRichText(process.client_cnpj),
    [SCALAR_PROPERTIES.applicant_cnpj]: notionRichText(process.applicant_cnpj),
    // Re-emit the preserved raw label so the team's casing is preserved.
    [SCALAR_PROPERTIES.status]: notionStatus(
      process.status_label ?? process.status,
    ),
    [SCALAR_PROPERTIES.tipologia]: notionSelect(
      process.tipologia ? TIPOLOGIA_REVERSE[process.tipologia] : null,
    ),
    [SCALAR_PROPERTIES.license_types]: notionMultiSelect(
      dedupe(process.license_types.map((lt) => LICENSE_TYPE_REVERSE[lt])),
    ),
    [SCALAR_PROPERTIES.started_at]: notionDate(process.started_at),
    [SCALAR_PROPERTIES.due_date]: notionDate(process.due_date),
    [SCALAR_PROPERTIES.finished_at]: notionDate(process.finished_at),
  };

  // Milestones: weighted-checkbox properties keyed by their Notion label.
  for (const [slug, checked] of Object.entries(process.milestones)) {
    const label = MILESTONE_SLUG_TO_LABEL[slug];
    if (!label) continue;
    properties[label] = notionCheckbox(checked);
  }

  return {
    page_id: process.notion_page_id,
    properties,
    tasks: process.tasks.map(taskToNotion),
  };
}

/** Builds the Notion property payload for one TAREFAS sub-page. */
function taskToNotion(task: ExportTask): NotionTaskPayload {
  return {
    page_id: task.notion_page_id,
    properties: {
      [TASK_PROPERTIES.title]: notionTitle(task.title),
      [TASK_PROPERTIES.summary]: notionRichText(task.summary),
      [TASK_PROPERTIES.status]: notionStatus(TASK_STATUS_REVERSE[task.status]),
      [TASK_PROPERTIES.priority]: notionSelect(
        TASK_PRIORITY_REVERSE[task.priority],
      ),
      [TASK_PROPERTIES.due_date]: notionDate(task.due_date),
    },
  };
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}
