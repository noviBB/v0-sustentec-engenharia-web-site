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
} from "lucide-react"

// Process workflow steps
const workflowSteps = [
  { id: 1, label: "Contratacao", icon: FileText, status: "completed" },
  { id: 2, label: "Levantamento Tecnico", icon: MapPin, status: "completed" },
  { id: 3, label: "Protocolo", icon: FileText, status: "completed" },
  { id: 4, label: "Analise do Orgao", icon: FileSearch, status: "current" },
  { id: 5, label: "Exigencias", icon: AlertTriangle, status: "pending" },
  { id: 6, label: "Aprovacao", icon: CheckCircle, status: "pending" },
  { id: 7, label: "Licenca Emitida", icon: Trees, status: "pending" },
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">STATUS ATUAL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSearch className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Em analise pelo orgao ambiental</p>
                <p className="text-xs text-muted-foreground">Ultima atualizacao: 27/04/2026 as 14:30</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PROGRESSO DO PROCESSO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">65%</div>
              <Progress value={65} className="h-2" />
              <p className="text-xs text-muted-foreground">Previsao para proxima etapa: 30 dias</p>
            </div>
          </CardContent>
        </Card>

        {/* Estimated Deadline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PRAZO ESTIMADO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Previsao de conclusao</p>
                <p className="text-2xl font-bold text-foreground">120 dias</p>
                <p className="text-xs text-muted-foreground">22/08/2026</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RISCO DO PROCESSO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30 mb-1">Baixo</Badge>
                <p className="text-xs text-muted-foreground">Situacao favoravel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">FLUXOGRAMA DO PROCESSO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto pb-4">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[80px]">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      step.status === "completed"
                        ? "bg-primary border-primary text-primary-foreground"
                        : step.status === "current"
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-center mt-2 text-muted-foreground max-w-[80px]">
                    {step.label}
                  </span>
                  {step.status === "completed" && (
                    <CheckCircle className="w-4 h-4 text-primary mt-1" />
                  )}
                  {step.status === "current" && (
                    <Circle className="w-4 h-4 text-primary fill-primary mt-1" />
                  )}
                  {step.status === "pending" && (
                    <Circle className="w-4 h-4 text-muted-foreground mt-1" />
                  )}
                </div>
                {index < workflowSteps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step.status === "completed" ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center pt-4 border-t">
            <Badge variant="outline" className="text-primary border-primary">
              Etapa atual: Analise do Orgao Ambiental
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RESUMO DO ENQUADRAMENTO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Tipo de licenca</p>
                  <p className="font-medium">LP / LI</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Local do empreendimento</p>
                  <p className="font-medium">Nova Friburgo - RJ</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Orgao ambiental</p>
                  <p className="font-medium">INEA</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Prazo estimado</p>
                  <p className="font-medium">120 dias</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Classe de Impacto</p>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">MEDIO</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Responsavel tecnico</p>
                  <p className="font-medium">Leonardo Martins</p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Trees className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Atividade licenciada</p>
                  <p className="font-medium">Condominio Residencial Multifamiliar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">CREA</p>
                  <p className="font-medium">2018101234</p>
                </div>
              </div>
            </div>
            <Button variant="link" className="mt-4 px-0 text-primary">
              Ver detalhes do enquadramento <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Process History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">HISTORICO DO PROCESSO</CardTitle>
            <Button variant="link" className="text-primary text-sm px-0">
              Ver historico completo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processHistory.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        item.current ? "bg-primary" : "bg-border"
                      }`}
                    />
                    {index < processHistory.length - 1 && (
                      <div className="w-0.5 h-8 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                    <p
                      className={`text-sm ${
                        item.current ? "font-semibold text-primary" : "text-foreground"
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ARQUIVOS PARA DOWNLOAD</CardTitle>
          <Button variant="link" className="text-primary text-sm px-0">
            Ver todos os arquivos <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {downloadableFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded">
                    <FileText className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.date}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Client Actions */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              PENDENCIAS DO CLIENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-3">Aguardando envio de documento:</p>
            <p className="text-sm text-amber-800 font-medium mb-4">
              Comprovante de pagamento da taxa ambiental
            </p>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Enviar documento
            </Button>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              DUVIDAS OU PRECISA DE SUPORTE?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fale diretamente com seu responsavel tecnico.
            </p>
            <Button size="sm" variant="default">
              Falar agora
            </Button>
          </CardContent>
        </Card>

        {/* Transparent Communication */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              COMUNICACAO TRANSPARENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Todas as atualizacoes do seu processo em um so lugar.
            </p>
            <Button variant="link" className="px-0 text-primary text-sm">
              Mais informacoes <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
