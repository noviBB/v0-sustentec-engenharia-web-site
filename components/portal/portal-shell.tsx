"use client"

import { useMemo, useState } from "react"
import { PortalView, ProcessTab } from "@/lib/enums"
import { groupByProcess, totalDue } from "@/modules/payments"
import { useMarkPendenciasSeen } from "@/modules/notifications/hooks/use-mark-pendencias-seen"
import { useMarkProcessPendenciasSeen } from "@/modules/notifications"
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
  /**
   * Open pendências created since the user last opened the notifications bell.
   * Drives the header bell badge (which clears when the bell is opened) — the
   * sidebar / per-process badges still show the TOTAL open count.
   */
  unseenPendencias: number
  /**
   * Per-process count of open pendências the user hasn't seen yet
   * (process_id → unseen count). Drives the sidebar / per-process badges and
   * the header dropdown; cleared per-process as the user views each one.
   */
  unseenByProcess: Record<string, number>
}

// Value-keyed lookups so a raw string narrows to an enum member without an
// assertion AND without an enum-vs-string comparison (which `tsc` allows but
// `no-unsafe-enum-comparison` rejects). `Object.values` of a string enum is
// exactly its set of string values.
const PORTAL_VIEW_BY_VALUE: Partial<Record<string, PortalView>> =
  Object.fromEntries(Object.values(PortalView).map((v) => [v, v]))
const PROCESS_TAB_BY_VALUE: Partial<Record<string, ProcessTab>> =
  Object.fromEntries(Object.values(ProcessTab).map((t) => [t, t]))

/**
 * Narrows a raw nav string (from string-typed child callbacks that haven't
 * adopted the `PortalView` enum yet) to a `PortalView`. Unknown values fall
 * back to the dashboard so a stray string can never wedge the shell.
 */
function toPortalView(item: string): PortalView {
  return PORTAL_VIEW_BY_VALUE[item] ?? PortalView.Painel
}

/** Same idea for the process-detail tab; defaults to the resumo tab. */
function toProcessTab(tab: string): ProcessTab {
  return PROCESS_TAB_BY_VALUE[tab] ?? ProcessTab.Resumo
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
  unseenPendencias: initialUnseenPendencias,
  unseenByProcess: initialUnseenByProcess,
}: PortalShellProps) {
  const [activeItem, setActiveItem] = useState<PortalView>(PortalView.Painel)
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(
    null,
  )
  // Which tab the process detail opens on — "Resolver Pendências" and the
  // notifications dropdown jump straight to the pendências tab.
  const [detailInitialTab, setDetailInitialTab] = useState<ProcessTab>(
    ProcessTab.Resumo,
  )
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [unreadCount, setUnreadCount] = useState<number>(initialUnread)
  // Bell badge: pendências new since the bell was last opened (not the total).
  const [unseenPendencias, setUnseenPendencias] = useState<number>(
    initialUnseenPendencias,
  )
  // Per-process unseen counts; cleared optimistically when a process's
  // pendências tab is opened (separate concern from the global bell above).
  const [unseenByProcess, setUnseenByProcess] = useState<
    Record<string, number>
  >(initialUnseenByProcess)
  const { mutate: markPendenciasSeen } = useMarkPendenciasSeen()
  const { mutate: markProcessPendenciasSeen } = useMarkProcessPendenciasSeen()

  // Total still owed = pending + overdue. Uses the payments module's pure
  // `totalDue` helper so the "due" status set lives in one place (the module,
  // where it can compare against the PaymentStatus enum) rather than being
  // re-spelled as string literals in view code.
  const paymentsTotalDue = useMemo(() => totalDue(payments), [payments])

  const paymentsByProcess = useMemo(
    () => groupByProcess(payments),
    [payments],
  )

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
        .filter((p) => (unseenByProcess[p.id] ?? 0) > 0)
        .sort(
          (a, b) =>
            (unseenByProcess[b.id] ?? 0) - (unseenByProcess[a.id] ?? 0),
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          count: unseenByProcess[p.id] ?? 0,
        })),
    [processes, unseenByProcess],
  )

  function handleProcessSelect(processId: string, tab: string = ProcessTab.Resumo) {
    setSelectedProcessId(processId)
    setDetailInitialTab(toProcessTab(tab))
    setActiveItem(PortalView.ProcessoDetalhe)
  }

  function handleMessageMarkedRead(messageId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: true } : m)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  // Bridges string-typed child callbacks (DashboardContent, PortalHeader) that
  // emit a raw nav string into the `PortalView`-typed view state.
  function navigate(item: string) {
    setActiveItem(toPortalView(item))
  }

  // Clear the badge optimistically and persist the seen stamp.
  function handleNotificationsOpened() {
    setUnseenPendencias(0)
    void markPendenciasSeen()
  }

  // Fired when a process's pendências tab is opened: zero that process's
  // unseen count optimistically and persist its per-process seen stamp.
  function handlePendenciasViewed(processId: string) {
    const previous = unseenByProcess[processId] ?? 0
    if (previous === 0) return
    setUnseenByProcess((prev) => ({ ...prev, [processId]: 0 }))
    void markProcessPendenciasSeen(processId).then((res) => {
      // Persist failed — restore the badge so the "seen" state isn't silently
      // lost (it would otherwise reappear only on the next reload).
      if (!res.ok) {
        setUnseenByProcess((prev) => ({ ...prev, [processId]: previous }))
      }
    })
  }

  function handleMessageMarkReadFailed(messageId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: false } : m)),
    )
    setUnreadCount((prev) => prev + 1)
  }

  function renderContent() {
    if (activeItem === PortalView.ProcessoDetalhe && selectedProcess) {
      return (
        <ProcessDetail
          key={`${selectedProcess.id}:${detailInitialTab}`}
          process={selectedProcess}
          client={client}
          payments={paymentsByProcess.get(selectedProcess.id) ?? []}
          milestones={milestonesByProcess.get(selectedProcess.id) ?? []}
          tasks={tasksByProcess.get(selectedProcess.id) ?? []}
          documents={documentsByProcess.get(selectedProcess.id) ?? []}
          unseenCount={unseenByProcess[selectedProcess.id] ?? 0}
          onPendenciasViewed={handlePendenciasViewed}
          initialTab={detailInitialTab}
          onBack={() => setActiveItem(PortalView.Painel)}
        />
      )
    }

    switch (activeItem) {
      case PortalView.Mensagens:
        return (
          <MessagesView
            messages={messages}
            onMarkedRead={handleMessageMarkedRead}
            onMarkReadFailed={handleMessageMarkReadFailed}
          />
        )
      case PortalView.Agendamentos:
        return <SchedulingView techs={techs} />
      case PortalView.Dados:
        return <DadosCadastraisView client={client} />
      case PortalView.Painel:
      default:
        return (
          <DashboardContent
            displayName={client.name}
            buckets={buckets}
            unreadCount={unreadCount}
            paymentsTotalDue={paymentsTotalDue}
            unseenByProcess={unseenByProcess}
            onSelectProcess={handleProcessSelect}
            onNavigate={navigate}
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
        unseenByProcess={unseenByProcess}
        unreadCount={unreadCount}
      />

      <div className="lg:ml-72">
        <div className="pt-16 lg:pt-0">
          <PortalHeader
            onItemChange={setActiveItem}
            pendencias={pendenciasSummary}
            unseenPendencias={unseenPendencias}
            onNotificationsOpened={handleNotificationsOpened}
            onOpenPendencias={(processId) =>
              handleProcessSelect(processId, ProcessTab.Pendencias)
            }
          />

          <main className="p-4 md:p-6">{renderContent()}</main>
        </div>
      </div>
    </div>
  )
}
