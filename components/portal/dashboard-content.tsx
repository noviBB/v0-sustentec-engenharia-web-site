"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import type { ProcessBucket } from "@/lib/portal-data"
import {
  FolderKanban,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileSearch,
  TrendingUp,
  Eye,
} from "lucide-react"

interface Process {
  id: string
  code: string
  name: string
  location: string
  status: string
  pendencias: number
  progress: number
  bucket: ProcessBucket
}

interface DashboardContentProps {
  processes: Process[]
  onSelectProcess: (processId: string) => void
}

const BUCKET_LABELS: Record<ProcessBucket, string> = {
  andamento: "Em andamento",
  acompanhamento: "Em acompanhamento",
  finalizado: "Finalizado",
}

export function DashboardContent({ processes, onSelectProcess }: DashboardContentProps) {
  const { user } = useAuth()
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    "Cliente"
  const firstName = displayName.trim().split(/[\s@]/)[0]

  const totalProcesses = processes.length
  const inProgress = processes.filter(p => p.bucket === "andamento").length
  const inAccompaniment = processes.filter(p => p.bucket === "acompanhamento").length
  const finalized = processes.filter(p => p.bucket === "finalizado").length
  const totalPendencias = processes.reduce((acc, p) => acc + p.pendencias, 0)

  const groupedProcesses: Array<{ bucket: ProcessBucket; items: Process[] }> = [
    { bucket: "andamento", items: processes.filter(p => p.bucket === "andamento") },
    { bucket: "acompanhamento", items: processes.filter(p => p.bucket === "acompanhamento") },
    { bucket: "finalizado", items: processes.filter(p => p.bucket === "finalizado") },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Olá, {firstName}!</h2>
        <p className="text-muted-foreground">
          Bem-vindo ao seu portal. Acompanhe aqui o andamento dos seus processos ambientais.
        </p>
      </div>

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
                <p className="text-3xl font-bold text-foreground">{inProgress}</p>
                <p className="text-xs text-muted-foreground">processos ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">EM ACOMPANHAMENTO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Eye className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{inAccompaniment}</p>
                <p className="text-xs text-muted-foreground">em acompanhamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">FINALIZADOS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <CheckCircle className="w-6 h-6 text-[#4caf50]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{finalized}</p>
                <p className="text-xs text-muted-foreground">licenças emitidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-wide">MEUS PROCESSOS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {groupedProcesses.map(group => (
              <div key={group.bucket}>
                <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                  {BUCKET_LABELS[group.bucket]}
                </h4>
                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic px-1 py-2">
                    Nenhum processo nesta categoria.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {group.items.map(process => (
                      <div
                        key={process.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => onSelectProcess(process.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              process.bucket === "finalizado"
                                ? "bg-[#e8f5e9]"
                                : process.bucket === "acompanhamento"
                                ? "bg-amber-100"
                                : "bg-blue-100"
                            }`}>
                              {process.bucket === "finalizado" ? (
                                <CheckCircle className="w-5 h-5 text-[#4caf50]" />
                              ) : process.bucket === "acompanhamento" ? (
                                <Eye className="w-5 h-5 text-amber-600" />
                              ) : (
                                <FileSearch className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <span className="inline-block text-[10px] font-semibold tracking-wider uppercase text-[#2d5a27] bg-[#f5f1e6] border border-[#e5dcc5] rounded px-2 py-0.5 mb-1.5">
                                {process.code}
                              </span>
                              <p className="font-semibold text-foreground">{process.name}</p>
                              {process.location && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {process.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{process.progress}%</span>
                          </div>

                          <Badge className={`${
                            process.bucket === "finalizado"
                              ? "bg-[#e8f5e9] text-[#2d5a27]"
                              : process.bucket === "acompanhamento"
                              ? "bg-amber-100 text-amber-800"
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
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-[#e8f5e9] rounded-xl w-fit mx-auto mb-3">
                <Clock className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <p className="font-semibold text-foreground">Agendar Reunião</p>
              <p className="text-sm text-muted-foreground mt-1">Marque uma reunião com seu responsável técnico</p>
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
              <p className="font-semibold text-foreground">Resolver Pendências</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você tem {totalPendencias} {totalPendencias === 1 ? "item pendente" : "itens pendentes"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
