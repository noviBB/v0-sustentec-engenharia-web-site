"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileSearch,
  Calendar,
  ShieldCheck,
  Download,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  Circle,
  FileText,
  MapPin,
  Building,
  User,
  Clock,
  Trees,
  ClipboardList,
  Search,
  FileCheck,
  Award,
} from "lucide-react"

// Process workflow steps with custom icons
const workflowSteps = [
  { id: 1, label: "Contratacao", icon: FileText, status: "completed" },
  { id: 2, label: "Levantamento Tecnico", icon: ClipboardList, status: "completed" },
  { id: 3, label: "Protocolo", icon: FileCheck, status: "completed" },
  { id: 4, label: "Analise do Orgao", icon: Search, status: "current" },
  { id: 5, label: "Exigencias", icon: AlertTriangle, status: "pending" },
  { id: 6, label: "Aprovacao", icon: CheckCircle, status: "pending" },
  { id: 7, label: "Licenca Emitida", icon: Award, status: "pending" },
]

// Process history
const processHistory = [
  { date: "27/04/2026", event: "Em analise pelo orgao ambiental", current: true },
  { date: "02/04/2026", event: "Processo encaminhado para analise tecnica", current: false },
  { date: "20/03/2026", event: "Processo protocolado no orgao ambiental", current: false },
  { date: "12/03/2026", event: "Vistoria tecnica realizada", current: false },
  { date: "05/03/2026", event: "Documentacao recebida", current: false },
  { date: "01/03/2026", event: "Contrato assinado", current: false },
]

// Downloadable files
const downloadableFiles = [
  { name: "Contrato", date: "05/03/2026" },
  { name: "Requerimento", date: "10/03/2026" },
  { name: "Plantas", date: "12/03/2026" },
  { name: "Estudos Ambientais", date: "18/03/2026" },
  { name: "Comprovantes", date: "20/03/2026" },
  { name: "Licenca Emitida", date: "22/08/2026" },
]

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ola, Cliente!</h2>
        <p className="text-muted-foreground">
          Bem-vindo ao seu portal. Acompanhe aqui o andamento do seu processo ambiental.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="font-semibold text-foreground text-sm leading-tight">Em analise pelo orgao ambiental</p>
                <p className="text-xs text-muted-foreground mt-1">Ultima atualizacao:</p>
                <p className="text-xs text-muted-foreground">27/04/2026 as 14:30</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">PROGRESSO DO PROCESSO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-4xl font-bold text-[#2d5a27]">65%</div>
              <Progress value={65} className="h-2 bg-[#e8f5e9]" />
              <p className="text-xs text-muted-foreground">Previsao para proxima etapa: 30 dias</p>
            </div>
          </CardContent>
        </Card>

        {/* Estimated Deadline */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">PRAZO ESTIMADO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <Calendar className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Previsao de conclusao</p>
                <p className="text-3xl font-bold text-foreground">120 dias</p>
                <p className="text-sm text-[#2d5a27] font-medium">22/08/2026</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">RISCO DO PROCESSO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <ShieldCheck className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <Badge className="bg-[#e8f5e9] text-[#2d5a27] hover:bg-[#c8e6c9] text-base font-semibold px-3 py-1">
                  Baixo
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Situacao favoravel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Workflow */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide">FLUXOGRAMA DO PROCESSO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between overflow-x-auto pb-4 gap-2">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center min-w-[90px]">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all ${
                      step.status === "completed"
                        ? "bg-[#e8f5e9] border-[#4caf50] text-[#2d5a27]"
                        : step.status === "current"
                        ? "bg-[#2d5a27] border-[#2d5a27] text-white shadow-lg"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-center mt-2 text-muted-foreground max-w-[90px] leading-tight">
                    {step.label}
                  </span>
                  <div className="mt-2">
                    {step.status === "completed" && (
                      <CheckCircle className="w-5 h-5 text-[#4caf50]" />
                    )}
                    {step.status === "current" && (
                      <div className="w-3 h-3 bg-[#2d5a27] rounded-full animate-pulse" />
                    )}
                    {step.status === "pending" && (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                </div>
                {index < workflowSteps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mt-[-40px] ${
                      step.status === "completed" ? "bg-[#4caf50]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center pt-4 border-t border-gray-100">
            <Badge variant="outline" className="text-[#2d5a27] border-[#2d5a27] bg-[#e8f5e9] px-4 py-1.5">
              Etapa atual: Analise do Orgao Ambiental
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License Summary */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-wide">RESUMO DO ENQUADRAMENTO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de licenca</p>
                  <p className="font-medium">LP / LI</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Local do empreendimento</p>
                  <p className="font-medium">Nova Friburgo - RJ</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Orgao ambiental</p>
                  <p className="font-medium">INEA</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Prazo estimado</p>
                  <p className="font-medium">120 dias</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Classe de Impacto</p>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 mt-0.5">MEDIO</Badge>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Responsavel tecnico</p>
                  <p className="font-medium">Leonardo Martins</p>
                </div>
              </div>
              <div className="flex items-start gap-3 col-span-2">
                <Trees className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Atividade licenciada</p>
                  <p className="font-medium">Condominio Residencial Multifamiliar</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">CREA</p>
                  <p className="font-medium">2018101234</p>
                </div>
              </div>
            </div>
            <Button variant="link" className="mt-4 px-0 text-[#2d5a27] hover:text-[#1b3d19]">
              Ver detalhes do enquadramento <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Process History */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide">HISTORICO DO PROCESSO</CardTitle>
            <Button variant="link" className="text-[#2d5a27] text-sm px-0 hover:text-[#1b3d19]">
              Ver historico completo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {processHistory.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        item.current ? "bg-[#4caf50]" : "bg-gray-300"
                      }`}
                    />
                    {index < processHistory.length - 1 && (
                      <div className="w-0.5 h-10 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
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
      </div>

      {/* Files for Download */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-wide">ARQUIVOS PARA DOWNLOAD</CardTitle>
          <Button variant="link" className="text-[#2d5a27] text-sm px-0 hover:text-[#1b3d19]">
            Ver todos os arquivos <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {downloadableFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FileText className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">PDF</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2d5a27] hover:text-[#1b3d19] hover:bg-[#e8f5e9]">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Client Actions */}
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-amber-700 flex items-center gap-2">
              <div className="p-1.5 bg-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
              </div>
              PENDENCIAS DO CLIENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-2">Aguardando envio de documento:</p>
            <p className="text-sm text-amber-800 font-medium mb-4">
              Comprovante de pagamento da taxa ambiental
            </p>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
              Enviar documento
            </Button>
          </CardContent>
        </Card>

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
            <Button size="sm" className="bg-[#4caf50] hover:bg-[#43a047] text-white">
              Falar agora
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
