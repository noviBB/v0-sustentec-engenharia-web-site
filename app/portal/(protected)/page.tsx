"use client"

import { useState } from "react"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { DashboardContent } from "@/components/portal/dashboard-content"
import { ProcessDetail } from "@/components/portal/process-detail"

// Mock processes data
const clientProcesses = [
  { 
    id: "proc-001", 
    name: "Condominio Residencial Multifamiliar", 
    location: "Nova Friburgo - RJ",
    status: "Em analise",
    pendencias: 2,
    progress: 65,
  },
  { 
    id: "proc-002", 
    name: "Posto de Combustiveis", 
    location: "Petropolis - RJ",
    status: "Aguardando docs",
    pendencias: 3,
    progress: 25,
  },
  { 
    id: "proc-003", 
    name: "Loteamento Residencial", 
    location: "Teresopolis - RJ",
    status: "Concluido",
    pendencias: 0,
    progress: 100,
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
        return (
          <div className="bg-white rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Agendamentos</h2>
            <p className="text-muted-foreground">Gerencie seus agendamentos e reunioes.</p>
          </div>
        )
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
