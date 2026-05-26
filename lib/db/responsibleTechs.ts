import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from './index';
import { responsibleTechs } from './schema';

export type ResponsibleTech = typeof responsibleTechs.$inferSelect;

export type ResponsibleTechOption = Pick<
  ResponsibleTech,
  'id' | 'slug' | 'display_name'
>;

export async function listActiveResponsibleTechs(): Promise<
  ResponsibleTechOption[]
> {
  return db
    .select({
      id: responsibleTechs.id,
      slug: responsibleTechs.slug,
      display_name: responsibleTechs.display_name,
    })
    .from(responsibleTechs)
    .where(eq(responsibleTechs.active, true))
    .orderBy(asc(responsibleTechs.display_name));
}
