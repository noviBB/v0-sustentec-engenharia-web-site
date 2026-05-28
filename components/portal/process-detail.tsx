"use client"

import { useState } from "react"
import type { ProcessRow } from "@/lib/db/processes"
import type { PaymentRow } from "@/lib/db/payments"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileSearch,
  Calendar,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  FileText,
  MapPin,
  Building,
  Clock,
  ClipboardList,
  TrendingUp,
  FolderOpen,
  AlertCircle,
  CreditCard,
  Download,
} from "lucide-react"
import { PaymentsView } from "@/components/portal/payments-view"
import { ProjectMap } from "@/components/portal/project-map"
import { ProjectStatusBadge } from "@/components/portal/project-status-badge"
import { useLanguage } from "@/lib/language-context"

interface ProcessDetailProps {
  process: ProcessRow
  payments?: PaymentRow[]
}

function formatBRDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function ProcessDetail({ process, payments = [] }: ProcessDetailProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("resumo")

  const statusBadgeText = process.status_label ?? process.status

  return (
    <div className="space-y-6">
      {/* Process Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          {process.code && (
            <span className="inline-block text-[11px] font-semibold tracking-[0.15em] uppercase text-[#2d5a27] bg-[#f5f1e6] border border-[#e5dcc5] rounded px-2.5 py-1 mb-2">
              {process.code}
            </span>
          )}
          <h2 className="text-2xl font-bold text-foreground">{process.name ?? "—"}</h2>
          {process.city && (
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {process.city}
            </p>
          )}
        </div>
        <ProjectStatusBadge
          status={process.status}
          className="text-sm px-4 py-1.5 self-start"
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">STATUS ATUAL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <FileSearch className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">{statusBadgeText}</p>
                <p className="text-xs text-muted-foreground mt-1">Última atualização:</p>
                <p className="text-xs text-muted-foreground">{formatBRDate(process.updated_at as unknown as string)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">PROGRESSO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <TrendingUp className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{process.progress_percent}%</p>
                <p className="text-xs text-muted-foreground">do fluxo concluído</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">DATAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <Calendar className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="text-sm font-medium">{formatBRDate(process.started_at)}</p>
                <p className="text-xs text-muted-foreground mt-1">Prazo</p>
                <p className="text-sm font-medium">{formatBRDate(process.due_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-transparent p-0 h-auto">
          <TabsTrigger
            value="resumo"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3"
          >
            <ClipboardList className="w-4 h-4" />
            Resumo
          </TabsTrigger>
          <TabsTrigger
            value="evolucao"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3"
          >
            <TrendingUp className="w-4 h-4" />
            Evolução
          </TabsTrigger>
          <TabsTrigger
            value="documentos"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3"
          >
            <FolderOpen className="w-4 h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger
            value="pendencias"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3 relative"
          >
            <AlertCircle className="w-4 h-4" />
            Pendencias
            {process.pendencias_count > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs rounded-full bg-amber-500 text-white">
                {process.pendencias_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="pagamentos"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3"
          >
            <CreditCard className="w-4 h-4" />
            {t("portal.process.tab.payments")}
          </TabsTrigger>
          <TabsTrigger
            value="mapa"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3"
          >
            <MapPin className="w-4 h-4" />
            {t("portal.process.tab.map")}
          </TabsTrigger>
        </TabsList>

        {/* Resumo Tab */}
        <TabsContent value="resumo" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">RESUMO DO ENQUADRAMENTO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {process.code && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Código</p>
                      <p className="font-medium">{process.code}</p>
                    </div>
                  </div>
                )}
                {process.city && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Local do empreendimento</p>
                      <p className="font-medium">{process.city}</p>
                    </div>
                  </div>
                )}
                {process.environmental_agency && (
                  <div className="flex items-start gap-3">
                    <Building className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Órgão ambiental</p>
                      <p className="font-medium">{process.environmental_agency}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Início</p>
                    <p className="font-medium">{formatBRDate(process.started_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className="mt-0.5 bg-[#e8f5e9] text-[#2d5a27]">{statusBadgeText}</Badge>
                  </div>
                </div>
                {process.tipologia && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipologia</p>
                      <p className="font-medium">{process.tipologia}</p>
                    </div>
                  </div>
                )}
              </div>
              {process.objective && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-muted-foreground">Objetivo</p>
                  <p className="text-sm text-foreground mt-1">{process.objective}</p>
                </div>
              )}
              {process.observation && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-line">{process.observation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolução Tab — TODO(#13): wire to process_milestones once milestone history view exists */}
        <TabsContent value="evolucao">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">EVOLUÇÃO DO PROCESSO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">
                  Linha do tempo em construção
                </p>
                <p className="text-sm text-muted-foreground">
                  {/* TODO(#13): render milestone history from `process_milestones` */}
                  Em breve você verá aqui o histórico completo do seu processo.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos Tab — download-only (upload affordance removed; future
            uploads are handled outside the portal). */}
        <TabsContent value="documentos">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">DOCUMENTOS DO PROCESSO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Download className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">
                  Documentos em breve
                </p>
                <p className="text-sm text-muted-foreground">
                  {/* TODO(#13): list downloadable documents tied to this process */}
                  Em breve você poderá visualizar e baixar os documentos do seu processo.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pendências Tab */}
        <TabsContent value="pendencias">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">PENDÊNCIAS DO PROCESSO</CardTitle>
            </CardHeader>
            <CardContent>
              {process.pendencias_count === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-[#4caf50] mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">Nenhuma pendência</p>
                  <p className="text-sm text-muted-foreground">Este processo não possui pendências no momento.</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">
                    {process.pendencias_count} pendência{process.pendencias_count > 1 ? "s" : ""} aberta{process.pendencias_count > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {/* TODO(#9): list `process_tasks` rows once Notion import is wired */}
                    Os detalhes das pendências serão exibidos aqui após a próxima sincronização.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pagamentos Tab */}
        <TabsContent value="pagamentos">
          <PaymentsView payments={payments} />
        </TabsContent>

        {/* Mapa Tab */}
        <TabsContent value="mapa">
          <ProjectMap
            latitude={process.latitude}
            longitude={process.longitude}
            label={process.name}
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <MessageCircle className="w-4 h-4 text-gray-600" />
              </div>
              DÚVIDAS OU PRECISA DE SUPORTE?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fale diretamente com seu responsável técnico.
            </p>
            <Button asChild size="sm" className="bg-[#4caf50] hover:bg-[#43a047] text-white">
              <a href="https://wa.me/5522998706033" target="_blank" rel="noopener noreferrer">
                Falar agora
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#4caf50]/30 bg-[#e8f5e9]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#2d5a27] flex items-center gap-2">
              <div className="p-1.5 bg-[#c8e6c9] rounded-lg">
                <CheckCircle className="w-4 h-4 text-[#2d5a27]" />
              </div>
              COMUNICAÇÃO TRANSPARENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#2d5a27]/80 mb-4">
              Todas as atualizações do seu processo em um só lugar.
            </p>
            <Button variant="link" className="px-0 text-[#2d5a27] text-sm hover:text-[#1b3d19]">
              Mais informações <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
