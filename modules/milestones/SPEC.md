# Module: milestones

Client-portal read access to a tenant's process milestones. Renders the
**Evolução** (timeline) tab inside `process-detail`.

## Barrel (`modules/milestones/index.ts`)

| Export | Kind | Signature |
| --- | --- | --- |
| `MilestoneRow` | type | `{ process_id: string; slug: string; label_pt: string; ordinal: number; checked: boolean; checked_at: Date \| null }` |
| `listMilestonesForClient` | function | `(session: SessionLike, clientId: string) => Promise<MilestoneRow[]>` |

Old path `@/lib/db/milestones` is a shim (`export * from '@/modules/milestones/milestones.repo'`); existing importers (portal page, `portal-shell`, `process-detail`) keep working unchanged.

## Repository (`milestones.repo.ts`)

`import 'server-only'`. Only importer of `@/lib/db` core (`dbRls`, `SessionLike`) and `@/lib/db/schema` in this module.

### `listMilestonesForClient(session, clientId) -> Promise<MilestoneRow[]>`
- **Mode:** RLS (`dbRls(session, ...)`).
- Selects from `process_milestones`:
  - INNER JOIN `process_milestone_kinds` ON `kinds.id = milestones.kind_id` (supplies `slug`, `label_pt`, `ordinal` — label + ordinal for the timeline without a second query).
  - INNER JOIN `processes` ON `processes.id = milestones.process_id` (supplies tenancy; milestones carry no `client_id`).
- **Filter:** `processes.client_id = clientId`.
- **Order:** `process_id ASC`, then `kinds.ordinal ASC` (one tenant-wide query of ≤ ~14 rows/process, grouped per-process client-side).
- Returns `[]` when none match.

## RLS invariants
- Tenant-scoped via `dbRls`; the explicit `processes.client_id = clientId` predicate is a seatbelt for users linked to multiple tenants.
- Read-only surface — no inserts/updates here. (Milestone kinds have a client-readable RLS read policy; see migration history.)

## Test outline
- **RLS isolation:** session for tenant A must not see tenant B milestones.
- **Kind join:** every returned row carries `slug`/`label_pt`/`ordinal` from its kind.
- **Order:** grouped by `process_id`, ascending `ordinal` within each process.
- **Checked state:** `checked` / `checked_at` pass through unmodified (`checked_at` is `null` when unchecked).
- **Empty:** unknown/empty client returns `[]`.
