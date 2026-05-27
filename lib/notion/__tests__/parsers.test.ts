import { describe, expect, it } from 'vitest';

import {
  cnpjDigits,
  foldDiacritics,
  normalizeLabel,
  parseCheckbox,
  parseDate,
  parseMultiSelect,
  parseNumber,
  parseRelation,
  parseRichText,
  parseSelect,
  parseStatus,
  parseTitle,
  parseUrl,
  stripMarkdown,
} from '../parsers';
import { NotionMappingError } from '../types';

describe('parseTitle', () => {
  it('joins title runs and trims', () => {
    expect(
      parseTitle({ title: [{ plain_text: 'Hello ' }, { plain_text: 'World' }] }),
    ).toBe('Hello World');
  });
  it('returns null for empty title', () => {
    expect(parseTitle({ title: [] })).toBeNull();
  });
  it('returns null when prop absent', () => {
    expect(parseTitle(undefined)).toBeNull();
  });
  it('throws on wrong type', () => {
    expect(() => parseTitle({ rich_text: [] })).toThrow(NotionMappingError);
  });
});

describe('parseRichText', () => {
  it('reads plain_text and the {text:{content}} shape', () => {
    expect(parseRichText({ rich_text: [{ plain_text: 'A' }] })).toBe('A');
    expect(
      parseRichText({ rich_text: [{ text: { content: 'B' } }] }),
    ).toBe('B');
  });
  it('null on empty/whitespace', () => {
    expect(parseRichText({ rich_text: [{ plain_text: '   ' }] })).toBeNull();
  });
});

describe('parseDate', () => {
  it('reads start', () => {
    expect(parseDate({ date: { start: '2026-01-01' } })).toBe('2026-01-01');
  });
  it('null when date is null', () => {
    expect(parseDate({ date: null })).toBeNull();
  });
});

describe('parseUrl', () => {
  it('reads url', () => {
    expect(parseUrl({ url: 'https://x.com' })).toBe('https://x.com');
  });
  it('null on empty url', () => {
    expect(parseUrl({ url: null })).toBeNull();
  });
});

describe('parseSelect / parseStatus', () => {
  it('reads select name', () => {
    expect(parseSelect({ select: { name: 'Alta' } })).toBe('Alta');
  });
  it('parseStatus reads status name OR select name', () => {
    expect(parseStatus({ status: { name: 'Em análise' } })).toBe('Em análise');
    expect(parseStatus({ select: { name: 'X' } })).toBe('X');
  });
  it('null when select empty', () => {
    expect(parseSelect({ select: null })).toBeNull();
  });
});

describe('parseMultiSelect', () => {
  it('returns names, drops empties', () => {
    expect(
      parseMultiSelect({ multi_select: [{ name: 'LP' }, { name: '' }, { name: 'LI' }] }),
    ).toEqual(['LP', 'LI']);
  });
  it('empty array when absent', () => {
    expect(parseMultiSelect(undefined)).toEqual([]);
  });
});

describe('parseCheckbox / parseNumber / parseRelation', () => {
  it('checkbox', () => {
    expect(parseCheckbox({ checkbox: true })).toBe(true);
    expect(parseCheckbox({ checkbox: false })).toBe(false);
    expect(parseCheckbox(undefined)).toBe(false);
  });
  it('number', () => {
    expect(parseNumber({ number: 3 })).toBe(3);
    expect(parseNumber({ number: null })).toBeNull();
  });
  it('relation ids', () => {
    expect(
      parseRelation({ relation: [{ id: 'a' }, { id: 'b' }] }),
    ).toEqual(['a', 'b']);
  });
});

describe('transformers', () => {
  it('stripMarkdown removes ** markers', () => {
    expect(stripMarkdown('**EIS-PRO-2025/14072**')).toBe('EIS-PRO-2025/14072');
    expect(stripMarkdown('`code`')).toBe('code');
    expect(stripMarkdown('plain')).toBe('plain');
    expect(stripMarkdown(null)).toBeNull();
  });
  it('cnpjDigits keeps only digits', () => {
    expect(cnpjDigits('03.314.057/0001-53')).toBe('03314057000153');
    expect(cnpjDigits('')).toBeNull();
    expect(cnpjDigits(null)).toBeNull();
  });
  it('normalizeLabel lowercases/collapses', () => {
    expect(normalizeLabel('  Em   Análise ')).toBe('em análise');
  });
  it('foldDiacritics strips accents', () => {
    expect(foldDiacritics('Maíra')).toBe('maira');
    expect(foldDiacritics('Guilherme')).toBe('guilherme');
    expect(foldDiacritics('CONCLUÍDO')).toBe('concluido');
  });
});
