"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileSearch,
  Calendar,
  Wallet,
  Download,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  FileText,
  MapPin,
  Building,
  User,
  Clock,
  Trees,
  ClipboardList,
  Upload,
  Eye,
  TrendingUp,
  FolderOpen,
  AlertCircle,
} from "lucide-react"

interface ProcessDetailProps {
  processId: string
}

// Process data mock
const processData: Record<string, {
  code: string
  name: string
  location: string
  status: string
  progress: number
  estimatedDays: number
  estimatedDate: string
  paymentsMade: number
  paymentsTotal: number
  paidAmount: string
  licenseType: string
  environmentalAgency: string
  impactClass: string
  responsibleTech: string
  activity: string
  tipologia: string
}> = {
  "proc-001": {
    code: "CC 26-004",
    name: "Enge Prat - UNOPS Planos",
    location: "",
    status: "Em analise pelo orgao ambiental",
    progress: 65,
    estimatedDays: 120,
    estimatedDate: "22/08/2026",
    paymentsMade: 2,
    paymentsTotal: 3,
    paidAmount: "R$ 4.500,00",
    licenseType: "LP / LI",
    environmentalAgency: "INEA",
    impactClass: "MEDIO",
    responsibleTech: "Dra. Ivón Oristela Benítez González",
    activity: "UNOPS Planos",
    tipologia: "Licenciamento ambiental — médio impacto",
  },
  "proc-002": {
    code: "CC 26-016",
    name: "Licenças Enge Prat - Niterói",
    location: "Niterói - RJ",
    status: "Aguardando documentacao",
    progress: 25,
    estimatedDays: 180,
    estimatedDate: "15/11/2026",
    paymentsMade: 1,
    paymentsTotal: 4,
    paidAmount: "R$ 2.200,00",
    licenseType: "LO",
    environmentalAgency: "INEA",
    impactClass: "ALTO",
    responsibleTech: "Dra. Ivón Oristela Benítez González",
    activity: "Licenciamento Municipal",
    tipologia: "Licenciamento ambiental — alto impacto",
  },
  "proc-003": {
    code: "CC 26-017",
    name: "Laudo de Avaliação Cautelar de Vizinhança - Enge Prat",
    location: "",
    status: "Concluido",
    progress: 100,
    estimatedDays: 0,
    estimatedDate: "Concluido",
    paymentsMade: 2,
    paymentsTotal: 2,
    paidAmount: "R$ 3.800,00",
    licenseType: "Laudo Tecnico",
    environmentalAgency: "INEA",
    impactClass: "BAIXO",
    responsibleTech: "Dra. Ivón Oristela Benítez González",
    activity: "Avaliação Cautelar de Vizinhança",
    tipologia: "Laudo técnico — baixo impacto",
  },
}

// Evolution history by process
const evolutionHistory: Record<string, Array<{ date: string; event: string; current: boolean }>> = {
  "proc-001": [
    { date: "27/04/2026", event: "Em analise pelo orgao ambiental", current: true },
    { date: "02/04/2026", event: "Processo encaminhado para analise tecnica", current: false },
    { date: "20/03/2026", event: "Processo protocolado no orgao ambiental", current: false },
    { date: "12/03/2026", event: "Vistoria tecnica realizada", current: false },
    { date: "05/03/2026", event: "Documentacao recebida", current: false },
    { date: "01/03/2026", event: "Contrato assinado", current: false },
  ],
  "proc-002": [
    { date: "15/04/2026", event: "Aguardando documentacao complementar", current: true },
    { date: "10/04/2026", event: "Levantamento tecnico iniciado", current: false },
    { date: "01/04/2026", event: "Contrato assinado", current: false },
  ],
  "proc-003": [
    { date: "10/01/2026", event: "Licenca emitida com sucesso", current: true },
    { date: "05/01/2026", event: "Aprovacao final do orgao ambiental", current: false },
    { date: "20/12/2025", event: "Exigencias atendidas", current: false },
    { date: "01/12/2025", event: "Lista de exigencias recebida", current: false },
    { date: "15/11/2025", event: "Processo em analise", current: false },
    { date: "01/11/2025", event: "Processo protocolado", current: false },
    { date: "15/10/2025", event: "Contrato assinado", current: false },
  ],
}

// Documents by process
const documents: Record<string, Array<{ name: string; date: string; type: string; status: string }>> = {
  "proc-001": [
    { name: "Contrato", date: "05/03/2026", type: "PDF", status: "disponivel" },
    { name: "Requerimento", date: "10/03/2026", type: "PDF", status: "disponivel" },
    { name: "Plantas", date: "12/03/2026", type: "PDF", status: "disponivel" },
    { name: "Estudos Ambientais", date: "18/03/2026", type: "PDF", status: "disponivel" },
    { name: "Comprovantes", date: "20/03/2026", type: "PDF", status: "disponivel" },
    { name: "Licenca Emitida", date: "22/08/2026", type: "PDF", status: "pendente" },
  ],
  "proc-002": [
    { name: "Contrato", date: "01/04/2026", type: "PDF", status: "disponivel" },
    { name: "Projeto Basico", date: "10/04/2026", type: "PDF", status: "disponivel" },
    { name: "Estudo de Impacto", date: "-", type: "PDF", status: "pendente" },
  ],
  "proc-003": [
    { name: "Contrato", date: "15/10/2025", type: "PDF", status: "disponivel" },
    { name: "Requerimento", date: "20/10/2025", type: "PDF", status: "disponivel" },
    { name: "Plantas", date: "25/10/2025", type: "PDF", status: "disponivel" },
    { name: "Estudos Ambientais", date: "01/11/2025", type: "PDF", status: "disponivel" },
    { name: "Licenca Emitida", date: "10/01/2026", type: "PDF", status: "disponivel" },
  ],
}

// Pendencias by process
const pendencias: Record<string, Array<{ id: string; title: string; description: string; dueDate: string; priority: string }>> = {
  "proc-001": [
    { id: "p1", title: "Comprovante de pagamento", description: "Enviar comprovante de pagamento da taxa ambiental", dueDate: "10/05/2026", priority: "alta" },
    { id: "p2", title: "Atualizacao cadastral", description: "Atualizar dados do responsavel legal", dueDate: "15/05/2026", priority: "media" },
  ],
  "proc-002": [
    { id: "p3", title: "Estudo de Impacto Ambiental", description: "Aguardando envio do EIA/RIMA", dueDate: "30/05/2026", priority: "alta" },
    { id: "p4", title: "Plano de Emergencia", description: "Enviar plano de emergencia atualizado", dueDate: "15/06/2026", priority: "alta" },
    { id: "p5", title: "ART do projeto", description: "Enviar ART do responsavel tecnico", dueDate: "20/05/2026", priority: "media" },
  ],
  "proc-003": [],
}

export function ProcessDetail({ processId }: ProcessDetailProps) {
  const [activeTab, setActiveTab] = useState("resumo")

  const process = processData[processId]
  const history = evolutionHistory[processId] ?? []
  const docs = documents[processId] ?? []
  const processPendencias = pendencias[processId] ?? []

  if (!process) {
    return (
      <div className="space-y-6">
        <div>
          <span className="inline-block text-[11px] font-semibold tracking-[0.15em] uppercase text-[#2d5a27] bg-[#f5f1e6] border border-[#e5dcc5] rounded px-2.5 py-1 mb-2">
            {processId}
          </span>
          <h2 className="text-2xl font-bold text-foreground">Detalhes em breve</h2>
        </div>
        <Card className="bg-white">
          <CardContent className="py-16 text-center">
            <FileSearch className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">Detalhes em breve</p>
            <p className="text-sm text-muted-foreground mt-1">
              As informações detalhadas deste processo serão publicadas aqui em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Process Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <span className="inline-block text-[11px] font-semibold tracking-[0.15em] uppercase text-[#2d5a27] bg-[#f5f1e6] border border-[#e5dcc5] rounded px-2.5 py-1 mb-2">
            {process.code}
          </span>
          <h2 className="text-2xl font-bold text-foreground">{process.name}</h2>
          {process.location && (
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {process.location}
            </p>
          )}
        </div>
        <Badge
          className={`text-sm px-4 py-1.5 self-start ${
            process.progress === 100
              ? "bg-[#4caf50] text-white"
              : "bg-[#e8f5e9] text-[#2d5a27]"
          }`}
        >
          {process.status}
        </Badge>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Status */}
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
                <p className="font-semibold text-foreground text-sm leading-tight">{process.status}</p>
                <p className="text-xs text-muted-foreground mt-1">Ultima atualizacao:</p>
                <p className="text-xs text-muted-foreground">27/04/2026 as 14:30</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tempo de tramitação */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">
              TEMPO DE TRAMITAÇÃO DO PROCESSO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <Calendar className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Previsao de conclusao</p>
                <p className="text-3xl font-bold text-foreground">
                  {process.progress === 100 ? "-" : `${process.estimatedDays} dias`}
                </p>
                <p className="text-sm text-[#2d5a27] font-medium">{process.estimatedDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos realizados */}
        <Card className="bg-[#f5f1e6] border-[#e5dcc5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#2d5a27]/70 tracking-wide">
              PAGAMENTOS REALIZADOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white rounded-xl">
                <Wallet className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {process.paymentsMade} <span className="text-lg text-muted-foreground font-medium">de {process.paymentsTotal}</span>
                </p>
                <p className="text-sm text-[#2d5a27] font-semibold">{process.paidAmount}</p>
                <p className="text-xs text-[#2d5a27]/70 mt-0.5">pagamentos realizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Resumo, Evolucao, Documentos, Pendencias */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 gap-2 bg-transparent p-0 h-auto">
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
            Evolucao
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
            {processPendencias.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs rounded-full bg-amber-500 text-white">
                {processPendencias.length}
              </Badge>
            )}
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
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de licenca</p>
                    <p className="font-medium">{process.licenseType}</p>
                  </div>
                </div>
                {process.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Local do empreendimento</p>
                      <p className="font-medium">{process.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Orgao ambiental</p>
                    <p className="font-medium">{process.environmentalAgency}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo de tramitação</p>
                    <p className="font-medium">{process.progress === 100 ? "Concluido" : `${process.estimatedDays} dias`}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Classe de Impacto</p>
                    <Badge className={`mt-0.5 ${
                      process.impactClass === "BAIXO"
                        ? "bg-green-100 text-green-800"
                        : process.impactClass === "MEDIO"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}>{process.impactClass}</Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Responsavel tecnico</p>
                    <p className="font-medium">{process.responsibleTech}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 col-span-2">
                  <Trees className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Atividade licenciada</p>
                    <p className="font-medium">{process.activity}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tipologia</p>
                    <p className="font-medium">{process.tipologia}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolucao Tab */}
        <TabsContent value="evolucao">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-wide">EVOLUCAO DO PROCESSO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {history.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 ${
                          item.current ? "bg-[#4caf50]" : "bg-gray-300"
                        }`}
                      />
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-12 bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-xs text-muted-foreground font-medium">{item.date}</p>
                      <p
                        className={`text-sm ${
                          item.current ? "font-semibold text-[#2d5a27]" : "text-foreground"
                        }`}
                      >
                        {item.event}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos Tab */}
        <TabsContent value="documentos">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-wide">DOCUMENTOS DO PROCESSO</CardTitle>
              <Button variant="outline" size="sm" className="text-[#2d5a27] border-[#2d5a27] hover:bg-[#e8f5e9]">
                <Upload className="w-4 h-4 mr-2" />
                Enviar documento
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {docs.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      file.status === "disponivel"
                        ? "border-gray-100 hover:bg-gray-50"
                        : "border-dashed border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        file.status === "disponivel" ? "bg-red-100" : "bg-gray-200"
                      }`}>
                        <FileText className={`w-4 h-4 ${
                          file.status === "disponivel" ? "text-red-600" : "text-gray-400"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${
                        file.status === "disponivel"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        {file.type}
                      </Badge>
                      {file.status === "disponivel" ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2d5a27] hover:text-[#1b3d19] hover:bg-[#e8f5e9]">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2d5a27] hover:text-[#1b3d19] hover:bg-[#e8f5e9]">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">Pendente</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pendencias Tab */}
        <TabsContent value="pendencias">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">PENDENCIAS DO PROCESSO</CardTitle>
            </CardHeader>
            <CardContent>
              {processPendencias.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-[#4caf50] mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">Nenhuma pendencia</p>
                  <p className="text-sm text-muted-foreground">Este processo nao possui pendencias no momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {processPendencias.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg ${
                        item.priority === "alta"
                          ? "border-amber-300 bg-amber-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            item.priority === "alta" ? "bg-amber-200" : "bg-gray-100"
                          }`}>
                            <AlertTriangle className={`w-4 h-4 ${
                              item.priority === "alta" ? "text-amber-700" : "text-gray-600"
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Prazo: <span className="font-medium">{item.dueDate}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={`${
                            item.priority === "alta"
                              ? "bg-amber-500 text-white"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {item.priority === "alta" ? "Urgente" : "Normal"}
                          </Badge>
                          <Button size="sm" className="bg-[#4caf50] hover:bg-[#43a047] text-white">
                            Resolver
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Support */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <MessageCircle className="w-4 h-4 text-gray-600" />
              </div>
              DUVIDAS OU PRECISA DE SUPORTE?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fale diretamente com seu responsavel tecnico.
            </p>
            <Button asChild size="sm" className="bg-[#4caf50] hover:bg-[#43a047] text-white">
              <a
                href="https://wa.me/5522998706033"
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar agora
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Transparent Communication */}
        <Card className="border-[#4caf50]/30 bg-[#e8f5e9]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#2d5a27] flex items-center gap-2">
              <div className="p-1.5 bg-[#c8e6c9] rounded-lg">
                <CheckCircle className="w-4 h-4 text-[#2d5a27]" />
              </div>
              COMUNICACAO TRANSPARENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#2d5a27]/80 mb-4">
              Todas as atualizacoes do seu processo em um so lugar.
            </p>
            <Button variant="link" className="px-0 text-[#2d5a27] text-sm hover:text-[#1b3d19]">
              Mais informacoes <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
