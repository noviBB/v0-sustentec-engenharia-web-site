import { redirect } from "next/navigation"
import { sessionForUser } from "@/lib/auth/tenant"
import { authPort } from "@/lib/auth/port"
import { getClientForUser } from "@/lib/auth/tenant"
import { listBuckets } from "@/modules/processes/processes.repo"
import {
  countUnreadForClient,
  listMessagesForClient,
} from "@/modules/messages/messages.repo"
import { listPaymentsByClient } from "@/modules/payments/payments.repo"
import { listActiveResponsibleTechs } from "@/modules/appointments/responsible-techs.repo"
import { listMilestonesForClient } from "@/modules/milestones/milestones.repo"
import { listTasksForClient } from "@/modules/tasks/tasks.repo"
import { listDocumentsForClient } from "@/modules/documents/documents.repo"
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
  const user = await authPort.getCurrentUser()
  if (!user) {
    redirect("/portal/login")
  }

  const session = sessionForUser(user)

  const client = await getClientForUser(session, user.id)
  if (!client) {
    redirect("/portal/login?reason=no_tenant")
  }

  const [
    buckets,
    messages,
    unreadCount,
    techs,
    payments,
    milestones,
    tasks,
    documents,
  ] = await Promise.all([
    listBuckets(session, client.id),
    listMessagesForClient(session, client.id),
    countUnreadForClient(session, client.id),
    listActiveResponsibleTechs(session),
    listPaymentsByClient(session, client.id),
    listMilestonesForClient(session, client.id),
    listTasksForClient(session, client.id),
    listDocumentsForClient(session, client.id),
  ])

  return (
    <PortalShell
      client={client}
      buckets={buckets}
      messages={messages}
      unreadCount={unreadCount}
      techs={techs}
      payments={payments}
      milestones={milestones}
      tasks={tasks}
      documents={documents}
    />
  )
}
