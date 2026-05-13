"use client"

import { useState } from "react"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"
import { DashboardContent } from "@/components/portal/dashboard-content"

export default function PortalPage() {
  const [activeItem, setActiveItem] = useState("painel")

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <PortalSidebar activeItem={activeItem} onItemChange={setActiveItem} />
      
      <div className="lg:ml-72">
        <div className="pt-16 lg:pt-0">
          <PortalHeader />
          
          <main className="p-4 md:p-6">
            {activeItem === "painel" && <DashboardContent />}
            {activeItem === "processo" && (
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Meu Processo</h2>
                <p className="text-muted-foreground">Detalhes do seu processo de licenciamento</p>
              </div>
            )}
            {activeItem === "documentos" && (
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Documentos</h2>
                <p className="text-muted-foreground">Gerencie seus documentos</p>
              </div>
            )}
            {activeItem === "historico" && (
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Historico</h2>
                <p className="text-muted-foreground">Historico completo do processo</p>
              </div>
            )}
            {activeItem === "pendencias" && (
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Pendencias</h2>
                <p className="text-muted-foreground">Acoes pendentes do cliente</p>
              </div>
            )}
            {activeItem === "mensagens" && (
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Mensagens</h2>
                <p className="text-muted-foreground">Comunicacao com a equipe tecnica</p>
              </div>
            )}
            {activeItem === "agendamentos" && (
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Agendamentos</h2>
                <p className="text-muted-foreground">Vistorias e reunioes agendadas</p>
              </div>
            )}
            {activeItem === "dados" && (
              <div className="bg-white rounded-xl p-8 text-center">
                <h2 className="text-xl font-semibold mb-2 text-[#2d5a27]">Dados Cadastrais</h2>
                <p className="text-muted-foreground">Seus dados e informacoes de contato</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
