import {
  cnpjDigits,
  foldDiacritics,
  parseCheckbox,
  parseDate,
  parseMultiSelect,
  parseRelation,
  parseRichText,
  parseSelect,
  parseStatus,
  parseTitle,
  parseUrl,
  stripMarkdown,
} from './parsers';
import { statusFromLabel } from './bucketing';
import {
  NotionMappingError,
  type NotionPage,
  type NotionPropertyValue,
  type NotionSyncError,
  type ParsedProcess,
  type ParsedTask,
  type ProcessLicenseType,
  type ProcessTaskPriority,
  type ProcessTaskStatus,
  type ProcessTipologia,
} from './types';

/**
 * Canonical Notion property map for Sustentec processes.
 *
 * This is the single source of truth for translating Notion's denormalized
 * property layout into the canonical Supabase columns. It encodes the JSONC
 * map from issue #9 as a typed TS object.
 *
 * TODO(#22): per-client overrides require a `clients.notion_property_map jsonb`
 * column that does not exist yet. Engeprat v1 uses this canonical map verbatim
 * (no overrides). When the column lands, deep-merge the override onto this
 * object before parsing.
 */

// ---------------------------------------------------------------------------
// Scalar property names (Notion property -> canonical column)
// ---------------------------------------------------------------------------
export const SCALAR_PROPERTIES = {
  name: 'Projeto',
  code: 'CC',
  process_number: 'N° PROCESSO',
  objective: 'Objetivo',
  observation: 'Observação',
  links: 'Links',
  city: 'Município',
  environmental_agency: 'Órgão Ambiental',
  client_cnpj: 'CNPJ CLIENTE',
  applicant_cnpj: 'CNPJ REQUERENTE',
  status: 'Situação',
  tipologia: 'TIPOLOGIA',
  license_types: 'INSTRUMENTO',
  responsible: 'Responsável',
  tasks: 'TAREFAS',
  started_at: 'Início',
  due_date: 'Prazo',
  finished_at: 'Entrega',
} as const;

// ---------------------------------------------------------------------------
// TIPOLOGIA select -> process_tipologia enum
// ---------------------------------------------------------------------------
export const TIPOLOGIA_MAP: Record<string, ProcessTipologia> = {
  licenciamento: 'licenciamento',
  consultoria: 'consultoria',
  laudo: 'laudo',
  monitoramento: 'monitoramento',
  outros: 'outros',
};

// ---------------------------------------------------------------------------
// INSTRUMENTO multi_select -> process_license_type enum
//
// The current process_license_type enum is a reduced set:
//   { LP, LI, LO, LAS, LMA, renovacao, outros }
// The issue lists richer Notion labels (LAI, CA, OUTORGA, LOR, AA, ASV, NÃO
// CABE, CTA, AVERBAÇÃO, LIO). Those that have no dedicated enum member fold to
// `outros`; renewal-style labels fold to `renovacao`. LP/LI/LO map 1:1.
// ---------------------------------------------------------------------------
export const LICENSE_TYPE_MAP: Record<string, ProcessLicenseType> = {
  lp: 'LP',
  li: 'LI',
  lo: 'LO',
  las: 'LAS',
  lma: 'LMA',
  lai: 'outros',
  ca: 'outros',
  outorga: 'outros',
  lor: 'renovacao',
  aa: 'outros',
  asv: 'outros',
  'nao cabe': 'outros',
  cta: 'outros',
  averbacao: 'outros',
  lio: 'outros',
  renovacao: 'renovacao',
};

// ---------------------------------------------------------------------------
// Milestone kind map: Notion weighted-checkbox property label -> kind slug.
// The slugs match scripts/seed-data.ts + process_milestone_kinds (14 rows).
// ---------------------------------------------------------------------------
export const MILESTONE_KIND_MAP: Record<string, string> = {
  'Aceite do cliente (2%)': 'aceite_cliente',
  'Análise prévia (10%)': 'analise_previa',
  'Levantamento de campo (20%)': 'levantamento_campo',
  'Juntar documentação (10%)': 'juntar_documentacao',
  'Abertura do processo (2%)': 'abertura_processo',
  'Assinatura dos documentos (2%)': 'assinatura_documentos',
  'ART (2%)': 'art',
  'Relatório preliminar (20%)': 'relatorio_preliminar',
  'EXIGÊNCIA 1 (10%)': 'exigencia_1',
  'EXIGÊNCIA 2 (10%)': 'exigencia_2',
  'EXIGÊNCIA 3 (10%)': 'exigencia_3',
  'Revisão (15%)': 'revisao',
  'Relatório final (15%)': 'relatorio_final',
  'Entrega (2%)': 'entrega',
};

// ---------------------------------------------------------------------------
// TAREFAS sub-property names + value maps
// ---------------------------------------------------------------------------
export const TASK_PROPERTIES = {
  title: 'Tarefa',
  summary: 'Resumo',
  status: 'Status',
  priority: 'Prioridade',
  due_date: 'Prazo',
} as const;

// Notion task status -> process_task_status enum
// (enum: aberta, em_andamento, aguardando_cliente, concluida, arquivada)
export const TASK_STATUS_MAP: Record<string, ProcessTaskStatus> = {
  'a fazer': 'aberta',
  aberta: 'aberta',
  'em andamento': 'em_andamento',
  'aguardando cliente': 'aguardando_cliente',
  concluida: 'concluida',
  concluído: 'concluida',
  concluida_: 'concluida',
  arquivada: 'arquivada',
};

// Notion task priority -> process_task_priority enum
// (enum: baixa, media, alta, urgente)
export const TASK_PRIORITY_MAP: Record<string, ProcessTaskPriority> = {
  baixa: 'baixa',
  media: 'media',
  'média': 'media',
  alta: 'alta',
  urgente: 'urgente',
};

function fold(s: string): string {
  return foldDiacritics(s);
}

function err(
  field: string,
  notion_property: string,
  message: string,
  value?: unknown,
): NotionSyncError {
  return {
    field,
    notion_property,
    value,
    message,
    at: new Date().toISOString(),
  };
}

/**
 * Parses one TAREFAS sub-page into a ParsedTask. Throws NotionMappingError on a
 * structurally invalid property (which rolls back the parent page). Unknown
 * status/priority labels fall back to the enum default (non-fatal).
 */
export function parseTask(page: NotionPage): ParsedTask {
  const props = page.properties ?? {};
  const title =
    parseTitle(props[TASK_PROPERTIES.title]) ??
    // Fallback: some task DBs name the title column differently; try any title.
    parseTitle(findFirstTitle(props)) ??
    '(sem título)';
  const summary = parseRichText(props[TASK_PROPERTIES.summary]);

  const rawStatus = parseStatus(props[TASK_PROPERTIES.status]);
  const status: ProcessTaskStatus = rawStatus
    ? TASK_STATUS_MAP[fold(rawStatus)] ?? 'aberta'
    : 'aberta';

  const rawPriority = parseSelect(props[TASK_PROPERTIES.priority]);
  const priority: ProcessTaskPriority = rawPriority
    ? TASK_PRIORITY_MAP[fold(rawPriority)] ?? 'media'
    : 'media';

  const due_date = parseDate(props[TASK_PROPERTIES.due_date]);

  return {
    notion_page_id: page.id,
    title,
    summary,
    status,
    priority,
    due_date,
  };
}

function findFirstTitle(
  props: Record<string, NotionPropertyValue>,
): NotionPropertyValue | undefined {
  for (const value of Object.values(props)) {
    if (value && typeof value === 'object' && 'title' in value) return value;
  }
  return undefined;
}

/**
 * Applies the canonical property map to a Notion process page, producing a
 * fully-parsed `ParsedProcess`. Task relations are resolved separately by the
 * adapter (which fetches each related page); `taskPages` is passed in already
 * fetched. `aliasResolver` resolves a raw responsible label to a canonical
 * tech slug (case/diacritic-insensitive); returns null when unmapped.
 *
 * Structural property errors throw NotionMappingError (parent-page rollback).
 * Soft data problems (invalid tipologia, unmapped responsible) append to
 * `errors` and degrade the field to null — they do NOT throw.
 */
export function parseProcess(
  page: NotionPage,
  opts: {
    taskPages?: NotionPage[];
    resolveResponsible?: (label: string) => string | null;
  } = {},
): ParsedProcess {
  const props = page.properties ?? {};
  const errors: NotionSyncError[] = [];

  const name = parseTitle(props[SCALAR_PROPERTIES.name]);
  const code = parseRichText(props[SCALAR_PROPERTIES.code]);
  const process_number = stripMarkdown(
    parseRichText(props[SCALAR_PROPERTIES.process_number]),
  );
  const objective = parseRichText(props[SCALAR_PROPERTIES.objective]);
  const observation = parseRichText(props[SCALAR_PROPERTIES.observation]);
  const links = parseUrlOrRichText(props[SCALAR_PROPERTIES.links]);
  const city = parseRichText(props[SCALAR_PROPERTIES.city]);
  const environmental_agency = parseRichText(
    props[SCALAR_PROPERTIES.environmental_agency],
  );
  const client_cnpj = cnpjDigits(
    parseRichText(props[SCALAR_PROPERTIES.client_cnpj]),
  );
  const applicant_cnpj = cnpjDigits(
    parseRichText(props[SCALAR_PROPERTIES.applicant_cnpj]),
  );

  // Status: normalized -> enum, raw preserved.
  const status_label = parseStatus(props[SCALAR_PROPERTIES.status]);
  const status = statusFromLabel(status_label);

  // Tipologia: validate against enum; invalid/empty -> null + error.
  const rawTipologia = parseSelect(props[SCALAR_PROPERTIES.tipologia]);
  let tipologia: ProcessTipologia | null = null;
  if (rawTipologia) {
    const mapped = TIPOLOGIA_MAP[fold(rawTipologia)];
    if (mapped) {
      tipologia = mapped;
    } else {
      errors.push(
        err(
          'tipologia',
          SCALAR_PROPERTIES.tipologia,
          `unknown tipologia "${rawTipologia}" — not in process_tipologia enum`,
          rawTipologia,
        ),
      );
    }
  }

  // License types: multi_select -> enum list (dedupe).
  const rawLicenses = parseMultiSelect(props[SCALAR_PROPERTIES.license_types]);
  const licenseSet = new Set<ProcessLicenseType>();
  for (const raw of rawLicenses) {
    const mapped = LICENSE_TYPE_MAP[fold(raw)];
    if (mapped) {
      licenseSet.add(mapped);
    } else {
      errors.push(
        err(
          'license_types',
          SCALAR_PROPERTIES.license_types,
          `unknown instrumento "${raw}" — folding to "outros"`,
          raw,
        ),
      );
      licenseSet.add('outros');
    }
  }

  // Responsible: resolve via alias resolver.
  const responsible_label = parseSelect(props[SCALAR_PROPERTIES.responsible]);
  let responsible_tech_slug: string | null = null;
  if (responsible_label) {
    const slug = opts.resolveResponsible?.(responsible_label) ?? null;
    if (slug) {
      responsible_tech_slug = slug;
    } else {
      errors.push(
        err(
          'responsible_tech_id',
          SCALAR_PROPERTIES.responsible,
          `unmapped responsible "${responsible_label}" — no alias match`,
          responsible_label,
        ),
      );
    }
  }

  // Milestones: weighted-checkbox properties keyed by their Notion label.
  const milestones: Record<string, boolean> = {};
  for (const [notionLabel, slug] of Object.entries(MILESTONE_KIND_MAP)) {
    const prop = props[notionLabel];
    if (prop === undefined) continue;
    milestones[slug] = parseCheckbox(prop);
  }

  // Dates.
  const started_at = parseDate(props[SCALAR_PROPERTIES.started_at]);
  const due_date = parseDate(props[SCALAR_PROPERTIES.due_date]);
  const finished_at = parseDate(props[SCALAR_PROPERTIES.finished_at]);

  // Tasks (already-fetched related pages).
  const tasks: ParsedTask[] = (opts.taskPages ?? []).map((p) => parseTask(p));

  return {
    notion_page_id: page.id,
    notion_etag: page.last_edited_time ?? null,
    name,
    code,
    process_number,
    objective,
    observation,
    links,
    city,
    environmental_agency,
    status,
    status_label,
    tipologia,
    client_cnpj,
    applicant_cnpj,
    started_at,
    due_date,
    finished_at,
    responsible_tech_slug,
    responsible_label,
    license_types: [...licenseSet],
    milestones,
    tasks,
    errors,
  };
}

/** Links may arrive as a url property or a rich_text blob. Accept either. */
function parseUrlOrRichText(
  prop: NotionPropertyValue | undefined,
): string | null {
  if (!prop) return null;
  if ('url' in prop) return parseUrl(prop);
  if ('rich_text' in prop) return parseRichText(prop);
  throw new NotionMappingError('links', 'property is not a url or rich_text');
}

/** Returns the relation page-ids of the TAREFAS property on a process page. */
export function taskRelationIds(page: NotionPage): string[] {
  return parseRelation(page.properties?.[SCALAR_PROPERTIES.tasks]);
}

// ===========================================================================
// Reverse direction (DB -> Notion). Used by `exportToNotion`.
//
// The canonical map above is intentionally lossy in places (several Notion
// INSTRUMENTO labels fold to `outros`/`renovacao`; status folds many labels
// to one enum value). For write-back we therefore prefer the PRESERVED raw
// label where we have one (status_label) and use a best-effort canonical label
// otherwise. We never invent richer labels we can't recover.
// ===========================================================================

/** process_tipologia enum -> Notion TIPOLOGIA select label (title-cased). */
export const TIPOLOGIA_REVERSE: Record<ProcessTipologia, string> = {
  licenciamento: 'Licenciamento',
  consultoria: 'Consultoria',
  laudo: 'Laudo',
  monitoramento: 'Monitoramento',
  outros: 'Outros',
};

/**
 * process_license_type enum -> Notion INSTRUMENTO multi_select label.
 * Only the values that have a stable 1:1 Notion label round-trip cleanly;
 * `renovacao`/`outros` re-emit a generic label (the original richer label was
 * not preserved on import).
 */
export const LICENSE_TYPE_REVERSE: Record<ProcessLicenseType, string> = {
  LP: 'LP',
  LI: 'LI',
  LO: 'LO',
  LAS: 'LAS',
  LMA: 'LMA',
  renovacao: 'Renovação',
  outros: 'Outros',
};

/** process_task_status enum -> Notion task Status label. */
export const TASK_STATUS_REVERSE: Record<ProcessTaskStatus, string> = {
  aberta: 'A Fazer',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  concluida: 'Concluída',
  arquivada: 'Arquivada',
};

/** process_task_priority enum -> Notion task Prioridade label. */
export const TASK_PRIORITY_REVERSE: Record<ProcessTaskPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

/** kind slug -> Notion weighted-checkbox property label (inverse of MAP). */
export const MILESTONE_SLUG_TO_LABEL: Record<string, string> = Object.entries(
  MILESTONE_KIND_MAP,
).reduce<Record<string, string>>((acc, [label, slug]) => {
  acc[slug] = label;
  return acc;
}, {});

// --- Notion property value builders (the @notionhq write shapes) ---
export function notionTitle(value: string | null): { title: unknown[] } {
  return {
    title: value ? [{ type: 'text', text: { content: value } }] : [],
  };
}

export function notionRichText(value: string | null): { rich_text: unknown[] } {
  return {
    rich_text: value ? [{ type: 'text', text: { content: value } }] : [],
  };
}

export function notionUrl(value: string | null): { url: string | null } {
  return { url: value && value.length > 0 ? value : null };
}

export function notionSelect(
  name: string | null,
): { select: { name: string } | null } {
  return { select: name ? { name } : null };
}

export function notionStatus(
  name: string | null,
): { status: { name: string } | null } {
  return { status: name ? { name } : null };
}

export function notionMultiSelect(
  names: string[],
): { multi_select: { name: string }[] } {
  return { multi_select: names.map((name) => ({ name })) };
}

export function notionDate(
  start: string | null,
): { date: { start: string } | null } {
  return { date: start ? { start } : null };
}

export function notionCheckbox(checked: boolean): { checkbox: boolean } {
  return { checkbox: checked };
}
