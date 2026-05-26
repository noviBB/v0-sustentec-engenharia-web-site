import { NotionMappingError, type NotionPropertyValue } from './types';

/**
 * Pure Notion-property parsers.
 *
 * Each function takes a single Notion property value object (the
 * `page.properties[name]` shape) and returns a normalized primitive, or null
 * when the property is absent/empty. They throw `NotionMappingError` only when
 * the property exists but has an unexpected internal shape (a true data bug),
 * which the caller turns into a per-page rollback.
 *
 * No `server-only` import here on purpose: these are unit-tested against
 * hand-written fixtures without a DB.
 */

function richTextArrayToPlain(arr: unknown): string | null {
  if (!Array.isArray(arr)) return null;
  const text = arr
    .map((node) => {
      if (node && typeof node === 'object' && 'plain_text' in node) {
        return String((node as { plain_text: unknown }).plain_text ?? '');
      }
      if (
        node &&
        typeof node === 'object' &&
        'text' in node &&
        node.text &&
        typeof node.text === 'object' &&
        'content' in (node.text as object)
      ) {
        return String((node.text as { content: unknown }).content ?? '');
      }
      return '';
    })
    .join('');
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseTitle(prop: NotionPropertyValue | undefined): string | null {
  if (!prop) return null;
  if (!('title' in prop)) {
    throw new NotionMappingError('title', 'property is not a title');
  }
  return richTextArrayToPlain(prop.title);
}

export function parseRichText(
  prop: NotionPropertyValue | undefined,
): string | null {
  if (!prop) return null;
  if (!('rich_text' in prop)) {
    throw new NotionMappingError('rich_text', 'property is not rich_text');
  }
  return richTextArrayToPlain(prop.rich_text);
}

export function parseDate(prop: NotionPropertyValue | undefined): string | null {
  if (!prop) return null;
  if (!('date' in prop)) {
    throw new NotionMappingError('date', 'property is not a date');
  }
  const date = prop.date;
  if (!date || typeof date !== 'object') return null;
  const start = (date as { start?: unknown }).start;
  if (start == null) return null;
  return String(start);
}

export function parseUrl(prop: NotionPropertyValue | undefined): string | null {
  if (!prop) return null;
  if (!('url' in prop)) {
    throw new NotionMappingError('url', 'property is not a url');
  }
  const url = prop.url;
  if (url == null) return null;
  const s = String(url).trim();
  return s.length > 0 ? s : null;
}

export function parseSelect(
  prop: NotionPropertyValue | undefined,
): string | null {
  if (!prop) return null;
  if (!('select' in prop)) {
    throw new NotionMappingError('select', 'property is not a select');
  }
  const select = prop.select;
  if (!select || typeof select !== 'object') return null;
  const name = (select as { name?: unknown }).name;
  if (name == null) return null;
  const s = String(name).trim();
  return s.length > 0 ? s : null;
}

export function parseStatus(
  prop: NotionPropertyValue | undefined,
): string | null {
  if (!prop) return null;
  // Notion `status` and `select` share the {name} shape. Accept either.
  const container =
    'status' in prop ? prop.status : 'select' in prop ? prop.select : undefined;
  if (container === undefined) {
    throw new NotionMappingError('status', 'property is not a status/select');
  }
  if (!container || typeof container !== 'object') return null;
  const name = (container as { name?: unknown }).name;
  if (name == null) return null;
  const s = String(name).trim();
  return s.length > 0 ? s : null;
}

export function parseMultiSelect(
  prop: NotionPropertyValue | undefined,
): string[] {
  if (!prop) return [];
  if (!('multi_select' in prop)) {
    throw new NotionMappingError(
      'multi_select',
      'property is not a multi_select',
    );
  }
  const arr = prop.multi_select;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((opt) =>
      opt && typeof opt === 'object' && 'name' in opt
        ? String((opt as { name: unknown }).name ?? '').trim()
        : '',
    )
    .filter((s) => s.length > 0);
}

export function parseCheckbox(prop: NotionPropertyValue | undefined): boolean {
  if (!prop) return false;
  if (!('checkbox' in prop)) {
    throw new NotionMappingError('checkbox', 'property is not a checkbox');
  }
  return prop.checkbox === true;
}

export function parseNumber(
  prop: NotionPropertyValue | undefined,
): number | null {
  if (!prop) return null;
  if (!('number' in prop)) {
    throw new NotionMappingError('number', 'property is not a number');
  }
  const n = prop.number;
  if (n == null) return null;
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return n;
}

/** Relation: returns the list of related page ids. */
export function parseRelation(
  prop: NotionPropertyValue | undefined,
): string[] {
  if (!prop) return [];
  if (!('relation' in prop)) {
    throw new NotionMappingError('relation', 'property is not a relation');
  }
  const arr = prop.relation;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((r) =>
      r && typeof r === 'object' && 'id' in r
        ? String((r as { id: unknown }).id ?? '')
        : '',
    )
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

/**
 * Strips Notion markdown emphasis markers (** __ * _ `) commonly seen wrapping
 * the N° PROCESSO value (e.g. `**EIS-PRO-2025/14072**` -> `EIS-PRO-2025/14072`).
 */
export function stripMarkdown(value: string | null): string | null {
  if (value == null) return null;
  const cleaned = value
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/(^|\s)\*(\S)/g, '$1$2')
    .replace(/(\S)\*(\s|$)/g, '$1$2')
    .replace(/(^|\s)_(\S)/g, '$1$2')
    .replace(/(\S)_(\s|$)/g, '$1$2')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Keeps only the digits of a CNPJ string. Returns null when empty. */
export function cnpjDigits(value: string | null): string | null {
  if (value == null) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/** lowercase + trim + collapse internal whitespace. */
export function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Combining diacritical marks block (U+0300–U+036F). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Removes diacritics and lowercases — used for case/accent-insensitive matching. */
export function foldDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
