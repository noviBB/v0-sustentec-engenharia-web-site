"use client"

import { useMemo, useState } from "react"
import type { Client } from "@/lib/db/clients"
import type { ProcessBuckets, ProcessRow } from "@/lib/db/processes"
import type { MessageRow } from "@/lib/db/messages"
import type { PaymentWithProcess } from "@/lib/db/payments"
import type { ResponsibleTechOption } from "@/lib/db/responsibleTechs"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { DashboardContent } from "@/components/portal/dashboard-content"
import { ProcessDetail } from "@/components/portal/process-detail"
import { SchedulingView } from "@/components/portal/scheduling-view"
import { DadosCadastraisView } from "@/components/portal/dados-cadastrais-view"
import { MessagesView } from "@/components/portal/messages-view"

interface PortalShellProps {
  client: Client
  buckets: ProcessBuckets
  messages: MessageRow[]
  unreadCount: number
  techs: ResponsibleTechOption[]
  /** All payments for the tenant, prefetched on the server. */
  payments: PaymentWithProcess[]
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
}: PortalShellProps) {
  const [activeItem, setActiveItem] = useState("painel")
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(
    null,
  )
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

  function handleProcessSelect(processId: string) {
    setSelectedProcessId(processId)
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
          process={selectedProcess}
          payments={paymentsByProcess.get(selectedProcess.id) ?? []}
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
        onProcessChange={setSelectedProcessId}
        processes={processes}
        unreadCount={unreadCount}
      />

      <div className="lg:ml-72">
        <div className="pt-16 lg:pt-0">
          <PortalHeader onItemChange={setActiveItem} />

          <main className="p-4 md:p-6">{renderContent()}</main>
        </div>
      </div>
    </div>
  )
}
