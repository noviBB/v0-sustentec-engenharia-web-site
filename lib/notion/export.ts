import 'server-only';

import {
  NotImplementedError,
  type NotionPropertyPayload,
  type ProcessWithRelations,
} from './types';

/**
 * Reverse direction: build a Notion property payload from a canonical process.
 *
 * Two-way sync (write-back to Notion) is out of scope for #9 — this is a typed
 * stub so the public signature is stable for #11+. It throws
 * NotImplementedError when called.
 */
export function exportToNotion(
  _process: ProcessWithRelations,
): NotionPropertyPayload {
  throw new NotImplementedError('exportToNotion (write-back to Notion, #11+)');
}
