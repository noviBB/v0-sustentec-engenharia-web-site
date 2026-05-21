"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getProcessesForEmail } from "@/lib/portal-data"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { DashboardContent } from "@/components/portal/dashboard-content"
import { ProcessDetail } from "@/components/portal/process-detail"
import { SchedulingView } from "@/components/portal/scheduling-view"
import { DadosCadastraisView } from "@/components/portal/dados-cadastrais-view"
import { MessagesView } from "@/components/portal/messages-view"

export default function PortalPage() {
  const { user } = useAuth()
  const clientProcesses = getProcessesForEmail(user?.email)

  const [activeItem, setActiveItem] = useState("painel")
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null)

  const handleProcessSelect = (processId: string) => {
    setSelectedProcess(processId)
    setActiveItem("processo-detalhe")
  }

  const renderContent = () => {
    if (activeItem === "processo-detalhe" && selectedProcess) {
      return <ProcessDetail processId={selectedProcess} />
    }

    switch (activeItem) {
      case "painel":
        return (
          <DashboardContent
            processes={clientProcesses}
            onSelectProcess={handleProcessSelect}
          />
        )
      case "mensagens":
        return <MessagesView />
      case "agendamentos":
        return <SchedulingView />
      case "dados":
        return <DadosCadastraisView />
      default:
        return (
          <DashboardContent
            processes={clientProcesses}
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
        selectedProcess={selectedProcess}
        onProcessChange={setSelectedProcess}
        processes={clientProcesses}
      />

      <div className="lg:ml-72">
        <div className="pt-16 lg:pt-0">
          <PortalHeader onItemChange={setActiveItem} />

          <main className="p-4 md:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  )
}
