"use client"

import { useState } from "react"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { DashboardContent } from "@/components/portal/dashboard-content"

export default function PortalPage() {
  const [activeItem, setActiveItem] = useState("painel")

  return (
    <div className="min-h-screen bg-background">
      <PortalSidebar activeItem={activeItem} onItemChange={setActiveItem} />
      
      <div className="lg:ml-72">
        <div className="pt-16 lg:pt-0">
          <PortalHeader />
          
          <main className="p-6">
            {activeItem === "painel" && <DashboardContent />}
            {activeItem === "processo" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Meu Processo</h2>
                <p className="text-muted-foreground">Detalhes do seu processo de licenciamento</p>
              </div>
            )}
            {activeItem === "documentos" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Documentos</h2>
                <p className="text-muted-foreground">Gerencie seus documentos</p>
              </div>
            )}
            {activeItem === "historico" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Historico</h2>
                <p className="text-muted-foreground">Historico completo do processo</p>
              </div>
            )}
            {activeItem === "pendencias" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Pendencias</h2>
                <p className="text-muted-foreground">Acoes pendentes do cliente</p>
              </div>
            )}
            {activeItem === "mensagens" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Mensagens</h2>
                <p className="text-muted-foreground">Comunicacao com a equipe tecnica</p>
              </div>
            )}
            {activeItem === "agendamentos" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Agendamentos</h2>
                <p className="text-muted-foreground">Vistorias e reunioes agendadas</p>
              </div>
            )}
            {activeItem === "dados" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Dados Cadastrais</h2>
                <p className="text-muted-foreground">Seus dados e informacoes de contato</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
