# Module: documents

Client-portal read access to a tenant's process documents. Renders the
**Documentos** tab inside `process-detail`.

## Barrel (`modules/documents/index.ts`)

| Export | Kind | Signature |
| --- | --- | --- |
| `DocumentRow` | type | `{ id: string; process_id: string; name: string; url: string; created_at: Date }` |
| `listDocumentsForClient` | function | `(session: SessionLike, clientId: string) => Promise<DocumentRow[]>` |

Old path `@/lib/db/documents` is a shim (`export * from '@/modules/documents/documents.repo'`); existing importers (portal page, `portal-shell`, `process-detail`) keep working unchanged.

## Repository (`documents.repo.ts`)

`import 'server-only'`. Only importer of `@/lib/db` core (`dbRls`, `SessionLike`) and `@/lib/db/schema` in this module.

### `listDocumentsForClient(session, clientId) -> Promise<DocumentRow[]>`
- **Mode:** RLS (`dbRls(session, ...)`).
- Selects from `process_documents` INNER JOIN `processes` ON `processes.id = process_documents.process_id` (documents carry no `client_id`; the join supplies tenancy).
- **Filters:** `processes.client_id = clientId` AND `process_documents.deleted_at IS NULL`.
- **Order:** `process_documents.created_at DESC`.
- Returns `[]` when none match.

## RLS invariants
- Tenant-scoped via `dbRls`; the explicit `processes.client_id = clientId` predicate is a defense-in-depth seatbelt (notably for users linked to multiple tenants).
- Read-only surface. Writes are staff/seed-only (staff-only write policy, migration 0006) — the repo never inserts/updates/deletes.
- Soft-deleted rows (`deleted_at` set) are never returned.

## Test outline
- **RLS isolation:** a session scoped to tenant A must not receive tenant B's documents even if `clientId` is B's id (RLS denies; the predicate is belt-and-suspenders).
- **Soft delete:** rows with `deleted_at` set are excluded.
- **Order:** newest `created_at` first.
- **Empty:** unknown/empty client returns `[]`.
