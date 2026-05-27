import { describe, expect, it } from 'vitest';

import { exportToNotion } from '../export';
import { SCALAR_PROPERTIES, TASK_PROPERTIES } from '../property-map';
import type { ProcessWithRelations } from '../types';

/**
 * Reverse-mapping fixtures. These mirror the canonical Supabase row shape the
 * repository (`lib/db/processes.ts:getProcessForExport`) produces, so the
 * DB -> Notion property mapping is verifiable without a live token.
 */
const FULL_PROCESS: ProcessWithRelations = {
  id: 'proc-001',
  notion_page_id: 'page-engeprat-001',
  code: 'CC 26-004',
  name: 'Enge Prat - UNOPS Planos',
  process_number: 'EIS-PRO-2025/14072',
  objective: 'Licenciamento ambiental do empreendimento',
  observation: 'Aguardando parecer técnico',
  links: 'https://example.com/proc',
  city: 'Niterói - RJ',
  environmental_agency: 'INEA',
  status: 'andamento',
  status_label: 'Em análise',
  tipologia: 'licenciamento',
  client_cnpj: '03314057000153',
  applicant_cnpj: null,
  started_at: '2026-01-15',
  due_date: '2026-06-30',
  finished_at: null,
  license_types: ['LP', 'LI', 'outros'],
  milestones: {
    aceite_cliente: true,
    analise_previa: true,
    levantamento_campo: false,
  },
  tasks: [
    {
      notion_page_id: 'task-001',
      title: 'Coletar documentos',
      summary: 'Reunir CNPJ e matrícula do imóvel',
      status: 'em_andamento',
      priority: 'alta',
      due_date: '2026-02-01',
    },
    {
      notion_page_id: null,
      title: 'Tarefa sem página',
      summary: null,
      status: 'aberta',
      priority: 'media',
      due_date: null,
    },
  ],
};

describe('exportToNotion (reverse mapping)', () => {
  const payload = exportToNotion(FULL_PROCESS);

  it('targets the linked Notion page', () => {
    expect(payload.page_id).toBe('page-engeprat-001');
  });

  it('maps the title (Projeto) as a title property', () => {
    expect(payload.properties[SCALAR_PROPERTIES.name]).toEqual({
      title: [{ type: 'text', text: { content: 'Enge Prat - UNOPS Planos' } }],
    });
  });

  it('maps scalar rich_text columns', () => {
    expect(payload.properties[SCALAR_PROPERTIES.code]).toEqual({
      rich_text: [{ type: 'text', text: { content: 'CC 26-004' } }],
    });
    expect(payload.properties[SCALAR_PROPERTIES.city]).toEqual({
      rich_text: [{ type: 'text', text: { content: 'Niterói - RJ' } }],
    });
  });

  it('emits empty rich_text for null columns', () => {
    expect(payload.properties[SCALAR_PROPERTIES.applicant_cnpj]).toEqual({
      rich_text: [],
    });
  });

  it('re-emits the preserved raw status_label for Situação (not the enum)', () => {
    expect(payload.properties[SCALAR_PROPERTIES.status]).toEqual({
      status: { name: 'Em análise' },
    });
  });

  it('falls back to the enum value when no status_label is preserved', () => {
    const p = exportToNotion({ ...FULL_PROCESS, status_label: null });
    expect(p.properties[SCALAR_PROPERTIES.status]).toEqual({
      status: { name: 'andamento' },
    });
  });

  it('maps tipologia to a title-cased select', () => {
    expect(payload.properties[SCALAR_PROPERTIES.tipologia]).toEqual({
      select: { name: 'Licenciamento' },
    });
  });

  it('emits a null select when tipologia is null', () => {
    const p = exportToNotion({ ...FULL_PROCESS, tipologia: null });
    expect(p.properties[SCALAR_PROPERTIES.tipologia]).toEqual({ select: null });
  });

  it('maps license types to a deduped multi_select', () => {
    expect(payload.properties[SCALAR_PROPERTIES.license_types]).toEqual({
      multi_select: [{ name: 'LP' }, { name: 'LI' }, { name: 'Outros' }],
    });
  });

  it('dedupes license labels that fold to the same Notion label', () => {
    const p = exportToNotion({
      ...FULL_PROCESS,
      license_types: ['outros', 'outros', 'LP'],
    });
    expect(p.properties[SCALAR_PROPERTIES.license_types]).toEqual({
      multi_select: [{ name: 'Outros' }, { name: 'LP' }],
    });
  });

  it('maps dates and nulls', () => {
    expect(payload.properties[SCALAR_PROPERTIES.started_at]).toEqual({
      date: { start: '2026-01-15' },
    });
    expect(payload.properties[SCALAR_PROPERTIES.finished_at]).toEqual({
      date: null,
    });
  });

  it('maps Links to a url property', () => {
    expect(payload.properties[SCALAR_PROPERTIES.links]).toEqual({
      url: 'https://example.com/proc',
    });
  });

  it('maps milestone slugs back to their weighted-checkbox labels', () => {
    expect(payload.properties['Aceite do cliente (2%)']).toEqual({
      checkbox: true,
    });
    expect(payload.properties['Análise prévia (10%)']).toEqual({
      checkbox: true,
    });
    expect(payload.properties['Levantamento de campo (20%)']).toEqual({
      checkbox: false,
    });
  });

  it('ignores milestone slugs with no known Notion label', () => {
    const p = exportToNotion({
      ...FULL_PROCESS,
      milestones: { not_a_real_slug: true },
    });
    expect(p.properties['not_a_real_slug']).toBeUndefined();
  });

  it('maps tasks to per-page payloads', () => {
    expect(payload.tasks).toHaveLength(2);
    const [t1, t2] = payload.tasks;

    expect(t1.page_id).toBe('task-001');
    expect(t1.properties[TASK_PROPERTIES.title]).toEqual({
      title: [{ type: 'text', text: { content: 'Coletar documentos' } }],
    });
    expect(t1.properties[TASK_PROPERTIES.status]).toEqual({
      status: { name: 'Em andamento' },
    });
    expect(t1.properties[TASK_PROPERTIES.priority]).toEqual({
      select: { name: 'Alta' },
    });
    expect(t1.properties[TASK_PROPERTIES.due_date]).toEqual({
      date: { start: '2026-02-01' },
    });

    // A task with no notion_page_id still maps, but the orchestrator skips the
    // live write (no target page).
    expect(t2.page_id).toBeNull();
  });

  it('returns a null page_id when the process is not linked to Notion', () => {
    const p = exportToNotion({ ...FULL_PROCESS, notion_page_id: null });
    expect(p.page_id).toBeNull();
  });
});
