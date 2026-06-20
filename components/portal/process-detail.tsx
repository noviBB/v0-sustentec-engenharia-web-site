"use client"

import { useState } from "react"
import type { ProcessRow } from "@/lib/db/processes"
import type { PaymentRow } from "@/lib/db/payments"
import type { MilestoneRow } from "@/lib/db/milestones"
import type { TaskRow } from "@/lib/db/tasks"
import type { DocumentRow } from "@/lib/db/documents"
import { licenseTypeLabel } from "@/lib/constants/license-type-labels"
import { cn } from "@/lib/utils"
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
  milestones?: MilestoneRow[]
  tasks?: TaskRow[]
  documents?: DocumentRow[]
  /** Tab to open on mount — e.g. "pendencias" from Resolver Pendências. */
  initialTab?: string
  /** Returns to the dashboard ("Mais informações" card). */
  onBack: () => void
}

function formatBRDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return String(value)
  }
}

/** Statuses that do not count as open pendências (mirrors the DB view). */
const CLOSED_TASK_STATUSES = ["concluida", "arquivada"]

const TASK_PRIORITY_BADGE: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700",
  media: "bg-blue-100 text-blue-800",
  alta: "bg-amber-100 text-amber-800",
  urgente: "bg-red-100 text-red-800",
}

export function ProcessDetail({
  process,
  payments = [],
  milestones = [],
  tasks = [],
  documents = [],
  initialTab = "resumo",
  onBack,
}: ProcessDetailProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState(initialTab)

  const statusBadgeText = process.status_label ?? process.status
  const openTasks = tasks.filter(
    (task) => !CLOSED_TASK_STATUSES.includes(task.status),
  )

  // The exact "Resumo do enquadramento" rows the client asked for, in order
  // (issue #32) — aligned as a label/value table, em-dash for missing data.
  const resumoRows: Array<{ label: string; value: string }> = [
    {
      label: t("portal.process.resumo.licenseType"),
      value:
        process.license_types.length > 0
          ? process.license_types.map(licenseTypeLabel).join(", ")
          : "—",
    },
    {
      label: t("portal.process.resumo.agency"),
      value: process.environmental_agency ?? "—",
    },
    {
      label: t("portal.process.resumo.processingTime"),
      value: process.tempo_tramitacao ?? "—",
    },
    {
      label: t("portal.process.resumo.impactClass"),
      value: process.classe_impacto ?? "—",
    },
    {
      label: t("portal.process.resumo.responsibleTech"),
      value: process.responsible_tech_name ?? "—",
    },
    {
      label: t("portal.process.resumo.licensedActivity"),
      value: process.atividade_licenciada ?? "—",
    },
  ]

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">{t("portal.process.status.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <FileSearch className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">{statusBadgeText}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("portal.process.status.lastUpdate")}</p>
                <p className="text-xs text-muted-foreground">{formatBRDate(process.updated_at as unknown as string)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">{t("portal.process.dates.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e8f5e9] rounded-xl">
                <Calendar className="w-6 h-6 text-[#2d5a27]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("portal.process.dates.start")}</p>
                <p className="text-sm font-medium">{formatBRDate(process.started_at)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("portal.process.dates.due")}</p>
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
            {t("portal.process.tab.resumo")}
          </TabsTrigger>
          <TabsTrigger
            value="evolucao"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3"
          >
            <TrendingUp className="w-4 h-4" />
            {t("portal.process.tab.evolution")}
          </TabsTrigger>
          <TabsTrigger
            value="pendencias"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3 relative"
          >
            <AlertCircle className="w-4 h-4" />
            {t("portal.process.tab.pendencias")}
            {process.pendencias_count > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs rounded-full bg-amber-500 text-white">
                {process.pendencias_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="documentos"
            className="flex items-center gap-2 bg-white border border-gray-200 data-[state=active]:bg-[#2d5a27] data-[state=active]:text-white data-[state=active]:border-[#2d5a27] rounded-lg py-3"
          >
            <FolderOpen className="w-4 h-4" />
            {t("portal.process.tab.documents")}
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
              <CardTitle className="text-sm font-semibold tracking-wide">{t("portal.process.resumo.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Aligned label/value table — exact rows + order from issue #32. */}
              <div className="divide-y divide-gray-100">
                {resumoRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 py-2.5 text-sm"
                  >
                    <p className="text-muted-foreground">{row.label}</p>
                    <p className="font-medium">{row.value}</p>
                  </div>
                ))}
              </div>
              {process.objective && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-muted-foreground">{t("portal.process.resumo.objective")}</p>
                  <p className="text-sm text-foreground mt-1">{process.objective}</p>
                </div>
              )}
              {process.observation && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">{t("portal.process.resumo.observations")}</p>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-line">{process.observation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolução Tab — milestone timeline synced from Notion. */}
        <TabsContent value="evolucao">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">{t("portal.process.evolution.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {t("portal.process.evolution.empty")}
                  </p>
                </div>
              ) : (
                <ol className="relative ml-3 border-l border-gray-200">
                  {milestones.map((m) => (
                    <li key={m.slug} className="mb-6 ml-6 last:mb-1">
                      <span
                        className={cn(
                          "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white",
                          m.checked
                            ? "border-[#4caf50] text-[#4caf50]"
                            : "border-gray-300 text-gray-300",
                        )}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </span>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          m.checked ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {m.label_pt}
                      </p>
                      {m.checked && m.checked_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBRDate(m.checked_at)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pendências Tab — open process_tasks (synced from Notion or created
            by the payment-overdue cron). */}
        <TabsContent value="pendencias">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">{t("portal.process.pendencias.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {openTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-[#4caf50] mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">{t("portal.process.pendencias.empty.title")}</p>
                  <p className="text-sm text-muted-foreground">{t("portal.process.pendencias.empty.description")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col gap-2 p-4 border border-gray-100 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.summary && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {task.summary}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-gray-100 text-gray-700">
                            {t(`portal.task.status.${task.status}`)}
                          </Badge>
                          <Badge
                            className={
                              TASK_PRIORITY_BADGE[task.priority] ??
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {t(`portal.task.priority.${task.priority}`)}
                          </Badge>
                        </div>
                      </div>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 ml-12">
                          <Clock className="w-3 h-3" />
                          {t("portal.process.pendencias.due").replace(
                            "{date}",
                            formatBRDate(task.due_date),
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos Tab — download-only (no upload affordance; documents are
            published by the Sustentec team). */}
        <TabsContent value="documentos">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-wide">{t("portal.process.documents.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <Download className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">
                    {t("portal.process.documents.empty.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("portal.process.documents.empty.description")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-4 p-4 border border-gray-100 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-[#e8f5e9] rounded-lg shrink-0">
                          <FileText className="w-5 h-5 text-[#2d5a27]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBRDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-[#2d5a27] border-[#2d5a27]/30 hover:bg-[#e8f5e9]"
                      >
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {t("portal.process.documents.download")}
                        </a>
                      </Button>
                    </div>
                  ))}
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
              {t("portal.process.support.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("portal.process.support.description")}
            </p>
            {/* Sustentec Projetos WhatsApp: +55 22 99870-6033 */}
            <Button asChild size="sm" className="bg-[#4caf50] hover:bg-[#43a047] text-white">
              <a href="https://wa.me/5522998706033" target="_blank" rel="noopener noreferrer">
                {t("portal.process.support.cta")}
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
              {t("portal.process.transparent.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#2d5a27]/80 mb-4">
              {t("portal.process.transparent.description")}
            </p>
            <Button
              variant="link"
              className="px-0 text-[#2d5a27] text-sm hover:text-[#1b3d19]"
              onClick={onBack}
            >
              {t("portal.process.transparent.cta")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
