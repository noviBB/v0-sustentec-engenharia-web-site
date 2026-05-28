"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

type ProjectStatus = "andamento" | "acompanhamento" | "finalizado"

interface ProjectStatusBadgeProps {
  status: ProjectStatus | string
  className?: string
}

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  andamento: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
  acompanhamento:
    "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
  finalizado:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
}

/**
 * Renders the three portal-facing project statuses with distinct colors.
 * Falls back to a neutral style for any other status value (e.g. `arquivado`),
 * which the portal normally filters out but might still leak through.
 */
export function ProjectStatusBadge({
  status,
  className,
}: ProjectStatusBadgeProps) {
  const { t } = useLanguage()
  const known = status as ProjectStatus
  const isKnown =
    known === "andamento" ||
    known === "acompanhamento" ||
    known === "finalizado"

  const label = isKnown ? t(`portal.status.${known}`) : status
  const variantClass = isKnown
    ? STATUS_CLASSES[known]
    : "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200"

  return (
    <Badge className={cn("text-xs font-medium border", variantClass, className)}>
      {label}
    </Badge>
  )
}
