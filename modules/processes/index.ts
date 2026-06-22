/**
 * Public surface of the processes (dashboard / project) feature module.
 *
 * Row TYPES come from the repository; pure derivations come from the service.
 * There is no controller — the dashboard domain is read-only (no process
 * mutations today). Server callers import repo functions from
 * `@/modules/processes/processes.repo` directly (it's `server-only`); this
 * barrel intentionally re-exports only types + the client-safe service.
 */

// Repository row types (no runtime code — `processes.repo.ts` is server-only).
export type {
  ProcessRow,
  ProcessBuckets,
  ProcessSyncItem,
  ProcessExportTask,
  ProcessForExport,
  ProcessNotionLookup,
} from './processes.repo';

// Pure service derivations + their types/contracts.
export {
  BUCKET_ORDER,
  CLOSED_TASK_STATUSES,
  flattenBuckets,
  bucketCounts,
  totalPendencias,
  pendenciasTarget,
  isOpenTask,
  openTasks,
} from './processes.service';
export type { Bucket, BucketCounts } from './processes.service';
