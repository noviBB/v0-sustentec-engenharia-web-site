"use client"

import { useState } from "react"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { DashboardContent } from "@/components/portal/dashboard-content"
import { ProcessDetail } from "@/components/portal/process-detail"
import { SchedulingView } from "@/components/portal/scheduling-view"

// Mock processes data
const clientProcesses = [
  {
    id: "proc-001",
    code: "CC 26-004",
    name: "Enge Prat - UNOPS Planos",
    location: "",
    status: "Em analise",
    pendencias: 2,
    progress: 65,
    paymentsMade: 2,
    paymentsTotal: 3,
    paidAmount: "R$ 4.500,00",
  },
  {
    id: "proc-002",
    code: "CC 26-016",
    name: "Licenças Enge Prat - Niterói",
    location: "Niterói - RJ",
    status: "Aguardando docs",
    pendencias: 3,
    progress: 25,
    paymentsMade: 1,
    paymentsTotal: 4,
    paidAmount: "R$ 2.200,00",
  },
  {
    id: "proc-003",
    code: "CC 26-017",
    name: "Laudo de Avaliação Cautelar de Vizinhança - Enge Prat",
    location: "",
    status: "Concluido",
    pendencias: 0,
    progress: 100,
    paymentsMade: 2,
    paymentsTotal: 2,
    paidAmount: "R$ 3.800,00",
  },
]

export default function PortalPage() {
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
        return (
          <div className="bg-white rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Mensagens</h2>
            <p className="text-muted-foreground">Central de mensagens do portal.</p>
          </div>
        )
      case "agendamentos":
        return <SchedulingView />

      case "dados":
        return (
          <div className="bg-white rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Dados Cadastrais</h2>
            <p className="text-muted-foreground">Atualize suas informacoes pessoais e de contato.</p>
          </div>
        )
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
          <PortalHeader />
          
          <main className="p-4 md:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  )
}
