"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ProcessRow, ProcessBuckets } from "@/modules/processes/processes.repo"
import {
  type Bucket,
  BUCKET_ORDER,
  bucketCounts,
  flattenBuckets,
} from "@/modules/processes/processes.service"
import { ProcessBucket, ProcessStatus } from "@/lib/db/enums"
import { useLanguage } from "@/lib/language-context"
import { PaymentsDashboardCard } from "@/modules/payments/components/payments-dashboard-card"
import { DashboardMap } from "./dashboard-map"
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

interface DashboardContentProps {
  /** Tenant display name — shown in the greeting. */
  displayName: string
  /** Pre-bucketed processes from `listBuckets`. */
  buckets: ProcessBuckets
  unreadCount: number
  /** Per-process unseen (unread) count, keyed by process id; drives the per-row badge. */
  unseenByProcess: Record<string, number>
  /** Sum of pending + overdue payment amounts across the client's projects. */
  paymentsTotalDue: number
  /** Opens a process detail; `tab` preselects a detail tab (e.g. pendências). */
  onSelectProcess: (processId: string, tab?: string) => void
  /** Switches the shell to another view (e.g. "agendamentos"). */
  onNavigate: (item: string) => void
}

/** Mailbox monitored by the Sustentec team (matches the seed constant). */
const NEW_PROJECT_EMAIL = "leondalmasso@sustentec-engenharia.com.br"
/** Team inbox kept in copy on new-project requests. */
const NEW_PROJECT_CC = "contato@sustentec-engenharia.com.br"

export function DashboardContent({
  displayName,
  buckets,
  unreadCount,
  unseenByProcess,
  paymentsTotalDue,
  onSelectProcess,
  onNavigate,
}: DashboardContentProps) {
  const { t } = useLanguage()
  // Clicking a status card filters the list below to that bucket; clicking it
  // again (or the TOTAL card) shows everything.
  const [bucketFilter, setBucketFilter] = useState<Bucket | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const processes: ProcessRow[] = flattenBuckets(buckets)
  const counts = bucketCounts(buckets)
  const totalProcesses = counts.total
  const inProgress = counts.andamento
  const inAccompaniment = counts.acompanhamento
  const finalized = counts.finalizado
  // "Pendências" surfaces all use the per-process UNSEEN count so every
  // pendência number on screen (badges, the bell, and this card) agrees.
  const unseenTotal = processes.reduce(
    (acc, p) => acc + (unseenByProcess[p.id] ?? 0),
    0,
  )

  const allGroups: Array<{ bucket: Bucket; items: ProcessRow[] }> =
    BUCKET_ORDER.map((bucket) => ({ bucket, items: buckets[bucket] }))
  const groupedProcesses = allGroups.filter(
    (group) => bucketFilter === null || group.bucket === bucketFilter,
  )

  // "Resolver Pendências" jumps to the project with the most UNSEEN items.
  const pendenciasTarget = processes.reduce<ProcessRow | null>((best, p) => {
    const unseen = unseenByProcess[p.id] ?? 0
    if (unseen <= 0) return best
    if (!best || unseen > (unseenByProcess[best.id] ?? 0)) return p
    return best
  }, null)

  const newProjectMailto = `mailto:${NEW_PROJECT_EMAIL}?cc=${encodeURIComponent(
    NEW_PROJECT_CC,
  )}&subject=${encodeURIComponent(
    t("portal.dashboard.shortcut.newProcess.mail.subject"),
  )}&body=${encodeURIComponent(
    t("portal.dashboard.shortcut.newProcess.mail.body"),
  )}`

  function toggleBucketFilter(bucket: Bucket) {
    setBucketFilter((prev) => {
      const next = prev === bucket ? null : bucket
      if (next !== null) {
        requestAnimationFrame(() => {
          listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          listRef.current?.focus({ preventScroll: true })
        })
      }
      return next
    })
  }

  const statCardClasses = (active: boolean) =>
    cn(
      "bg-white cursor-pointer transition-shadow hover:shadow-md",
      active && "ring-2 ring-[#2d5a27]",
    )

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
        <Card
          className={statCardClasses(false)}
          role="button"
          onClick={() => setBucketFilter(null)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide">
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={statCardClasses(bucketFilter === ProcessBucket.Andamento)}
          role="button"
          aria-pressed={bucketFilter === ProcessBucket.Andamento}
          onClick={() => toggleBucketFilter(ProcessBucket.Andamento)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide">
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={statCardClasses(
            bucketFilter === ProcessBucket.Acompanhamento,
          )}
          role="button"
          aria-pressed={bucketFilter === ProcessBucket.Acompanhamento}
          onClick={() => toggleBucketFilter(ProcessBucket.Acompanhamento)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide">
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={statCardClasses(bucketFilter === ProcessBucket.Finalizado)}
          role="button"
          aria-pressed={bucketFilter === ProcessBucket.Finalizado}
          onClick={() => toggleBucketFilter(ProcessBucket.Finalizado)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide">
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
              </div>
            </div>
          </CardContent>
        </Card>

        <PaymentsDashboardCard total={paymentsTotalDue} />
      </div>

      <DashboardMap processes={processes} />

      <div
        ref={listRef}
        tabIndex={-1}
        aria-label={t("portal.dashboard.processes.title")}
        className="scroll-mt-4 outline-none"
      >
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
                        const unseen = unseenByProcess[process.id] ?? 0
                        const unseenLabel =
                          unseen === 1
                            ? t("portal.dashboard.pendencias.one").replace("{count}", String(unseen))
                            : t("portal.dashboard.pendencias.other").replace("{count}", String(unseen))
                        return (
                          <div
                            key={process.id}
                            className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => onSelectProcess(process.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  process.status === ProcessStatus.Finalizado
                                    ? "bg-[#e8f5e9]"
                                    : process.status === ProcessStatus.Acompanhamento
                                    ? "bg-amber-100"
                                    : "bg-blue-100"
                                }`}>
                                  {process.status === ProcessStatus.Finalizado ? (
                                    <CheckCircle className="w-5 h-5 text-[#4caf50]" />
                                  ) : process.status === ProcessStatus.Acompanhamento ? (
                                    <Eye className="w-5 h-5 text-amber-600" />
                                  ) : (
                                    <FileSearch className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  {process.code && (
                                    <span className="inline-block text-xs font-semibold tracking-wider uppercase text-[#2d5a27] bg-[#f5f1e6] border border-[#e5dcc5] rounded px-2 py-0.5 mb-1.5">
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
                                process.status === ProcessStatus.Finalizado
                                  ? "bg-[#e8f5e9] text-[#2d5a27]"
                                  : process.status === ProcessStatus.Acompanhamento
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {process.status_label ?? bucketLabel(group.bucket)}
                              </Badge>

                              {unseen > 0 && (
                                <Badge className="bg-amber-100 text-amber-800">
                                  {unseenLabel}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="bg-white hover:shadow-md transition-shadow cursor-pointer"
          role="button"
          onClick={() => onNavigate("agendamentos")}
        >
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

        <a href={newProjectMailto} className="block">
          <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer h-full">
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
        </a>

        <Card
          className={cn(
            "bg-white transition-shadow",
            pendenciasTarget
              ? "hover:shadow-md cursor-pointer"
              : "opacity-60",
          )}
          role="button"
          aria-disabled={!pendenciasTarget}
          onClick={() =>
            pendenciasTarget &&
            onSelectProcess(pendenciasTarget.id, "pendencias")
          }
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-amber-100 rounded-xl w-fit mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-semibold text-foreground">
                {t("portal.dashboard.shortcut.pendencias.title")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {(unseenTotal === 1
                  ? t("portal.dashboard.shortcut.pendencias.one")
                  : t("portal.dashboard.shortcut.pendencias.other")
                ).replace("{count}", String(unseenTotal))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
