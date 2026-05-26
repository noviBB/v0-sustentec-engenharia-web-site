import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClientForUser } from "@/lib/auth/tenant"
import { listBuckets } from "@/lib/db/processes"
import {
  countUnreadForClient,
  listMessagesForClient,
} from "@/lib/db/messages"
import { listActiveResponsibleTechs } from "@/lib/db/responsibleTechs"
import { PortalShell } from "@/components/portal/portal-shell"

/**
 * Portal entry — server component. The protected layout has already verified
 * the user/profile/tenant, but RSCs cannot read context, so we re-resolve the
 * tenant here in order to issue the tenant-scoped Drizzle queries this page
 * needs. `getClientForUser` already returns the full `clients` row, so we
 * use it directly and skip a redundant `getClientById` round-trip.
 */
export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/portal/login")
  }

  const client = await getClientForUser(user.id)
  if (!client) {
    redirect("/portal/login?reason=no_tenant")
  }

  const [buckets, messages, unreadCount, techs] = await Promise.all([
    listBuckets(client.id),
    listMessagesForClient(client.id),
    countUnreadForClient(client.id),
    listActiveResponsibleTechs(),
  ])

  return (
    <PortalShell
      client={client}
      buckets={buckets}
      messages={messages}
      unreadCount={unreadCount}
      techs={techs}
    />
  )
}
