import 'server-only';

/**
 * Public surface of the Notion adapter.
 *
 * The portal and any other consumer must import ONLY from here. The ESLint
 * `no-restricted-imports` boundary (eslint.config.mjs) forbids reaching into
 * the internal modules (client / property-map / parsers / repository /
 * bucketing / types / export) or `@notionhq/client` from outside lib/notion/**.
 *
 * Exposed:
 *   - syncClient, syncOne, listForClient, handleWebhook  (adapter.ts, import)
 *   - exportClient                                       (adapter.ts, export)
 *   - exportToNotion                                     (export.ts, reverse map)
 */
export {
  syncClient,
  syncOne,
  listForClient,
  exportClient,
  handleWebhook,
} from './adapter';
export { exportToNotion } from './export';

// Public types/errors that consumers legitimately need at the boundary.
export {
  NotImplementedError,
  NotionMappingError,
  NotionTokenMissingError,
} from './types';
export type {
  SyncResult,
  NotionPropertyPayload,
  NotionTaskPayload,
  ProcessWithRelations,
  ExportTask,
} from './types';
export type { ProcessListItem, ExportResult, WebhookOutcome } from './adapter';
