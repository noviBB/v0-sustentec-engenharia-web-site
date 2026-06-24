/**
 * Shared test helper: the services emit their structured failure audit line by
 * `console.error(JSON.stringify({ event, ref, ... }))` — a single string
 * argument. This walks recorded `console.error` mock calls and returns the
 * first argument that parses to an object carrying an `event` field. Tolerates
 * both a JSON-stringified string and a raw object, so it stays robust if a
 * service logs the object directly.
 */
export interface StructuredLog {
  event?: string;
  ref?: string;
  [key: string]: unknown;
}

/** A non-null object that carries an `event` field — the audit-line shape. */
function isStructuredLog(value: unknown): value is StructuredLog {
  return typeof value === 'object' && value !== null && 'event' in value;
}

export function findStructuredLog(
  calls: ReadonlyArray<ReadonlyArray<unknown>>,
): StructuredLog | undefined {
  for (const call of calls) {
    for (const arg of call) {
      if (isStructuredLog(arg)) {
        return arg;
      }
      if (typeof arg === 'string') {
        let parsed: unknown;
        try {
          parsed = JSON.parse(arg);
        } catch {
          // not JSON; keep scanning.
          continue;
        }
        if (isStructuredLog(parsed)) {
          return parsed;
        }
      }
    }
  }
  return undefined;
}
