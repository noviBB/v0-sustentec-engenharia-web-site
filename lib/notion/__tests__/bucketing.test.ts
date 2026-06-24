import { describe, expect, it } from 'vitest';

import { ProcessStatus } from '@/lib/db/enums';

import {
  bucketFromLabel,
  bucketFromStatus,
  statusFromLabel,
} from '../bucketing';

describe('statusFromLabel', () => {
  it('maps known labels (case/whitespace-insensitive)', () => {
    expect(statusFromLabel('Em andamento')).toBe('andamento');
    expect(statusFromLabel('  EM   ANÁLISE ')).toBe('andamento');
    expect(statusFromLabel('Em acompanhamento')).toBe('acompanhamento');
    expect(statusFromLabel('Concluído')).toBe('finalizado');
    expect(statusFromLabel('Cancelado')).toBe('arquivado');
  });
  it('folds conceptual states onto existing enum', () => {
    expect(statusFromLabel('passivo')).toBe('acompanhamento');
    expect(statusFromLabel('cancelada')).toBe('arquivado');
  });
  it('falls back to andamento for unknown/null', () => {
    expect(statusFromLabel('algo novo')).toBe('andamento');
    expect(statusFromLabel(null)).toBe('andamento');
  });
});

describe('bucketFromStatus', () => {
  it('collapses arquivado into finalizado', () => {
    expect(bucketFromStatus(ProcessStatus.Andamento)).toBe('andamento');
    expect(bucketFromStatus(ProcessStatus.Acompanhamento)).toBe(
      'acompanhamento',
    );
    expect(bucketFromStatus(ProcessStatus.Finalizado)).toBe('finalizado');
    expect(bucketFromStatus(ProcessStatus.Arquivado)).toBe('finalizado');
  });
});

describe('bucketFromLabel', () => {
  it('composes label->status->bucket', () => {
    expect(bucketFromLabel('Concluído')).toBe('finalizado');
    expect(bucketFromLabel('Cancelado')).toBe('finalizado');
    expect(bucketFromLabel('Em acompanhamento')).toBe('acompanhamento');
  });
});
