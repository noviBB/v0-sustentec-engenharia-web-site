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
