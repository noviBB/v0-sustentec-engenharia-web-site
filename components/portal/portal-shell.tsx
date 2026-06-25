"use client"

import { useMemo, useState } from "react"
import type { Client } from "@/modules/clients/clients.repo"
import type { ProcessBuckets, ProcessRow } from "@/modules/processes/processes.repo"
import type { MessageRow } from "@/modules/messages/messages.repo"
import type { PaymentWithProcess } from "@/modules/payments/payments.repo"
import type { ResponsibleTechOption } from "@/modules/appointments/responsible-techs.repo"
import type { MilestoneRow } from "@/modules/milestones/milestones.repo"
import type { TaskRow } from "@/modules/tasks/tasks.repo"
import type { DocumentRow } from "@/modules/documents/documents.repo"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { DashboardContent } from "@/modules/processes/components/dashboard-content"
import { ProcessDetail } from "@/modules/processes/components/process-detail"
import { SchedulingView } from "@/modules/appointments/components/scheduling-view"
import { DadosCadastraisView } from "@/modules/clients/components/dados-cadastrais-view"
import { MessagesView } from "@/modules/messages/components/messages-view"

interface PortalShellProps {
  client: Client
  buckets: ProcessBuckets
  messages: MessageRow[]
  unreadCount: number
  techs: ResponsibleTechOption[]
  /** All payments for the tenant, prefetched on the server. */
  payments: PaymentWithProcess[]
  /** All milestones for the tenant's processes, prefetched on the server. */
  milestones: MilestoneRow[]
  /** All tasks (pendências) for the tenant's processes, prefetched. */
  tasks: TaskRow[]
  /** All downloadable documents for the tenant's processes, prefetched. */
  documents: DocumentRow[]
}

/**
 * Client-side shell for the portal — owns the in-page navigation state
 * (which "view" is active, which process is open). Data comes pre-fetched
 * from the parent RSC so this component does no querying itself.
 */
export function PortalShell({
  client,
  buckets,
  messages: initialMessages,
  unreadCount: initialUnread,
  techs,
  payments,
  milestones,
  tasks,
  documents,
}: PortalShellProps) {
  const [activeItem, setActiveItem] = useState("painel")
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(
    null,
  )
  // Which tab the process detail opens on — "Resolver Pendências" and the
  // notifications dropdown jump straight to the pendências tab.
  const [detailInitialTab, setDetailInitialTab] = useState<string>("resumo")
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [unreadCount, setUnreadCount] = useState<number>(initialUnread)

  // Total still owed = pending + overdue. Recomputed locally so future
  // "mark paid" actions could update it without a server roundtrip.
  const paymentsTotalDue = useMemo(
    () =>
      payments
        .filter((p) => p.status === "pending" || p.status === "overdue")
        .reduce((acc, p) => acc + Number(p.amount ?? 0), 0),
    [payments],
  )

  const paymentsByProcess = useMemo(() => {
    const map = new Map<string, PaymentWithProcess[]>()
    for (const p of payments) {
      const list = map.get(p.process_id) ?? []
      list.push(p)
      map.set(p.process_id, list)
    }
    return map
  }, [payments])

  const milestonesByProcess = useMemo(() => {
    const map = new Map<string, MilestoneRow[]>()
    for (const m of milestones) {
      const list = map.get(m.process_id) ?? []
      list.push(m)
      map.set(m.process_id, list)
    }
    return map
  }, [milestones])

  const tasksByProcess = useMemo(() => {
    const map = new Map<string, TaskRow[]>()
    for (const task of tasks) {
      const list = map.get(task.process_id) ?? []
      list.push(task)
      map.set(task.process_id, list)
    }
    return map
  }, [tasks])

  const documentsByProcess = useMemo(() => {
    const map = new Map<string, DocumentRow[]>()
    for (const doc of documents) {
      const list = map.get(doc.process_id) ?? []
      list.push(doc)
      map.set(doc.process_id, list)
    }
    return map
  }, [documents])

  // Flattened view of all bucketed processes — the sidebar + selection
  // lookups still need a single list.
  const processes: ProcessRow[] = useMemo(
    () => [
      ...buckets.andamento,
      ...buckets.acompanhamento,
      ...buckets.finalizado,
    ],
    [buckets],
  )

  const selectedProcess = useMemo(
    () =>
      selectedProcessId
        ? processes.find((p) => p.id === selectedProcessId) ?? null
        : null,
    [processes, selectedProcessId],
  )

  // Pendências summary for the header notifications dropdown — one entry per
  // process that has open items, ordered by count so the worst offender leads.
  const pendenciasSummary = useMemo(
    () =>
      processes
        .filter((p) => p.pendencias_count > 0)
        .sort((a, b) => b.pendencias_count - a.pendencias_count)
        .map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          count: p.pendencias_count,
        })),
    [processes],
  )

  function handleProcessSelect(processId: string, tab: string = "resumo") {
    setSelectedProcessId(processId)
    setDetailInitialTab(tab)
    setActiveItem("processo-detalhe")
  }

  function handleMessageMarkedRead(messageId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: true } : m)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  function handleMessageMarkReadFailed(messageId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: false } : m)),
    )
    setUnreadCount((prev) => prev + 1)
  }

  function renderContent() {
    if (activeItem === "processo-detalhe" && selectedProcess) {
      return (
        <ProcessDetail
          key={`${selectedProcess.id}:${detailInitialTab}`}
          process={selectedProcess}
          client={client}
          payments={paymentsByProcess.get(selectedProcess.id) ?? []}
          milestones={milestonesByProcess.get(selectedProcess.id) ?? []}
          tasks={tasksByProcess.get(selectedProcess.id) ?? []}
          documents={documentsByProcess.get(selectedProcess.id) ?? []}
          initialTab={detailInitialTab}
          onBack={() => setActiveItem("painel")}
        />
      )
    }

    switch (activeItem) {
      case "painel":
        return (
          <DashboardContent
            displayName={client.name}
            buckets={buckets}
            unreadCount={unreadCount}
            paymentsTotalDue={paymentsTotalDue}
            onSelectProcess={handleProcessSelect}
            onNavigate={setActiveItem}
          />
        )
      case "mensagens":
        return (
          <MessagesView
            messages={messages}
            onMarkedRead={handleMessageMarkedRead}
            onMarkReadFailed={handleMessageMarkReadFailed}
          />
        )
      case "agendamentos":
        return <SchedulingView techs={techs} />
      case "dados":
        return <DadosCadastraisView client={client} />
      default:
        return (
          <DashboardContent
            displayName={client.name}
            buckets={buckets}
            unreadCount={unreadCount}
            paymentsTotalDue={paymentsTotalDue}
            onSelectProcess={handleProcessSelect}
            onNavigate={setActiveItem}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <PortalSidebar
        activeItem={activeItem}
        onItemChange={setActiveItem}
        selectedProcess={selectedProcessId}
        // Through handleProcessSelect so the detail tab resets to "resumo" —
        // a direct setSelectedProcessId would keep a stale "pendencias" tab
        // from an earlier Resolver Pendências / notifications jump.
        onProcessChange={(processId) => handleProcessSelect(processId)}
        processes={processes}
        unreadCount={unreadCount}
      />

      <div className="lg:ml-72">
        <div className="pt-16 lg:pt-0">
          <PortalHeader
            onItemChange={setActiveItem}
            pendencias={pendenciasSummary}
            onOpenPendencias={(processId) =>
              handleProcessSelect(processId, "pendencias")
            }
          />

          <main className="p-4 md:p-6">{renderContent()}</main>
        </div>
      </div>
    </div>
  )
}
