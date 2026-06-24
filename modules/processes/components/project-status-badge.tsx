"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { ProcessBucket } from "@/lib/db/enums"

type ProjectStatus = ProcessBucket

interface ProjectStatusBadgeProps {
  status: ProjectStatus | string
  className?: string
}

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  [ProcessBucket.Andamento]:
    "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
  [ProcessBucket.Acompanhamento]:
    "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
  [ProcessBucket.Finalizado]:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
}

const KNOWN_STATUS_SET: ReadonlySet<string> = new Set(
  Object.values(ProcessBucket),
)

/** Narrows an arbitrary status string to a known portal bucket. */
function isKnownStatus(status: string): status is ProjectStatus {
  return KNOWN_STATUS_SET.has(status)
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
  const isKnown = isKnownStatus(status)

  const label = isKnown ? t(`portal.status.${status}`) : status
  const variantClass = isKnown
    ? STATUS_CLASSES[status]
    : "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200"

  return (
    <Badge className={cn("text-xs font-medium border", variantClass, className)}>
      {label}
    </Badge>
  )
}
