import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { dbRls, type SessionLike } from '@/lib/db';
import { processes, processMilestoneKinds, processMilestones } from '@/lib/db/schema';

/**
 * One milestone of one process, joined to its kind so the portal can render
 * the "Evolução" timeline (label + ordinal) without a second query.
 */
export type MilestoneRow = {
  process_id: string;
  slug: string;
  label_pt: string;
  ordinal: number;
  checked: boolean;
  checked_at: Date | null;
};

/**
 * All milestones for a tenant's processes, ordered by process then ordinal.
 * One tenant-wide query (≤ 14 rows per process), grouped client-side — same
 * prefetch pattern as `listPaymentsByClient`.
 *
 * RLS-scoped via `dbRls(session, ...)`; the explicit `client_id` filter stays
 * as a seatbelt for users linked to multiple tenants.
 */
export async function listMilestonesForClient(
  session: SessionLike,
  clientId: string,
): Promise<MilestoneRow[]> {
  return dbRls(session, async (tx) =>
    tx
      .select({
        process_id: processMilestones.process_id,
        slug: processMilestoneKinds.slug,
        label_pt: processMilestoneKinds.label_pt,
        ordinal: processMilestoneKinds.ordinal,
        checked: processMilestones.checked,
        checked_at: processMilestones.checked_at,
      })
      .from(processMilestones)
      .innerJoin(
        processMilestoneKinds,
        eq(processMilestoneKinds.id, processMilestones.kind_id),
      )
      .innerJoin(processes, eq(processes.id, processMilestones.process_id))
      .where(eq(processes.client_id, clientId))
      .orderBy(
        asc(processMilestones.process_id),
        asc(processMilestoneKinds.ordinal),
      ),
  );
}
