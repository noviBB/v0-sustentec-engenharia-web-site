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

export function findStructuredLog(
  calls: ReadonlyArray<ReadonlyArray<unknown>>,
): StructuredLog | undefined {
  for (const call of calls) {
    for (const arg of call) {
      if (arg && typeof arg === 'object' && 'event' in (arg as object)) {
        return arg as StructuredLog;
      }
      if (typeof arg === 'string') {
        try {
          const parsed = JSON.parse(arg) as unknown;
          if (parsed && typeof parsed === 'object' && 'event' in parsed) {
            return parsed as StructuredLog;
          }
        } catch {
          // not JSON; keep scanning.
        }
      }
    }
  }
  return undefined;
}
