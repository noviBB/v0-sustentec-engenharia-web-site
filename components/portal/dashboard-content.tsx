"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ProcessRow, ProcessBuckets } from "@/lib/db/processes"
import { useLanguage } from "@/lib/language-context"
import { PaymentsDashboardCard } from "@/components/portal/payments-dashboard-card"
import { DashboardMap } from "@/components/portal/dashboard-map"
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

type Bucket = "andamento" | "acompanhamento" | "finalizado"

interface DashboardContentProps {
  /** Tenant display name — shown in the greeting. */
  displayName: string
  /** Pre-bucketed processes from `listBuckets`. */
  buckets: ProcessBuckets
  unreadCount: number
  /** Sum of pending + overdue payment amounts across the client's projects. */
  paymentsTotalDue: number
  onSelectProcess: (processId: string) => void
}

export function DashboardContent({
  displayName,
  buckets,
  unreadCount,
  paymentsTotalDue,
  onSelectProcess,
}: DashboardContentProps) {
  const { t } = useLanguage()

  const processes: ProcessRow[] = [
    ...buckets.andamento,
    ...buckets.acompanhamento,
    ...buckets.finalizado,
  ]
  const totalProcesses = processes.length
  const inProgress = buckets.andamento.length
  const inAccompaniment = buckets.acompanhamento.length
  const finalized = buckets.finalizado.length
  const totalPendencias = processes.reduce(
    (acc, p) => acc + (p.pendencias_count ?? 0),
    0,
  )

  const groupedProcesses: Array<{ bucket: Bucket; items: ProcessRow[] }> = [
    { bucket: "andamento", items: buckets.andamento },
    { bucket: "acompanhamento", items: buckets.acompanhamento },
    { bucket: "finalizado", items: buckets.finalizado },
  ]

  const bucketLabel = (b: Bucket) => t(`portal.dashboard.bucket.${b}`)

  const unreadLine =
    unreadCount === 1
      ? t("portal.dashboard.unread.one").replace("{count}", String(unreadCount))
      : t("portal.dashboard.unread.other").replace("{count}", String(unreadCount))

  const greeting = t("portal.dashboard.greeting").replace("{name}", displayName)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{greeting}</h2>
        <p className="text-muted-foreground">
          {t("portal.dashboard.subtitle")}
        </p>
        {unreadCount > 0 && (
          <p className="text-sm text-[#2d5a27] mt-1">{unreadLine}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">
              {t("portal.dashboard.stat.total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <FolderKanban className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalProcesses}</p>
                <p className="text-xs text-muted-foreground">
                  {t("portal.dashboard.stat.total.label")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">
              {t("portal.dashboard.stat.inProgress")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <FileSearch className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{inProgress}</p>
                <p className="text-xs text-muted-foreground">
                  {t("portal.dashboard.stat.inProgress.label")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">
              {t("portal.dashboard.stat.accompaniment")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Eye className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{inAccompaniment}</p>
                <p className="text-xs text-muted-foreground">
                  {t("portal.dashboard.stat.accompaniment.label")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">
              {t("portal.dashboard.stat.finalized")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <CheckCircle className="w-6 h-6 text-[#4caf50]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{finalized}</p>
                <p className="text-xs text-muted-foreground">
                  {t("portal.dashboard.stat.finalized.label")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <PaymentsDashboardCard total={paymentsTotalDue} />
      </div>

      <DashboardMap processes={processes} />

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-wide">
            {t("portal.dashboard.processes.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">
                {t("portal.dashboard.processes.empty.title")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("portal.dashboard.processes.empty.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedProcesses.map(group => (
                <div key={group.bucket}>
                  <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                    {bucketLabel(group.bucket)}
                  </h4>
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1 py-2">
                      {t("portal.dashboard.bucket.empty")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {group.items.map(process => {
                        const pendencias = process.pendencias_count ?? 0
                        const pendenciasLabel =
                          pendencias === 1
                            ? t("portal.dashboard.pendencias.one").replace("{count}", String(pendencias))
                            : t("portal.dashboard.pendencias.other").replace("{count}", String(pendencias))
                        return (
                          <div
                            key={process.id}
                            className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => onSelectProcess(process.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  process.status === "finalizado"
                                    ? "bg-[#e8f5e9]"
                                    : process.status === "acompanhamento"
                                    ? "bg-amber-100"
                                    : "bg-blue-100"
                                }`}>
                                  {process.status === "finalizado" ? (
                                    <CheckCircle className="w-5 h-5 text-[#4caf50]" />
                                  ) : process.status === "acompanhamento" ? (
                                    <Eye className="w-5 h-5 text-amber-600" />
                                  ) : (
                                    <FileSearch className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  {process.code && (
                                    <span className="inline-block text-[10px] font-semibold tracking-wider uppercase text-[#2d5a27] bg-[#f5f1e6] border border-[#e5dcc5] rounded px-2 py-0.5 mb-1.5">
                                      {process.code}
                                    </span>
                                  )}
                                  <p className="font-semibold text-foreground">{process.name ?? "—"}</p>
                                  {process.city && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {process.city}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mt-4 md:mt-0">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{process.progress_percent}%</span>
                              </div>

                              <Badge className={`${
                                process.status === "finalizado"
                                  ? "bg-[#e8f5e9] text-[#2d5a27]"
                                  : process.status === "acompanhamento"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {process.status_label ?? bucketLabel(group.bucket)}
                              </Badge>

                              {pendencias > 0 && (
                                <Badge className="bg-amber-100 text-amber-800">
                                  {pendenciasLabel}
                                </Badge>
                              )}

                              <Button variant="ghost" size="sm" className="text-[#2d5a27] hover:text-[#1b3d19] hover:bg-[#e8f5e9]">
                                {t("portal.dashboard.viewDetails")} <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-[#e8f5e9] rounded-xl w-fit mx-auto mb-3">
                <Clock className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <p className="font-semibold text-foreground">
                {t("portal.dashboard.shortcut.schedule.title")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("portal.dashboard.shortcut.schedule.description")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-[#e8f5e9] rounded-xl w-fit mx-auto mb-3">
                <FolderKanban className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <p className="font-semibold text-foreground">
                {t("portal.dashboard.shortcut.newProcess.title")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("portal.dashboard.shortcut.newProcess.description")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-amber-100 rounded-xl w-fit mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-semibold text-foreground">
                {t("portal.dashboard.shortcut.pendencias.title")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {(totalPendencias === 1
                  ? t("portal.dashboard.shortcut.pendencias.one")
                  : t("portal.dashboard.shortcut.pendencias.other")
                ).replace("{count}", String(totalPendencias))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
