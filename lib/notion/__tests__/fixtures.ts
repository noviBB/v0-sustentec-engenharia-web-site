import type { NotionPage } from '../types';

/**
 * Hand-written Notion-page JSON fixtures. These mirror the denormalized
 * property layout the live Engeprat database produces, so parser / bucketing /
 * property-map behavior can be verified without a live integration token.
 */

export const ENGEPRAT_PROCESS_PAGE: NotionPage = {
  id: 'page-engeprat-001',
  last_edited_time: '2026-05-20T12:00:00.000Z',
  properties: {
    Projeto: {
      type: 'title',
      title: [{ plain_text: 'Enge Prat - UNOPS Planos' }],
    },
    CC: {
      type: 'rich_text',
      rich_text: [{ plain_text: 'CC 26-004' }],
    },
    'N° PROCESSO': {
      type: 'rich_text',
      rich_text: [{ plain_text: '**EIS-PRO-2025/14072**' }],
    },
    Objetivo: {
      type: 'rich_text',
      rich_text: [{ plain_text: 'Licenciamento ambiental do empreendimento' }],
    },
    'Observação': {
      type: 'rich_text',
      rich_text: [{ plain_text: '  Aguardando parecer técnico  ' }],
    },
    Links: { type: 'url', url: 'https://example.com/proc' },
    'Município': {
      type: 'rich_text',
      rich_text: [{ plain_text: 'Niterói - RJ' }],
    },
    'Órgão Ambiental': {
      type: 'rich_text',
      rich_text: [{ plain_text: 'INEA' }],
    },
    'CNPJ CLIENTE': {
      type: 'rich_text',
      rich_text: [{ plain_text: '03.314.057/0001-53' }],
    },
    'CNPJ REQUERENTE': {
      type: 'rich_text',
      rich_text: [{ plain_text: '' }],
    },
    'Situação': {
      type: 'status',
      status: { name: 'Em análise' },
    },
    TIPOLOGIA: {
      type: 'select',
      select: { name: 'Licenciamento' },
    },
    INSTRUMENTO: {
      type: 'multi_select',
      multi_select: [{ name: 'LP' }, { name: 'LI' }, { name: 'ASV' }],
    },
    'Responsável': {
      type: 'select',
      select: { name: 'Maíra' },
    },
    'Início': { type: 'date', date: { start: '2026-01-15' } },
    Prazo: { type: 'date', date: { start: '2026-06-30' } },
    Entrega: { type: 'date', date: null },
    TAREFAS: {
      type: 'relation',
      relation: [{ id: 'task-001' }, { id: 'task-002' }],
    },
    // Weighted-checkbox milestones (a subset present on the page).
    'Aceite do cliente (2%)': { type: 'checkbox', checkbox: true },
    'Análise prévia (10%)': { type: 'checkbox', checkbox: true },
    'Levantamento de campo (20%)': { type: 'checkbox', checkbox: false },
    'Entrega (2%)': { type: 'checkbox', checkbox: false },
  },
};

export const TASK_PAGE_1: NotionPage = {
  id: 'task-001',
  last_edited_time: '2026-05-19T09:00:00.000Z',
  properties: {
    Tarefa: { type: 'title', title: [{ plain_text: 'Coletar documentos' }] },
    Resumo: {
      type: 'rich_text',
      rich_text: [{ plain_text: 'Reunir CNPJ e matrícula do imóvel' }],
    },
    Status: { type: 'status', status: { name: 'Em andamento' } },
    Prioridade: { type: 'select', select: { name: 'Alta' } },
    Prazo: { type: 'date', date: { start: '2026-02-01' } },
  },
};

export const TASK_PAGE_2: NotionPage = {
  id: 'task-002',
  last_edited_time: '2026-05-19T09:30:00.000Z',
  properties: {
    Tarefa: { type: 'title', title: [{ plain_text: 'Protocolar processo' }] },
    Status: { type: 'status', status: { name: 'A Fazer' } },
    Prioridade: { type: 'select', select: { name: 'Média' } },
  },
};

/** A page with an invalid tipologia and an unmapped responsible (soft errors). */
export const PROCESS_WITH_SOFT_ERRORS: NotionPage = {
  id: 'page-soft-errors',
  last_edited_time: '2026-05-21T00:00:00.000Z',
  properties: {
    Projeto: { type: 'title', title: [{ plain_text: 'Projeto X' }] },
    TIPOLOGIA: { type: 'select', select: { name: 'Inexistente' } },
    INSTRUMENTO: {
      type: 'multi_select',
      multi_select: [{ name: 'QUALQUER' }],
    },
    'Responsável': { type: 'select', select: { name: 'Fulano Desconhecido' } },
    'Situação': { type: 'status', status: { name: 'Concluído' } },
  },
};

/** A page whose CC property is structurally wrong (number instead of text). */
export const PROCESS_WITH_TYPE_ERROR: NotionPage = {
  id: 'page-type-error',
  last_edited_time: '2026-05-22T00:00:00.000Z',
  properties: {
    Projeto: { type: 'title', title: [{ plain_text: 'Projeto Y' }] },
    CC: { type: 'number', number: 42 },
  },
};
