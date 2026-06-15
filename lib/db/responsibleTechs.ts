import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { dbRls, type SessionLike } from './index';
import { responsibleTechs } from './schema';

export type ResponsibleTech = typeof responsibleTechs.$inferSelect;

export type ResponsibleTechOption = Pick<
  ResponsibleTech,
  'id' | 'slug' | 'display_name'
>;

/**
 * Lists active techs. `responsible_techs` is intentionally shared (not
 * tenant-scoped) and has no RLS policy denying authenticated reads — running
 * under `dbRls(session, ...)` here keeps the connection role consistent
 * with the rest of a portal request rather than escalating to service.
 */
export async function listActiveResponsibleTechs(
  session: SessionLike,
): Promise<ResponsibleTechOption[]> {
  return dbRls(session, async (tx) =>
    tx
      .select({
        id: responsibleTechs.id,
        slug: responsibleTechs.slug,
        display_name: responsibleTechs.display_name,
      })
      .from(responsibleTechs)
      .where(eq(responsibleTechs.active, true))
      .orderBy(asc(responsibleTechs.display_name)),
  );
}

/**
 * Display name of one tech, or null when the id is unknown. Used by the
 * appointment-created notification email. Same RLS rationale as above.
 */
export async function getResponsibleTechName(
  session: SessionLike,
  techId: string,
): Promise<string | null> {
  return dbRls(session, async (tx) => {
    const rows = await tx
      .select({ display_name: responsibleTechs.display_name })
      .from(responsibleTechs)
      .where(eq(responsibleTechs.id, techId))
      .limit(1);
    return rows[0]?.display_name ?? null;
  });
}
