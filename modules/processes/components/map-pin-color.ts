import { ProcessStatus } from "@/lib/db/enums"

/** Neutral gray used for archived and unknown statuses. */
const NEUTRAL_GRAY = "#6b7280"

const STATUS_PIN_COLOR: Record<ProcessStatus, string> = {
  [ProcessStatus.Andamento]: "#2563eb", // blue
  [ProcessStatus.Acompanhamento]: "#d97706", // amber
  [ProcessStatus.Finalizado]: "#16a34a", // green
  [ProcessStatus.Arquivado]: NEUTRAL_GRAY,
}

/**
 * Maps a process status to the hex color used for its map pin. Mirrors the
 * blue / amber / emerald palette of `project-status-badge.tsx`. Unknown or
 * garbage values fall back to a neutral gray.
 */
export function statusPinColor(status: ProcessStatus): string {
  return STATUS_PIN_COLOR[status] ?? NEUTRAL_GRAY
}
