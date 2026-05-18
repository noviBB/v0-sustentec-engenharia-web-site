"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FolderKanban,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileSearch,
  TrendingUp,
} from "lucide-react"

interface Process {
  id: string
  name: string
  location: string
  status: string
  pendencias: number
  progress: number
}

interface DashboardContentProps {
  processes: Process[]
  onSelectProcess: (processId: string) => void
}

export function DashboardContent({ processes, onSelectProcess }: DashboardContentProps) {
  const totalProcesses = processes.length
  const completedProcesses = processes.filter(p => p.progress === 100).length
  const inProgressProcesses = processes.filter(p => p.progress < 100).length
  const totalPendencias = processes.reduce((acc, p) => acc + p.pendencias, 0)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ola, Cliente!</h2>
        <p className="text-muted-foreground">
          Bem-vindo ao seu portal. Acompanhe aqui o andamento dos seus processos ambientais.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">TOTAL DE PROCESSOS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <FolderKanban className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalProcesses}</p>
                <p className="text-xs text-muted-foreground">processos cadastrados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">EM ANDAMENTO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <FileSearch className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{inProgressProcesses}</p>
                <p className="text-xs text-muted-foreground">processos ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">CONCLUIDOS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <CheckCircle className="w-6 h-6 text-[#4caf50]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{completedProcesses}</p>
                <p className="text-xs text-muted-foreground">licencas emitidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">PENDENCIAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalPendencias}</p>
                <p className="text-xs text-muted-foreground">itens pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processes List */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-wide">MEUS PROCESSOS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {processes.map((process) => (
              <div
                key={process.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onSelectProcess(process.id)}
              >
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      process.progress === 100 ? "bg-[#e8f5e9]" : "bg-blue-100"
                    }`}>
                      {process.progress === 100 ? (
                        <CheckCircle className="w-5 h-5 text-[#4caf50]" />
                      ) : (
                        <FileSearch className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{process.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {process.location}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{process.progress}%</span>
                  </div>
                  
                  <Badge className={`${
                    process.progress === 100 
                      ? "bg-[#e8f5e9] text-[#2d5a27]" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {process.status}
                  </Badge>
                  
                  {process.pendencias > 0 && (
                    <Badge className="bg-amber-100 text-amber-800">
                      {process.pendencias} pendencia{process.pendencias > 1 ? "s" : ""}
                    </Badge>
                  )}
                  
                  <Button variant="ghost" size="sm" className="text-[#2d5a27] hover:text-[#1b3d19] hover:bg-[#e8f5e9]">
                    Ver detalhes <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-wide">ATIVIDADE RECENTE</CardTitle>
          <Button variant="link" className="text-[#2d5a27] text-sm px-0 hover:text-[#1b3d19]">
            Ver todas <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: "27/04/2026", process: "Condominio Residencial Multifamiliar", event: "Em analise pelo orgao ambiental" },
              { date: "15/04/2026", process: "Posto de Combustiveis", event: "Aguardando documentacao complementar" },
              { date: "10/01/2026", process: "Loteamento Residencial", event: "Licenca emitida com sucesso" },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                    index === 0 ? "bg-[#4caf50]" : "bg-gray-300"
                  }`} />
                  {index < 2 && (
                    <div className="w-0.5 h-10 bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground font-medium">{activity.date}</p>
                    <Badge variant="outline" className="text-xs">{activity.process}</Badge>
                  </div>
                  <p className={`text-sm mt-1 ${
                    index === 0 ? "font-semibold text-[#2d5a27]" : "text-foreground"
                  }`}>
                    {activity.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-[#e8f5e9] rounded-xl w-fit mx-auto mb-3">
                <Clock className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <p className="font-semibold text-foreground">Agendar Reuniao</p>
              <p className="text-sm text-muted-foreground mt-1">Marque uma reuniao com seu responsavel tecnico</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-[#e8f5e9] rounded-xl w-fit mx-auto mb-3">
                <FolderKanban className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <p className="font-semibold text-foreground">Novo Processo</p>
              <p className="text-sm text-muted-foreground mt-1">Solicite um novo processo de licenciamento</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-amber-100 rounded-xl w-fit mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-semibold text-foreground">Resolver Pendencias</p>
              <p className="text-sm text-muted-foreground mt-1">Voce tem {totalPendencias} itens pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
