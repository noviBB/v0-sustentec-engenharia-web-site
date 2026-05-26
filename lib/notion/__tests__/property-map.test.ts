import { describe, expect, it } from 'vitest';

import { parseProcess, parseTask, taskRelationIds } from '../property-map';
import { NotionMappingError } from '../types';
import {
  ENGEPRAT_PROCESS_PAGE,
  PROCESS_WITH_SOFT_ERRORS,
  PROCESS_WITH_TYPE_ERROR,
  TASK_PAGE_1,
  TASK_PAGE_2,
} from './fixtures';

// Resolver that mirrors the seeded aliases (folded label -> slug).
const resolver = (label: string): string | null => {
  const map: Record<string, string> = {
    maira: 'maira',
    guilherme: 'guilherme',
    'dra. ivon oristela benitez gonzalez': 'ivon-benitez',
  };
  return map[label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()] ?? null;
};

describe('parseProcess (canonical map applied to Engeprat fixture)', () => {
  const parsed = parseProcess(ENGEPRAT_PROCESS_PAGE, {
    taskPages: [TASK_PAGE_1, TASK_PAGE_2],
    resolveResponsible: resolver,
  });

  it('maps scalars', () => {
    expect(parsed.name).toBe('Enge Prat - UNOPS Planos');
    expect(parsed.code).toBe('CC 26-004');
    expect(parsed.city).toBe('Niterói - RJ');
    expect(parsed.environmental_agency).toBe('INEA');
  });

  it('strips markdown from process_number', () => {
    expect(parsed.process_number).toBe('EIS-PRO-2025/14072');
  });

  it('normalizes CNPJ to digits and null-empty applicant', () => {
    expect(parsed.client_cnpj).toBe('03314057000153');
    expect(parsed.applicant_cnpj).toBeNull();
  });

  it('derives status enum but preserves raw label', () => {
    expect(parsed.status).toBe('andamento');
    expect(parsed.status_label).toBe('Em análise');
  });

  it('validates tipologia against enum', () => {
    expect(parsed.tipologia).toBe('licenciamento');
  });

  it('maps license types (ASV folds to outros, dedupes)', () => {
    expect([...parsed.license_types].sort()).toEqual(['LI', 'LP', 'outros']);
  });

  it('resolves responsible via alias resolver', () => {
    expect(parsed.responsible_label).toBe('Maíra');
    expect(parsed.responsible_tech_slug).toBe('maira');
  });

  it('reads only the milestone checkboxes present', () => {
    expect(parsed.milestones).toEqual({
      aceite_cliente: true,
      analise_previa: true,
      levantamento_campo: false,
      entrega: false,
    });
  });

  it('parses dates', () => {
    expect(parsed.started_at).toBe('2026-01-15');
    expect(parsed.due_date).toBe('2026-06-30');
    expect(parsed.finished_at).toBeNull();
  });

  it('parses tasks with status/priority maps', () => {
    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks[0]).toMatchObject({
      notion_page_id: 'task-001',
      title: 'Coletar documentos',
      summary: 'Reunir CNPJ e matrícula do imóvel',
      status: 'em_andamento',
      priority: 'alta',
      due_date: '2026-02-01',
    });
    // "A Fazer" -> aberta, "Média" -> media, no due date.
    expect(parsed.tasks[1]).toMatchObject({
      notion_page_id: 'task-002',
      status: 'aberta',
      priority: 'media',
      due_date: null,
    });
  });

  it('carries etag from last_edited_time and no errors', () => {
    expect(parsed.notion_etag).toBe('2026-05-20T12:00:00.000Z');
    expect(parsed.errors).toHaveLength(0);
  });
});

describe('parseProcess soft errors (non-fatal)', () => {
  const parsed = parseProcess(PROCESS_WITH_SOFT_ERRORS, {
    resolveResponsible: resolver,
  });

  it('invalid tipologia -> null + error, not a throw', () => {
    expect(parsed.tipologia).toBeNull();
    expect(parsed.errors.some((e) => e.field === 'tipologia')).toBe(true);
  });

  it('unmapped responsible -> null slug + error', () => {
    expect(parsed.responsible_tech_slug).toBeNull();
    expect(parsed.errors.some((e) => e.field === 'responsible_tech_id')).toBe(
      true,
    );
  });

  it('unknown instrumento folds to outros + error', () => {
    expect(parsed.license_types).toEqual(['outros']);
    expect(parsed.errors.some((e) => e.field === 'license_types')).toBe(true);
  });
});

describe('parseProcess structural error (fatal -> throws)', () => {
  it('throws NotionMappingError on wrong property type', () => {
    expect(() => parseProcess(PROCESS_WITH_TYPE_ERROR)).toThrow(
      NotionMappingError,
    );
  });
});

describe('parseTask + taskRelationIds', () => {
  it('extracts relation ids from a process page', () => {
    expect(taskRelationIds(ENGEPRAT_PROCESS_PAGE)).toEqual([
      'task-001',
      'task-002',
    ]);
  });
  it('parses an individual task', () => {
    expect(parseTask(TASK_PAGE_1).title).toBe('Coletar documentos');
  });
});
