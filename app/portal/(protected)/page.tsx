import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClientForUser } from "@/lib/auth/tenant"
import { listProcessesForClient } from "@/lib/db/processes"
import {
  countUnreadForClient,
  listMessagesForClient,
} from "@/lib/db/messages"
import { getClientById } from "@/lib/db/clients"
import { listActiveResponsibleTechs } from "@/lib/db/responsibleTechs"
import { PortalShell } from "@/components/portal/portal-shell"

/**
 * Portal entry — server component. The protected layout has already verified
 * the user/profile/tenant, but RSCs cannot read context, so we re-resolve the
 * tenant here in order to issue the tenant-scoped Drizzle queries this page
 * needs (`listProcessesForClient` etc.). The fetched data + `client` row are
 * passed to `<PortalShell>`, a `"use client"` component that owns the in-page
 * navigation state.
 */
export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/portal/login")
  }

  const tenant = await getClientForUser(user.id)
  if (!tenant) {
    redirect("/portal/login?reason=no_tenant")
  }

  const [client, processes, messages, unreadCount, techs] = await Promise.all([
    getClientById(tenant.id),
    listProcessesForClient(tenant.id),
    listMessagesForClient(tenant.id),
    countUnreadForClient(tenant.id),
    listActiveResponsibleTechs(),
  ])

  if (!client) {
    redirect("/portal/login?reason=no_tenant")
  }

  return (
    <PortalShell
      client={client}
      processes={processes}
      messages={messages}
      unreadCount={unreadCount}
      techs={techs}
    />
  )
}
