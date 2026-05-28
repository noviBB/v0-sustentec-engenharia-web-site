import { redirect } from "next/navigation"
import { sessionForUser } from "@/lib/auth/tenant"
import { createClient } from "@/lib/supabase/server"
import { getClientForUser } from "@/lib/db/tenants"
import { listBuckets } from "@/lib/db/processes"
import {
  countUnreadForClient,
  listMessagesForClient,
} from "@/lib/db/messages"
import { listPaymentsByClient } from "@/lib/db/payments"
import { listActiveResponsibleTechs } from "@/lib/db/responsibleTechs"
import { PortalShell } from "@/components/portal/portal-shell"

/**
 * Portal entry — server component. The protected layout has already verified
 * the user/profile/tenant, but RSCs cannot read context, so we re-resolve the
 * tenant here in order to issue the tenant-scoped Drizzle queries this page
 * needs. `getClientForUser` already returns the full `clients` row, so we
 * use it directly and skip a redundant `getClientById` round-trip.
 *
 * All reads run under the user's RLS session — `sessionForUser` produces
 * the JWT-claims object every repository helper threads to `dbRls`.
 */
export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/portal/login")
  }

  const session = sessionForUser(user)

  const client = await getClientForUser(session, user.id)
  if (!client) {
    redirect("/portal/login?reason=no_tenant")
  }

  const [buckets, messages, unreadCount, techs, payments] = await Promise.all([
    listBuckets(session, client.id),
    listMessagesForClient(session, client.id),
    countUnreadForClient(session, client.id),
    listActiveResponsibleTechs(session),
    listPaymentsByClient(session, client.id),
  ])

  return (
    <PortalShell
      client={client}
      buckets={buckets}
      messages={messages}
      unreadCount={unreadCount}
      techs={techs}
      payments={payments}
    />
  )
}
